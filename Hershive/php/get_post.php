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
$result = $stmt->get_result();
$current_user = $result->fetch_assoc();
$current_user_id = $current_user['user_id'];

$sql = "
    SELECT
        p.post_id,
        p.user_id,
        u.username,
        p.content,
        p.media_url,
        p.created_at,
        p.visibility,
        (SELECT COUNT(*) FROM heart_react hr WHERE hr.post_id = p.post_id)
            as likes_count,
        (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.post_id) as
            comments_count,
        CASE WHEN hr_user.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked
    FROM post p
    JOIN user u ON p.user_id = u.user_id
    LEFT JOIN heart_react hr_user ON p.post_id = hr_user.post_id AND
        hr_user.user_id = ?
    WHERE p.visibility = 'public'
    ORDER BY p.created_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $current_user_id);
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    $row['formatted_time'] = date('M j \a\t g:i A',
        strtotime($row['created_at']));

    if ($row['media_url']) {
        $extension = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
        $row['media_type'] = in_array($extension, ['mp4', 'mov', 'avi', 'webm'])
            ? 'video' : 'image';
    } else {
        $row['media_type'] = null;
    }

    $posts[] = $row;
}

$count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM post WHERE
    visibility = 'public'");
$count_stmt->execute();
$count_result = $count_stmt->get_result();
$total_posts = $count_result->fetch_assoc()['total'];

echo json_encode([
    "success" => true,
    "posts" => $posts,
    "total_posts" => $total_posts
]);

$stmt->close();
$count_stmt->close();
$conn->close();
?>