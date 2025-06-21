<?php
session_start();
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'notifications' => []]);
  exit;
}

$userId = $_SESSION['user_id'];

$stmt = $conn->prepare("
  SELECT n.*, u.username, u.profile_picture_url, p.media_url
  FROM notification n
  JOIN user u ON n.actor_user_id = u.user_id
  LEFT JOIN post p ON n.post_id = p.post_id
  WHERE n.recipient_user_id = ?
  ORDER BY n.notification_id DESC
  LIMIT 20
");

$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
while ($row = $result->fetch_assoc()) {
  $notifications[] = $row;
}

echo json_encode(['success' => true, 'notifications' => $notifications]);

$stmt->close();
$conn->close();
?>
