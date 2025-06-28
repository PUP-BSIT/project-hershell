<?php
session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'get') {
    $post_id = $_GET['post_id'] ?? '';
   
    if (empty($post_id)) {
        echo json_encode(['success' => false, 'error' => 'Post ID is required']);
        exit;
    }
   
    $stmt = $conn->prepare("
        SELECT c.comment_id, c.comment_content, c.timestamp, c.user_id, u.username, u.profile_picture_url
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
        $row['timestamp'] = date('Y-m-d H:i:s', strtotime($row['timestamp']));
        $comments[] = $row;
    }

    echo json_encode(['success' => true, 'comments' => $comments]);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in to perform this action.']);
    exit;
}

$user_id = $_SESSION['user_id'];

switch ($action) {
    case 'add':
        $post_id = $_POST['post_id'] ?? '';
        $content = $_POST['content'] ?? '';
       
        if (empty($post_id) || empty($content)) {
            echo json_encode(['success' => false, 'error' => 'Post ID and content are required']);
            exit;
        }
       
        $stmt = $conn->prepare("INSERT INTO comment (user_id, post_id, comment_content, timestamp) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param("iis", $user_id, $post_id, $content);
       
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to add comment']);
        }
        break;
       
    case 'edit':
        $comment_id = $_POST['comment_id'] ?? '';
        $content = $_POST['content'] ?? '';
       
        if (empty($comment_id) || empty($content)) {
            echo json_encode(['success' => false, 'error' => 'Comment ID and content are required']);
            exit;
        }
       
        $stmt = $conn->prepare("UPDATE comment SET comment_content = ? WHERE comment_id = ? AND user_id = ? AND deleted = 0");
        $stmt->bind_param("sii", $content, $comment_id, $user_id);
       
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Comment not found or you do not have permission to edit this comment']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to update comment']);
        }
        break;
       
    case 'delete':
        $comment_id = $_POST['comment_id'] ?? '';
       
        if (empty($comment_id)) {
            echo json_encode(['success' => false, 'error' => 'Comment ID is required']);
            exit;
        }
       
        $stmt = $conn->prepare("UPDATE comment SET deleted = 1 WHERE comment_id = ? AND user_id = ? AND deleted = 0");
        $stmt->bind_param("ii", $comment_id, $user_id);
       
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Comment not found or you do not have permission to delete this comment']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to delete comment']);
        }
        break;
       
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}
?>