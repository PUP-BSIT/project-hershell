<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Sanitize text content with allowed tags
function sanitize_input($input, $allow_html = false) {
    if ($allow_html) {
        return strip_tags($input, '<b><i><u><strong><em><br><p>');
    } else {
        return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    }
}

$content = isset($_POST['content']) ? sanitize_input($_POST['content'],
    true) : null;
$media_url = null;
$media_type = isset($_POST['media_type']) ? $_POST['media_type'] : null;

if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../uploads/';
    $mediaName = basename($_FILES['media']['name']);
    $mediaTmp = $_FILES['media']['tmp_name'];
    $targetFile = $uploadDir . time() . '_' . $mediaName;

    $allowedTypes = ['image' => ['jpg', 'jpeg', 'png', 'gif'], 'video' =>
        ['mp4', 'webm']];
    $ext = strtolower(pathinfo($mediaName, PATHINFO_EXTENSION));

    if (!in_array($ext, $allowedTypes[$media_type] ?? [])) {
        echo json_encode(['success' => false, 'error' => 'Invalid media type']);
        exit;
    }

    if (move_uploaded_file($mediaTmp, $targetFile)) {
        $media_url = $targetFile;
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to upload media']);
        exit;
    }
}

$stmt = $conn->prepare("INSERT INTO
    post (user_id, content, media_url, visibility) VALUES (?, ?, ?, 'public')");
$stmt->bind_param("iss", $user_id, $content, $media_url);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'post_id' => $stmt->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => 'Database insert failed']);
}

$stmt->close();
$conn->close();
?>