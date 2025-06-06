<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

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
$stmt->close();

$filter_user_id = null;
$filtering = false;

if (isset($_GET['user_id']) && is_numeric($_GET['user_id'])) {
	$filter_user_id = (int) $_GET['user_id'];

	// Validate user exists
	$check_stmt = $conn->prepare("SELECT 1 FROM user WHERE user_id = ?");
	$check_stmt->bind_param("i", $filter_user_id);
	$check_stmt->execute();
	$check_result = $check_stmt->get_result();
	if ($check_result->num_rows === 0) {
		echo json_encode(["success" => false, "error" => "User not found"]);
		exit;
	}
	$check_stmt->close();

	$filtering = true;
}

if ($filtering) {
	// For profile page – get only user’s posts or shared posts
	$sql = "
		SELECT 
			p.post_id,
			p.user_id AS sharer_id,
			sharer.username AS sharer_username,
			p.content,
			p.media_url,
			p.created_at,
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
		WHERE p.deleted = 0 AND p.visibility = 'public'
				AND (
					(p.is_shared = 0 AND p.user_id = ?) OR
					(p.is_shared = 1 AND s.user_id = ?)
				)
		ORDER BY p.created_at DESC
	";
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("iii", $current_user_id, $filter_user_id, $filter_user_id);
} else {
	// For home page – fetch all public posts
	$sql = "
		SELECT 
			p.post_id,
			p.user_id AS sharer_id,
			sharer.username AS sharer_username,
			p.content,
			p.media_url,
			p.created_at,
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
		WHERE p.deleted = 0 AND p.visibility = 'public'
		ORDER BY p.created_at DESC
	";
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("i", $current_user_id);
}

$stmt->execute();
$result = $stmt->get_result();

$posts = [];

while ($row = $result->fetch_assoc()) {
	$row['formatted_time'] = date('M j \a\t g:i A', strtotime($row['created_at']));

	if (!empty($row['original_media_url'])) {
		$ext = strtolower(pathinfo($row['original_media_url'], PATHINFO_EXTENSION));
		$row['original_media_type'] = in_array($ext, ['mp4', 'mov', 'avi', 'webm']) ? 'video' : 'image';
	}

	if (!empty($row['media_url'])) {
		$ext = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
		$row['media_type'] = in_array($ext, ['mp4', 'mov', 'avi', 'webm']) ? 'video' : 'image';
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
			$row['shar	ed'] = false;
	}

	unset(
		$row['original_post_id'],
		$row['original_author'],
		$row['original_content'],
		$row['original_media_url']
	);

	$posts[] = $row;
}

echo json_encode([
    'success' => true,
    'posts' => $posts
]);

$stmt->close();
$conn->close();