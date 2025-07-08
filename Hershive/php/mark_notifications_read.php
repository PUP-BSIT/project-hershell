<?php
session_start();
require_once 'db_connection.php';

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
  echo json_encode(['success' => false, 'error' => 'Not authenticated']);
  exit;
}

$stmt = $conn->prepare("UPDATE notification SET read_status = 1 WHERE recipient_user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['success' => true]);