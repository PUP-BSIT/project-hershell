<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$currentUserId = $_SESSION['user_id'];

if (!isset($_GET['usernames']) || empty($_GET['usernames'])) {
    echo json_encode(['success' => false, 'error' => 'No usernames provided']);
    exit;
}

$usernames = explode(',', $_GET['usernames']);
$followStatus = [];

foreach ($usernames as $username) {
    $username = trim($username);
    if (empty($username)) continue;

    // Get user ID for username
    $userStmt = $conn->prepare("SELECT user_id FROM user WHERE username = ?
        AND deleted_account = 0");
    $userStmt->bind_param("s", $username);
    $userStmt->execute();
    $result = $userStmt->get_result();

    if ($result->num_rows === 0) {
        $followStatus[$username] = false;
        continue;
    }

    $targetUserId = $result->fetch_assoc()['user_id'];
    $userStmt->close();

    // Check if current user follows this target user
    $followStmt = $conn->prepare("SELECT follow_id FROM follow
        WHERE follower_id = ? AND following_id = ?");
    $followStmt->bind_param("ii", $currentUserId, $targetUserId);
    $followStmt->execute();
    $followResult = $followStmt->get_result();

    $followStatus[$username] = $followResult->num_rows > 0;
    $followStmt->close();
}

echo json_encode(['success' => true, 'follow_status' => $followStatus]);
$conn->close();
?>