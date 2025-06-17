<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Sanitize text content with allowed tags and trim whitespace
function sanitize_input($input, $allow_html = false) {
    if ($allow_html) {
        $sanitized = strip_tags($input, '<b><i><u><strong><em><br><p>');
        // Remove HTML tags temporarily to check if content is only whitespace
        $text_only = strip_tags($sanitized);
        $trimmed = trim($text_only);

        // If after removing HTML tags and trimming, nothing remains, return empty string
        if (empty($trimmed)) {
            return '';
        }

        return $sanitized;
    } else {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
}

$content = isset($_POST['content']) ? sanitize_input($_POST['content'], true) : null;
$media_url = null;
$media_type = null;

// Handle media upload
if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../uploads/';

    // Create uploads directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $mediaName = basename($_FILES['media']['name']);
    $mediaTmp = $_FILES['media']['tmp_name'];
    $targetFile = $uploadDir . time() . '_' . $mediaName;

    // Detect media type from file extension
    $ext = strtolower(pathinfo($mediaName, PATHINFO_EXTENSION));
    $imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $videoTypes = ['mp4', 'webm', 'mov', 'avi'];

    if (in_array($ext, $imageTypes)) {
        $media_type = 'image';
    } elseif (in_array($ext, $videoTypes)) {
        $media_type = 'video';
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid file type. Only images and videos are allowed.']);
        exit;
    }

    // Validate file size (10MB limit)
    if ($_FILES['media']['size'] > 10 * 1024 * 1024) {
        echo json_encode(['success' => false, 'error' => 'File size too large. Maximum 10MB allowed.']);
        exit;
    }

    if (move_uploaded_file($mediaTmp, $targetFile)) {
        $media_url = $targetFile;
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to upload media']);
        exit;
    }
}

// Check if content is empty or whitespace-only after sanitization
$has_content = !empty($content);
$has_media = !empty($media_url);

// Allow posts with only media (no text required), but reject whitespace-only posts
if (!$has_content && !$has_media) {
    echo json_encode(['success' => false, 'error' => 'Post must contain either text or media']);
    exit;
}

// If content is empty (whitespace-only), set it to null for database
if (!$has_content) {
    $content = null;
}

$stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url, visibility) VALUES (?, ?, ?, 'public')");
$stmt->bind_param("iss", $user_id, $content, $media_url);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'post_id' => $stmt->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => 'Database insert failed']);
}

$stmt->close();
$conn->close();
?>