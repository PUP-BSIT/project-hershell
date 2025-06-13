<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db_connection.php';
session_start();
header('Content-Type: application/json');

try {
    if (!isset($_SESSION['username']) || !isset($_SESSION['user_id'])) {
        throw new Exception("Not logged in");
    }

    $user_id = (int)$_SESSION['user_id'];
    $q = trim($_GET['q'] ?? '');
    if ($q === '') {
        throw new Exception("Empty query");
    }

    $escapedQ = $conn->real_escape_string($q);

    $exactMatch = $conn->query("SELECT * FROM user WHERE username = '$escapedQ'");
    if ($exactMatch && $exactMatch->num_rows === 1) {
        $user = $exactMatch->fetch_assoc();

        $postsRes = $conn->query("SELECT COUNT(*) AS total FROM post
            WHERE user_id = {$user['user_id']} AND deleted = 0");
        $followerRes = $conn->query("SELECT COUNT(*) AS total FROM follow
            WHERE following_id = {$user['user_id']}");
        $followingRes = $conn->query("SELECT COUNT(*) AS total FROM follow
            WHERE follower_id = {$user['user_id']}");

        $user['posts_count'] = $postsRes->fetch_assoc()['total'] ?? 0;
        $user['followers_count'] = $followerRes->fetch_assoc()['total'] ?? 0;
        $user['following_count'] = $followingRes->fetch_assoc()['total'] ?? 0;

        $posts = [];
        $postQuery = $conn->query("
            SELECT post.*, user.username
            FROM post
            JOIN user ON post.user_id = user.user_id
            WHERE post.user_id = {$user['user_id']} AND deleted = 0
            ORDER BY post.created_at DESC
        ");
        while ($post = $postQuery->fetch_assoc()) {
            $post['sharer_username'] = $post['username'];
            $post['shared'] = false;
            $posts[] = enrichPost($post, $conn, $user_id);
        }

        echo json_encode([
            "success" => true,
            "type" => "exact_user",
            "user" => $user,
            "posts" => $posts
        ]);
        exit;
    }

    $likeQ = "%" . $escapedQ . "%";
    $userMatches = $conn->query("
        SELECT * FROM user
        WHERE username LIKE '$likeQ' OR first_name LIKE '$likeQ'
            OR last_name LIKE '$likeQ'
        ORDER BY first_name
        LIMIT 5
    ");

    if ($userMatches && $userMatches->num_rows > 0) {
        $users = [];

        while ($user = $userMatches->fetch_assoc()) {
            $postsRes = $conn->query("SELECT COUNT(*) AS total FROM post
                WHERE user_id = {$user['user_id']} AND deleted = 0");
            $followerRes = $conn->query("SELECT COUNT(*) AS total FROM follow
                WHERE following_id = {$user['user_id']}");
            $followingRes = $conn->query("SELECT COUNT(*) AS total FROM follow
                WHERE follower_id = {$user['user_id']}");

            $user['posts_count'] = $postsRes->fetch_assoc()['total'] ?? 0;
            $user['followers_count'] = $followerRes->fetch_assoc()['total'] ?? 0;
            $user['following_count'] = $followingRes->fetch_assoc()['total'] ?? 0;

            $users[] = $user;
        }
    }

    $postMatches = $conn->query("
        SELECT post.*, user.username
        FROM post
        JOIN user ON post.user_id = user.user_id
        WHERE post.content LIKE '$likeQ' AND post.deleted = 0
        ORDER BY post.created_at DESC
        LIMIT 10
    ");

    $posts = [];
    while ($post = $postMatches->fetch_assoc()) {
        $post['sharer_username'] = $post['username'];
        $post['shared'] = false;
        $posts[] = enrichPost($post, $conn, $user_id);
    }

    echo json_encode([
        "success" => true,
        "type" => "user_post_mix",
        "users" => $users ?? [],
        "posts" => $posts
    ]);

} catch (Throwable $e) {
    echo json_encode([
        "success" => false,
        "error" => "Server error: " . $e->getMessage()
    ]);
    exit;
}

function enrichPost($post, $conn, $current_user_id) {
    $post_id = (int)$post['post_id'];

    // Reaction counts
    $likes = $conn->query("SELECT COUNT(*) AS total FROM heart_react
        WHERE post_id = $post_id");
    $comments = $conn->query("SELECT COUNT(*) AS total FROM comment
        WHERE post_id = $post_id");
    $shares = $conn->query("SELECT COUNT(*) AS total FROM share
        WHERE post_id = $post_id");
    $liked = $conn->query("SELECT 1 FROM heart_react WHERE post_id = $post_id
        AND user_id = $current_user_id");

    $post['likes_count'] = $likes->fetch_assoc()['total'] ?? 0;
    $post['comments_count'] = $comments->fetch_assoc()['total'] ?? 0;
    $post['shares_count'] = $shares->fetch_assoc()['total'] ?? 0;
    $post['user_liked'] = ($liked && $liked->num_rows > 0);

    $post['formatted_time'] = date("M j \\a\\t g:iA",
        strtotime($post['created_at'] ?? $post['shared_time']
        ?? date('Y-m-d H:i:s')));

    $shareQuery = $conn->query("
        SELECT s.timestamp AS shared_time, u.username AS sharer_username
        FROM share s
        JOIN user u ON s.user_id = u.user_id
        WHERE s.post_id = $post_id
        ORDER BY s.timestamp DESC
        LIMIT 1
    ");

    if ($shareQuery && $shareQuery->num_rows > 0) {
        $shareInfo = $shareQuery->fetch_assoc();

        $post['shared'] = true;
        $post['shared_time'] = $shareInfo['shared_time'];
        $post['sharer_username'] = $shareInfo['sharer_username'];
        $post['formatted_time'] = date("M j \\a\\t g:iA",
            strtotime($shareInfo['shared_time']));

        $post['original_post'] = [
            'username' => $post['username'],
            'content' => $post['content'],
            'media_url' => $post['media_url'],
            'media_type' => $post['media_url'] ?
                (strpos($post['media_url'], '.mp4') !== false ?
                'video' : 'image') : null
        ];

        $post['content'] = null;
        $post['media_url'] = null;
        $post['media_type'] = null;
    } else {
        $post['shared'] = false;
        $post['sharer_username'] = $post['username'];
        $post['original_post'] = null;
        $post['media_type'] = $post['media_url'] ?
            (strpos($post['media_url'], '.mp4') !== false ?
            'video' : 'image') : null;
    }

    return $post;
}
?>