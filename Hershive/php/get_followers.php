<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

$currentUserId = $_SESSION['user_id'] ?? 0;
if (!$currentUserId) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : $currentUserId;

// Get followers with user details and follow status
$stmt = $conn->prepare("
    SELECT
        u.user_id,
        u.username,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.profile_picture_url,
        CASE
            WHEN u.first_name IS NOT NULL AND u.first_name != '' THEN
                CONCAT(u.first_name,
                    CASE WHEN u.middle_name IS NOT NULL AND u.middle_name != '' THEN CONCAT(' ', u.middle_name) ELSE '' END,
                    CASE WHEN u.last_name IS NOT NULL AND u.last_name != '' THEN CONCAT(' ', u.last_name) ELSE '' END
                )
            ELSE u.username
        END AS display_name,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM follow
                WHERE follower_id = ? AND following_id = u.user_id
            ) THEN 1
            ELSE 0
        END AS is_following
    FROM follow f
    JOIN user u ON f.follower_id = u.user_id
    WHERE f.following_id = ?
    ORDER BY f.timestamp DESC
");

$stmt->bind_param("ii", $currentUserId, $targetUserId);
$stmt->execute();
$result = $stmt->get_result();

$followers = [];
while ($row = $result->fetch_assoc()) {
    $followers[] = $row;
}

echo json_encode([
    'success' => true,
    'followers' => $followers,
    'count' => count($followers)
]);

$conn->close();
?>