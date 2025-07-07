<?php
session_start();
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'User not logged in']);
  exit;
}

$actorId = $_SESSION['user_id'];

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

$type = $data['type'] ?? '';
$postId = $data['post_id'] ?? null;
$message = $data['message'] ?? '';

if (!$type || !$postId || !$message) {
  echo json_encode(['success' => false, 'error' => 'Missing required fields']);
  exit;
}

if ($type !== 'follow') {
  $stmt = $conn->prepare("SELECT user_id FROM post WHERE post_id = ?");
  $stmt->bind_param("i", $postId);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($row = $result->fetch_assoc()) {
    $recipientId = $row['user_id'];
  } else {
    echo json_encode(['success' => false, 'error' => 'Post owner not found']);
    exit;
  }
  $stmt->close();
}

$followId = null;
$commentId = null;
$heartReactId = null;
$shareId = null;

switch ($type) {
  case 'like':
    $stmt = $conn->prepare("SELECT heart_react_id FROM heart_react WHERE post_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $postId, $actorId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
      $heartReactId = $row['heart_react_id'];
    }
    $stmt->close();
    break;

  case 'comment':
    $stmt = $conn->prepare("SELECT comment_id FROM comment WHERE post_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $postId, $actorId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
      $commentId = $row['comment_id'];
    }
    $stmt->close();
    break;

  case 'share':
    $stmt = $conn->prepare("SELECT share_id FROM share WHERE post_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $postId, $actorId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
      $shareId = $row['share_id'];
    }
    $stmt->close();
    break;

  case 'follow':
    $stmt = $conn->prepare("SELECT follow_id FROM follow WHERE following_id = ? AND follower_id = ?");
    $stmt->bind_param("ii", $postId, $actorId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
      $followId = $row['follow_id'];
      $recipientId = $postId;
    }
    $stmt->close();
    $postId = null;
    break;
}

if (!isset($recipientId)) {
  echo json_encode(['success' => false, 'error' => 'Recipient ID not resolved']);
  exit;
}

$stmt = $conn->prepare("INSERT INTO notification (
  recipient_user_id, actor_user_id, follow_id, post_id,
  comment_id, heart_react_id, share_id, message
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

$stmt->bind_param(
  "iiiiiiis",
  $recipientId,
  $actorId,
  $followId,
  $postId,
  $commentId,
  $heartReactId,
  $shareId,
  $message
);

if ($stmt->execute()) {
  echo json_encode(['success' => true]);
} else {
  echo json_encode(['success' => false, 'error' => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
