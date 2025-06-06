<?php
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

if (!isset($_SESSION['username'])) {
    echo json_encode(["success" => false, "error" => "Not authenticated"]);
    exit;
}

$current_username = $_SESSION['username'];

$stmt = $conn->prepare("SELECT user_id FROM user WHERE username = ?");
$stmt->bind_param("s", $current_username);
$stmt->execute();
$current_user_id = $stmt->get_result()->fetch_assoc()['user_id'];

$sql = "
    SELECT
        p.post_id,
        p.user_id AS sharer_id,
        sharer.username AS sharer_username,
        p.content,
        p.media_url,
        p.created_at,
        p.is_shared,
        (SELECT COUNT(*) FROM heart_react hr WHERE hr.post_id = p.post_id)
            as likes_count,
        (SELECT COUNT(*) FROM comment WHERE post_id = p.post_id) as
            comments_count,
        (SELECT COUNT(*) FROM share WHERE post_id = p.post_id) as shares_count,
        CASE WHEN hr_user.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,

        -- If shared, fetch original post info
        original.post_id AS original_post_id,
        original_user.username AS original_author,
        original.content AS original_content,
        original.media_url AS original_media_url

    FROM post p
    JOIN user u ON p.user_id = u.user_id
    LEFT JOIN heart_react hr_user ON p.post_id = hr_user.post_id AND
        hr_user.user_id = ?
    LEFT JOIN share s ON s.post_wrapper_id = p.post_id
    LEFT JOIN post original ON s.post_id = original.post_id
    LEFT JOIN user original_user ON original.user_id = original_user.user_id
    WHERE p.deleted = 0 AND p.visibility = 'public'
    ORDER BY p.created_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $current_user_id);
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    $row['formatted_time'] = date(
        'M j \a\t g:i A',
        strtotime($row['created_at'])
    );

    if (!empty($row['original_media_url'])) {
        $ext = strtolower(pathinfo($row['original_media_url'], PATHINFO_EXTENSION));
        $row['original_media_type'] = in_array($ext, ['mp4', 'mov', 'avi', 'webm']) ? 'video' : 'image';
    }

    if ($row['media_url']) {
        $extension = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
        $row['media_type'] = in_array($extension, ['mp4', 'mov', 'avi', 'webm'])
            ? 'video' : 'image';
    } else {
        $row['media_type'] = null;
    }

    if ($row['is_shared']) {
        $row['shared'] = true;

        $row['original_post'] = [
            'post_id' => $row['original_post_id'],
            'username' => $row['original_author'],
            'content' => $row['original_content'],
            'media_url' => $row['original_media_url'],
        ];
    } else {
        $row['shared'] = false;
    }

    // Clean up flat original_ fields
    unset(
        $row['original_post_id'],
        $row['original_author'],
        $row['original_content'],
        $row['original_media_url'],
    );

    $posts[] = $row;
}

echo json_encode([
    "success" => true,
    "posts" => $posts,
]);

$stmt->close();
$conn->close();
