<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');
ob_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Sanitize text input
function sanitize_input($input, $allow_html = false) {
    if ($allow_html) {
        $clean = strip_tags($input, '<b><i><u><strong><em><br><p>');
        $clean = preg_replace('/(<\w+\s*)style="[^"]*"/i', '$1', $clean);
        return $clean;
    }
    return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
}

$content = isset($_POST['content']) ? sanitize_input($_POST['content'], true) : '';
$media_type = $_POST['media_type'] ?? null;
$visibility = in_array($_POST['visibility'], ['public', 'private', 'followers'])
    ? $_POST['visibility']
    : 'public';

$clients = isset($_POST['share_to']) ? explode(',', $_POST['share_to']) : [];
$share_post_id = $_POST['shared_post_id'] ?? null;

$isExternalOnlyShare = !empty($clients) && $share_post_id && empty(trim($content)) && empty($_FILES['media']['name']);

if (!$isExternalOnlyShare && empty(trim($content)) && empty($_FILES['media']['name'])) {
    echo json_encode(['success' => false, 'error' => 'Post must have text, media, or shared post']);
    exit;
}

// Handle media
$uploadDir = __DIR__ . '/../uploads/';
$media_url = null;

if (!empty($_FILES['media']['name'])) {
    $mediaName = basename($_FILES['media']['name']);
    $mediaTmp = $_FILES['media']['tmp_name'];
    $newFileName = time() . '_' . $mediaName;
    $targetFile = $uploadDir . $newFileName;

    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    if (!is_writable($uploadDir)) {
        echo json_encode(['success' => false, 'error' => 'Upload folder is not writable']);
        exit;
    }

    if (!move_uploaded_file($mediaTmp, $targetFile)) {
        echo json_encode(['success' => false, 'error' => 'Failed to upload media']);
        exit;
    }

    $media_url = 'https://hershive.com/project-hershell/Hershive/uploads/' . $newFileName;
}

// ========== Internal Post ========== //
$post_id = null;

if (!$isExternalOnlyShare) {
    $stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url, visibility) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $user_id, $content, $media_url, $visibility);

    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'error' => 'Database insert failed']);
        exit;
    }

    $post_id = $stmt->insert_id;
    $stmt->close();
}

// ========== External Share ========== //
$result = [];

if (!empty($clients) && $share_post_id) {
    $share_post_id = intval($share_post_id);

    // Fetch original post data
    $stmt = $conn->prepare("SELECT content, media_url FROM post WHERE post_id = ?");
    $stmt->bind_param("i", $share_post_id);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($shared_content, $shared_media_url);

    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Original post not found']);
        exit;
    }
    $stmt->close();

    $endpoints = [
        'heybleepi' => "https://heybleepi.site/PROJECT-CLUB-404/heybleepi/codes/php/receive-post.php",
        'devhive'   => "https://devhivespace.com/api/posts/share-receive.php",
        'hershive'  => "https://hershive.com/project-hershell/Hershive/php/receive-post.php"
    ];

    foreach ($clients as $client) {
        $user_token = $_SESSION['oauth_token_' . $client] ?? '';
        $isAllowed = $_SESSION['isAllowed'] ?? '';

        if (!$user_token) {
            $result[$client] = ['status' => 'error', 'message' => "No session token for $client"];
            continue;
        }

        if ($isAllowed !== 'allowed_to_share') {
            $result[$client] = ['status' => 'error', 'message' => "Not allowed to share to $client"];
            continue;
        }

        $payload = [
            'user_id' => $user_id,
            'shared_post_id' => $share_post_id,
            'content' => $content,
            'shared_content' => $shared_content,
            'media_url' => $shared_media_url,
            'token' => $user_token,
            'client' => $client,
            'provider' => 'hershive'
        ];

        if (!isset($endpoints[$client])) {
            $result[$client] = ['status' => 'error', 'message' => 'Invalid endpoint'];
            continue;
        }

        $ch = curl_init($endpoints[$client]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $user_token
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $result[$client] = ['status' => 'success', 'response' => $response];
        } else {
            $result[$client] = [
                'status' => 'error',
                'http_code' => $httpCode,
                'response' => $response
            ];
        }
    }
}

// ========== Final Response ========== //
if (ob_get_length()) ob_clean();
$response = ['success' => true, 'post_id' => $post_id];
if (!empty($result)) $response['shared_to'] = $result;

$is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest';

if ($is_ajax) {
  echo json_encode($response);
} else {
  header("Location: /project-hershell/Hershive/html/home.html");
}

$conn->close();
exit;
?>