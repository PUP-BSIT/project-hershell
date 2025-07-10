<?php
session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$inputPostId = $data['post_id'] ?? null;
$content = trim($data['content'] ?? '');

if (!$inputPostId) {
    echo json_encode(['success' => false, 'error' => 'Missing post_id']);
    exit;
}

$userId = $_SESSION['user_id'];

// Check if the input post is a shared post
$stmt = $conn->prepare("SELECT is_shared FROM post WHERE post_id = ?");
$stmt->bind_param("i", $inputPostId);
$stmt->execute();
$stmt->bind_result($isShared);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'error' => 'Post not found']);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

$sourcePostId = $inputPostId;

if ($isShared == 1) {
    // Look for the source post ID in the share table
    $stmt = $conn->prepare("SELECT source_post_id FROM share WHERE post_wrapper_id = ?");
    $stmt->bind_param("i", $inputPostId);
    $stmt->execute();
    $stmt->bind_result($realSourcePostId);
    if ($stmt->fetch()) {
        $sourcePostId = $realSourcePostId;
    } else {
        echo json_encode(['success' => false, 'error' => 'Source post not found in share table']);
        $stmt->close();
        $conn->close();
        exit;
    }
    $stmt->close();
}

// Insert the shared post into the post table
$stmt = $conn->prepare("INSERT INTO post (user_id, content, is_shared) VALUES (?, ?, 1)");
$stmt->bind_param("is", $userId, $content);
$stmt->execute();

if ($stmt->affected_rows <= 0) {
    echo json_encode(['success' => false, 'error' => 'Failed to create post wrapper']);
    $stmt->close();
    $conn->close();
    exit;
}

$sharedPostId = $stmt->insert_id;
$stmt->close();

// Insert into share table
$stmt = $conn->prepare("INSERT INTO share (user_id, source_post_id, post_id, post_wrapper_id) VALUES (?, ?, ?, ?)");
$stmt->bind_param("iiii", $userId, $sourcePostId, $inputPostId, $sharedPostId);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode([
        'success' => true,
        'post_id' => $sharedPostId
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to insert into share']);
}

$stmt->close();
$conn->close();
