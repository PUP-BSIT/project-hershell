<?php
session_start();
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'Not authenticated']);
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
$stmt->close();

$countStmt = $conn->prepare("
  SELECT COUNT(*) as unread_count
  FROM notification
  WHERE recipient_user_id = ? AND read_status = 0
");
$countStmt->bind_param("i", $userId);
$countStmt->execute();
$countResult = $countStmt->get_result();
$unreadCount = $countResult->fetch_assoc()['unread_count'] ?? 0;
$countStmt->close();

$conn->close();

echo json_encode([
  'success' => true,
  'notifications' => $notifications,
  'unread_count' => $unreadCount
]);
