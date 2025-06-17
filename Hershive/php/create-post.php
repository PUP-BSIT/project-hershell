<?php
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
$media_url = null;
$media_type = $_POST['media_type'] ?? null;

// ✅ Get and validate visibility
$visibility = in_array($_POST['visibility'], ['public', 'private', 'followers'])
    ? $_POST['visibility']
    : 'public';

// Require at least text or media
if (empty(trim($content)) && empty($_FILES['media']['name'])) {
    echo json_encode(['success' => false, 'error' => 'Post must have text or media']);
    exit;
}

// Handle media upload
if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../uploads/';
    $mediaName = basename($_FILES['media']['name']);
    $mediaTmp = $_FILES['media']['tmp_name'];
    $targetFile = $uploadDir . time() . '_' . $mediaName;

    $allowedTypes = [
        'image' => ['jpg', 'jpeg', 'png', 'gif'],
        'video' => ['mp4', 'webm']
    ];
    $ext = strtolower(pathinfo($mediaName, PATHINFO_EXTENSION));

    if (!in_array($ext, $allowedTypes[$media_type] ?? [])) {
        echo json_encode(['success' => false, 'error' => 'Invalid media type']);
        exit;
    }

    if (!move_uploaded_file($mediaTmp, $targetFile)) {
        echo json_encode(['success' => false, 'error' => 'Failed to upload media']);
        exit;
    }

    $media_url = $targetFile;
}

// Insert post
$stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url, visibility) VALUES (?, ?, ?, ?)");
$stmt->bind_param("isss", $user_id, $content, $media_url, $visibility);

if ($stmt->execute()) {
    ob_clean();
    echo json_encode(['success' => true, 'post_id' => $stmt->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => 'Database insert failed']);
}

$stmt->close();
$conn->close();
?>