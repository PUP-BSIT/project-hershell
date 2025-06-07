<?php
session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'Not authenticated']);
  exit;
}

$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

switch ($action) {

  case 'add':
    $post_id = $_POST['post_id'];
    $content = $_POST['content'];
    $stmt = $conn->prepare("INSERT INTO comment (user_id, post_id, comment_content, timestamp) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $user_id, $post_id, $content);
    $stmt->execute();
    echo json_encode(['success' => true]);
    break;

  case 'get':
    $post_id = $_GET['post_id'];
    $stmt = $conn->prepare("
      SELECT c.comment_id, c.comment_content, c.timestamp, c.user_id, u.username
      FROM comment c
      JOIN user u ON c.user_id = u.user_id
      WHERE c.post_id = ? AND c.deleted = 0
      ORDER BY c.timestamp ASC
    ");
    $stmt->bind_param("i", $post_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $comments = [];

    while ($row = $result->fetch_assoc()) {
      $row['avatar'] = '../assets/temporary_pfp.png';
      $row['timestamp'] = date('c', strtotime($row['timestamp']));
      $comments[] = $row;
    }

    echo json_encode(['success' => true, 'comments' => $comments]);
    break;

  case 'edit':
    $comment_id = $_POST['comment_id'];
    $content = $_POST['content'];
    $stmt = $conn->prepare("UPDATE comment SET comment_content = ? WHERE comment_id = ? AND user_id = ?");
    $stmt->bind_param("sii", $content, $comment_id, $user_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    break;

  case 'delete':
    $comment_id = $_POST['comment_id'];
    $stmt = $conn->prepare("UPDATE comment SET deleted = 1 WHERE comment_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $comment_id, $user_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    break;

  default:
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
    break;
}
?>