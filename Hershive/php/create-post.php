<?php
session_start();
require_once 'db_connection.php';

header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {
  echo json_encode(["success" => false, "error" => "User not authenticated"]);
  exit;
}

$user_id = $_SESSION['user_id'];
$content = $_POST['content'] ?? '';
$visibility = $_POST['visibility'] ?? 'public';

$media_url = null;

// Handle media upload
if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
  $fileTmpPath = $_FILES['media']['tmp_name'];
  $fileName = uniqid() . '_' . $_FILES['media']['name'];
  $uploadDir = '../uploads/';
  $destPath = $uploadDir . $fileName;

  if (move_uploaded_file($fileTmpPath, $destPath)) {
    $media_url = $destPath;
  } else {
    echo json_encode(["success" => false, "error" => "Failed to move uploaded file."]);
    exit;
  }
}

// Insert the post
$stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url, visibility) VALUES (?, ?, ?, ?)");
$stmt->bind_param("isss", $user_id, $content, $media_url, $visibility);

if ($stmt->execute()) {
  echo json_encode(["success" => true]);
} else {
  echo json_encode(["success" => false, "error" => "Database insert failed"]);
}

$stmt->close();
$conn->close();
