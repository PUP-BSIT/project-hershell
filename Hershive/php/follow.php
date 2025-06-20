<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$currentUserId = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['action']) || !isset($data['username'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
    exit;
}

$action = $data['action'];
$targetUsername = $data['username'];

$userStmt = $conn->prepare("SELECT user_id FROM user WHERE username = ?
    AND deleted_account = 0");
$userStmt->bind_param("s", $targetUsername);
$userStmt->execute();
$result = $userStmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'User not found']);
    exit;
}

$targetUserId = $result->fetch_assoc()['user_id'];
$userStmt->close();

if ($currentUserId === $targetUserId) {
    echo json_encode(['success' => false, 'error' => 'Cannot follow yourself']);
    exit;
}

if ($action === 'follow') {
    $checkStmt = $conn->prepare("SELECT follow_id FROM follow WHERE
        follower_id = ? AND following_id = ?");
    $checkStmt->bind_param("ii", $currentUserId, $targetUserId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'Already following this user']);
        exit;
    }
    $checkStmt->close();

    $followStmt = $conn->prepare("INSERT INTO follow (follower_id, following_id)
        VALUES (?, ?)");
    $followStmt->bind_param("ii", $currentUserId, $targetUserId);

    if ($followStmt->execute()) {
        $followerCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM follow
            WHERE following_id = ?");
        $followerCountStmt->bind_param("i", $targetUserId);
        $followerCountStmt->execute();
        $targetUserFollowers = $followerCountStmt->get_result()->fetch_assoc()['count'];
        $followerCountStmt->close();

        $followingCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM follow
            WHERE follower_id = ?");
        $followingCountStmt->bind_param("i", $currentUserId);
        $followingCountStmt->execute();
        $currentUserFollowing = $followingCountStmt->get_result()->fetch_assoc()['count'];
        $followingCountStmt->close();

        echo json_encode([
            'success' => true,
            'action' => 'followed',
            'target_user_followers' => $targetUserFollowers,
            'current_user_following' => $currentUserFollowing
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to follow user']);
    }
    $followStmt->close();

} elseif ($action === 'unfollow') {
    // Remove follow relationship
    $unfollowStmt = $conn->prepare("DELETE FROM follow WHERE follower_id = ?
        AND following_id = ?");
    $unfollowStmt->bind_param("ii", $currentUserId, $targetUserId);

    if ($unfollowStmt->execute() && $unfollowStmt->affected_rows > 0) {
        // Get updated counts
        $followerCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM follow
            WHERE following_id = ?");
        $followerCountStmt->bind_param("i", $targetUserId);
        $followerCountStmt->execute();
        $targetUserFollowers = $followerCountStmt->get_result()->fetch_assoc()['count'];
        $followerCountStmt->close();

        $followingCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM follow
            WHERE follower_id = ?");
        $followingCountStmt->bind_param("i", $currentUserId);
        $followingCountStmt->execute();
        $currentUserFollowing = $followingCountStmt->get_result()->fetch_assoc()['count'];
        $followingCountStmt->close();

        echo json_encode([
            'success' => true,
            'action' => 'unfollowed',
            'target_user_followers' => $targetUserFollowers,
            'current_user_following' => $currentUserFollowing
        ]);
    } else {
        echo json_encode(['success' => false, 'error' =>
            'Failed to unfollow user or not following']);
    }
    $unfollowStmt->close();

} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

$conn->close();
?>