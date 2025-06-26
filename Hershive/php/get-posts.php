<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

$current_user_id = $_SESSION['user_id'] ?? null;
if (!$current_user_id) {
    echo json_encode(["success" => false, "error" => "Not authenticated"]);
    exit;
}

$target_user_id = $_GET['user_id'] ?? null;

$sql = "
SELECT
    p.post_id,
    p.user_id AS sharer_id,
    sharer.username AS sharer_username,
    sharer.profile_picture_url AS sharer_profile_pic,
    p.content,
    p.media_url,
    p.created_at,
    p.visibility,
    p.is_shared,
    (SELECT COUNT(*) FROM heart_react WHERE post_id = p.post_id) as likes_count,
    (SELECT COUNT(*) FROM comment WHERE post_id = p.post_id) as comments_count,
    (SELECT COUNT(*) FROM share WHERE post_id = p.post_id) as shares_count,
    CASE WHEN hr.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,

    original.post_id AS original_post_id,
    original_user.username AS original_author,
    original.content AS original_content,
    original.media_url AS original_media_url

FROM post p
JOIN user sharer ON p.user_id = sharer.user_id
LEFT JOIN heart_react hr ON p.post_id = hr.post_id AND hr.user_id = ?
LEFT JOIN share s ON s.post_wrapper_id = p.post_id
LEFT JOIN post original ON s.post_id = original.post_id
LEFT JOIN user original_user ON original.user_id = original_user.user_id
WHERE p.deleted = 0 AND sharer.deleted_account = 0
";

$params = [$current_user_id];
$types = "i";

if ($target_user_id) {
    $sql .= " AND p.user_id = ?";
    $params[] = $target_user_id;
    $types .= "i";
}

$sql .= " ORDER BY p.created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$posts = [];

while ($row = $result->fetch_assoc()) {
    $postUserId = $row['sharer_id'];
    $visibility = $row['visibility'];
    $shouldShow = false;

    if ($visibility === 'public') {
        $shouldShow = true;
    } elseif ($current_user_id == $postUserId) {
        $shouldShow = true;
    } elseif ($visibility === 'followers') {
        $checkFollow = $conn->prepare("
            SELECT 1 FROM follow
            WHERE follower_id = ? AND following_id = ?
            LIMIT 1
        ");
        $checkFollow->bind_param("ii", $current_user_id, $postUserId);
        $checkFollow->execute();
        $checkFollow->store_result();
        if ($checkFollow->num_rows > 0) {
            $shouldShow = true;
        }
        $checkFollow->close();
    }

    if (!$shouldShow) continue;

    $row['formatted_time'] = date("M j \a\\t g:i A", strtotime($row['created_at']));

    // Detect media types
    if (!empty($row['original_media_url'])) {
        $ext = strtolower(pathinfo($row['original_media_url'], PATHINFO_EXTENSION));
        $row['original_media_type'] = in_array($ext, ['mp4', 'mov', 'avi', 'webm']) ? 'video' : 'image';
    }

    if (!empty($row['media_url'])) {
        $ext = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
        $row['media_type'] = in_array($ext, ['mp4', 'mov', 'avi', 'webm']) ? 'video' : 'image';
    }

    // Handle shared posts
    if ($row['is_shared']) {
        $row['shared'] = true;
        $row['original_post'] = [
            'post_id' => $row['original_post_id'],
            'username' => $row['original_author'],
            'content' => $row['original_content'],
            'media_url' => $row['original_media_url'],
            'media_type' => $row['original_media_type'] ?? null
        ];
    } else {
        $row['shared'] = false;
    }

    unset(
        $row['original_post_id'],
        $row['original_author'],
        $row['original_content'],
        $row['original_media_url'],
        $row['original_media_type']
    );

    $posts[] = $row;
}

echo json_encode([
    "success" => true,
    "posts" => $posts
]);

$stmt->close();
$conn->close();
?>