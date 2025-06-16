<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];
$post_id = $_POST['post_id'] ?? null;
$content = $_POST['content'] ?? '';

if (!$post_id) {
    echo json_encode(['success' => false, 'error' => 'Post ID required']);
    exit;
}

// Verify post ownership
$stmt = $conn->prepare("SELECT user_id, media_url FROM post WHERE post_id = ? AND deleted = 0");
$stmt->bind_param("i", $post_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Post not found']);
    exit;
}

$post_data = $result->fetch_assoc();
if ($post_data['user_id'] != $user_id) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$stmt->close();

// Sanitize content and handle whitespace-only input
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

$content = sanitize_input($content, true);
$media_url = $post_data['media_url']; // Keep existing media URL by default

// Handle new media upload
if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../uploads/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $mediaName = basename($_FILES['media']['name']);
    $mediaTmp = $_FILES['media']['tmp_name'];
    $targetFile = $uploadDir . time() . '_' . $mediaName;

    // Validate file type
    $ext = strtolower(pathinfo($mediaName, PATHINFO_EXTENSION));
    $imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $videoTypes = ['mp4', 'webm', 'mov', 'avi'];

    if (!in_array($ext, array_merge($imageTypes, $videoTypes))) {
        echo json_encode(['success' => false, 'error' => 'Invalid file type']);
        exit;
    }

    // Validate file size (10MB limit)
    if ($_FILES['media']['size'] > 10 * 1024 * 1024) {
        echo json_encode(['success' => false, 'error' => 'File size too large. Maximum 10MB allowed.']);
        exit;
    }

    if (move_uploaded_file($mediaTmp, $targetFile)) {
        // Delete old media file if it exists
        if ($media_url && file_exists($media_url)) {
            unlink($media_url);
        }
        $media_url = $targetFile;
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to upload media']);
        exit;
    }
}

// Check if content is empty or whitespace-only after sanitization
$has_content = !empty($content);
$has_media = !empty($media_url);

// Check if post has content or media (reject whitespace-only posts)
if (!$has_content && !$has_media) {
    echo json_encode(['success' => false, 'error' => 'Post must contain either text or media']);
    exit;
}

// If content is empty (whitespace-only), set it to null for database
if (!$has_content) {
    $content = null;
}

// Update post
$stmt = $conn->prepare("UPDATE post SET content = ?, media_url = ?, updated_at = CURRENT_TIMESTAMP WHERE post_id = ?");
$stmt->bind_param("ssi", $content, $media_url, $post_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to update post']);
}

$stmt->close();
$conn->close();
?>