<?php
session_start();
require_once 'db_connection.php';

$userId = $_SESSION['user_id'] ?? 0;
if (!$userId) {
    echo json_encode(['error' => 'User not logged in']);
    exit;
}

// Get post count
$postStmt = $conn->prepare("SELECT COUNT(*)
    FROM post WHERE user_id = ? AND (deleted = 0 OR deleted IS NULL)");
$postStmt->bind_param("i", $userId);
$postStmt->execute();
$postStmt->bind_result($postCount);
$postStmt->fetch();
$postStmt->close();

// Get followers count
$followerStmt = $conn->prepare("SELECT COUNT(*) 
    FROM follow WHERE following_id = ?");
$followerStmt->bind_param("i", $userId);
$followerStmt->execute();
$followerStmt->bind_result($followerCount);
$followerStmt->fetch();
$followerStmt->close();

// Get following count
$followingStmt = $conn->prepare("SELECT COUNT(*)
    FROM follow WHERE follower_id = ?");
$followingStmt->bind_param("i", $userId);
$followingStmt->execute();
$followingStmt->bind_result($followingCount);
$followingStmt->fetch();
$followingStmt->close();

echo json_encode([
    'posts' => $postCount,
    'followers' => $followerCount,
    'following' => $followingCount
]);
?>
