<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? 0;
if (!$userId) {
    echo json_encode(['error' => 'User not logged in']);
    exit;
}

$targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : $userId;

$postStmt = $conn->prepare("SELECT COUNT(*)
    FROM post WHERE user_id = ? AND (deleted = 0 OR deleted IS NULL)");
$postStmt->bind_param("i", $targetUserId);
$postStmt->execute();
$postStmt->bind_result($postCount);
$postStmt->fetch();
$postStmt->close();

$followerStmt = $conn->prepare("SELECT COUNT(*)
    FROM follow WHERE following_id = ?");
$followerStmt->bind_param("i", $targetUserId);
$followerStmt->execute();
$followerStmt->bind_result($followerCount);
$followerStmt->fetch();
$followerStmt->close();

// Get following count
$followingStmt = $conn->prepare("SELECT COUNT(*)
    FROM follow WHERE follower_id = ?");
$followingStmt->bind_param("i", $targetUserId);
$followingStmt->execute();
$followingStmt->bind_result($followingCount);
$followingStmt->fetch();
$followingStmt->close();

echo json_encode([
    'posts' => $postCount,
    'followers' => $followerCount,
    'following' => $followingCount,
    'user_id' => $targetUserId
]);

$conn->close();
?>