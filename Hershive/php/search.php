<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

try {
    if (!isset($_SESSION['username']) || !isset($_SESSION['user_id'])) {
        throw new Exception("Not logged in");
    }

    $user_id = (int)$_SESSION['user_id'];
    $q = trim($_GET['q'] ?? '');
    if ($q === '') throw new Exception("Empty query");

    $escapedQ = $conn->real_escape_string($q);

    // Exact match - exclude deleted accounts
    $exactMatch = $conn->query("SELECT * FROM user WHERE username = '$escapedQ' AND deleted_account = 0");
    if ($exactMatch && $exactMatch->num_rows === 1) {
        $user = $exactMatch->fetch_assoc();

        $user['posts_count'] = getCount($conn, "SELECT COUNT(*) FROM post WHERE user_id = {$user['user_id']} AND deleted = 0");
        $user['followers_count'] = getCount($conn, "SELECT COUNT(*) FROM follow WHERE following_id = {$user['user_id']}");
        $user['following_count'] = getCount($conn, "SELECT COUNT(*) FROM follow WHERE follower_id = {$user['user_id']}");

        $posts = fetchPostsByUserId($user['user_id'], $user_id, $conn);

        echo json_encode([
            "success" => true,
            "type" => "exact_user",
            "user" => $user,
            "posts" => $posts
        ]);
        exit;
    }

    $likeQ = "%" . $escapedQ . "%";

    // User matches - exclude deleted
    $userMatches = $conn->query("
        SELECT * FROM user
        WHERE deleted_account = 0 AND (
            username LIKE '$likeQ' OR first_name LIKE '$likeQ' OR last_name LIKE '$likeQ'
        )
        ORDER BY first_name
        LIMIT 5
    ");

    $users = [];
    if ($userMatches && $userMatches->num_rows > 0) {
        while ($user = $userMatches->fetch_assoc()) {
            $user['followers_count'] = getCount($conn, "SELECT COUNT(*) FROM follow WHERE following_id = {$user['user_id']}");
            $user['following_count'] = getCount($conn, "SELECT COUNT(*) FROM follow WHERE follower_id = {$user['user_id']}");
            $users[] = $user;
        }
    }

    // Post matches - exclude deleted posts and deleted users
    $posts = [];
    $searchPostQuery = $conn->prepare("
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
        JOIN user sharer ON p.user_id = sharer.user_id AND sharer.deleted_account = 0
        LEFT JOIN heart_react hr ON p.post_id = hr.post_id AND hr.user_id = ?
        LEFT JOIN share s ON s.post_wrapper_id = p.post_id
        LEFT JOIN post original ON s.post_id = original.post_id
        LEFT JOIN user original_user ON original.user_id = original_user.user_id
        WHERE p.content LIKE ? AND p.deleted = 0
        ORDER BY p.created_at DESC
        LIMIT 10
    ");
    $searchPostQuery->bind_param("is", $user_id, $likeQ);
    $searchPostQuery->execute();
    $result = $searchPostQuery->get_result();

    while ($row = $result->fetch_assoc()) {
        $postUserId = $row['sharer_id'];
        $visibility = $row['visibility'];
        $shouldShow = false;

        if ($visibility === 'public' || $postUserId == $user_id) {
            $shouldShow = true;
        } elseif ($visibility === 'followers') {
            $follow = $conn->prepare("SELECT 1 FROM follow WHERE follower_id = ? AND following_id = ? LIMIT 1");
            $follow->bind_param("ii", $user_id, $postUserId);
            $follow->execute();
            $follow->store_result();
            $shouldShow = $follow->num_rows > 0;
            $follow->close();
        }

        if (!$shouldShow) continue;

        $row['formatted_time'] = date("M j \a\\t g:i A", strtotime($row['created_at']));

        // Media type detection
        if (!empty($row['original_media_url'])) {
            $ext = strtolower(pathinfo($row['original_media_url'], PATHINFO_EXTENSION));
            $row['original_media_type'] = in_array($ext, ['mp4','webm','mov']) ? 'video' : 'image';
        }

        if (!empty($row['media_url'])) {
            $ext = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
            $row['media_type'] = in_array($ext, ['mp4','webm','mov']) ? 'video' : 'image';
        }

        // Shared post formatting
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
        "type" => "user_post_mix",
        "users" => $users,
        "posts" => $posts
    ]);

} catch (Throwable $e) {
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}

// === helper functions ===
function getCount($conn, $sql) {
  $res = $conn->query($sql);
  if ($res) {
      $row = $res->fetch_row();
      return (int)($row[0] ?? 0);
  }
  return 0;
}

function fetchPostsByUserId($target_user_id, $viewer_user_id, $conn) {
    $posts = [];

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
        JOIN user sharer ON p.user_id = sharer.user_id AND sharer.deleted_account = 0
        LEFT JOIN heart_react hr ON p.post_id = hr.post_id AND hr.user_id = ?
        LEFT JOIN share s ON s.post_wrapper_id = p.post_id
        LEFT JOIN post original ON s.post_id = original.post_id
        LEFT JOIN user original_user ON original.user_id = original_user.user_id
        WHERE p.user_id = ? AND p.deleted = 0
        ORDER BY p.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $viewer_user_id, $target_user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    while ($row = $res->fetch_assoc()) {
        $postUserId = $row['sharer_id'];
        $visibility = $row['visibility'];
        $shouldShow = false;

        if ($visibility === 'public' || $postUserId == $viewer_user_id) {
            $shouldShow = true;
        } elseif ($visibility === 'followers') {
            $follow = $conn->prepare("SELECT 1 FROM follow WHERE follower_id = ? AND following_id = ? LIMIT 1");
            $follow->bind_param("ii", $viewer_user_id, $postUserId);
            $follow->execute();
            $follow->store_result();
            $shouldShow = $follow->num_rows > 0;
            $follow->close();
        }

        if (!$shouldShow) continue;

        $row['formatted_time'] = date("M j \a\\t g:i A", strtotime($row['created_at']));

        if (!empty($row['original_media_url'])) {
            $ext = strtolower(pathinfo($row['original_media_url'], PATHINFO_EXTENSION));
            $row['original_media_type'] = in_array($ext, ['mp4','webm','mov']) ? 'video' : 'image';
        }

        if (!empty($row['media_url'])) {
            $ext = strtolower(pathinfo($row['media_url'], PATHINFO_EXTENSION));
            $row['media_type'] = in_array($ext, ['mp4','webm','mov']) ? 'video' : 'image';
        }

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

    return $posts;
}
?>