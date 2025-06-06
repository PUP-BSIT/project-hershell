<?php
session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'Not logged in']);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$originalPostId = $data['post_id'] ?? null;
$content = trim($data['content'] ?? '');

if (!$originalPostId) {
  echo json_encode(['success' => false, 'error' => 'Missing post_id']);
  exit;
}

$userId = $_SESSION['user_id'];

// Insert into `post` table
$stmt = $conn->prepare("INSERT INTO post (user_id, content, is_shared) VALUES (?, ?, 1)");
$stmt->bind_param("is", $userId, $content);
$stmt->execute();

if ($stmt->affected_rows <= 0) {
  echo json_encode(['success' => false, 'error' => 'Failed to create post wrapper']);
  exit;
}

$sharedPostId = $stmt->insert_id;
$stmt->close();

// Insert into `share` table
$stmt = $conn->prepare("INSERT INTO share (user_id, post_id, post_wrapper_id) VALUES (?, ?, ?)");
$stmt->bind_param("iii", $userId, $originalPostId, $sharedPostId);
$stmt->execute();

if ($stmt->affected_rows > 0) {
  echo json_encode(['success' => true]);
} else {
  echo json_encode(['success' => false, 'error' => 'Failed to insert into share']);
}

$stmt->close();
$conn->close();
