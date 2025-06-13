<?php
session_start();
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'User not logged in']);
  exit;
}

$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT username, profile_picture_url
    FROM user WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $row = $result->fetch_assoc()) {
  echo json_encode([
    'success' => true,
    'username' => $row['username'],
    'profile_picture_url' => $row['profile_picture_url'] ??
        '../assets/temporary_pfp.png'
  ]);
} else {
  echo json_encode(['success' => false, 'error' => 'User not found']);
}
?>