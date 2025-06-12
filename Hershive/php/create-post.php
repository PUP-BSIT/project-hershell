<?php
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

// Check if user is logged in
if (!isset($_SESSION['username']) || !isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "error" => "Not authenticated"]);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$content = trim($_POST['content'] ?? '');

if (empty($content)) {
    echo json_encode(["success" => false, "error" => "Post content cannot be empty"]);
    exit;
}

$media_url = null;

// Handle file upload if present
if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = '../uploads/';

    // Create upload directory if it doesn't exist
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $file_extension = pathinfo($_FILES['media']['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '.' . $file_extension;
    $upload_path = $upload_dir . $filename;

    // Validate file type
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'];
    if (!in_array(strtolower($file_extension), $allowed_types)) {
        echo json_encode(["success" => false, "error" => "Invalid file type"]);
        exit;
    }

    // Validate file size (10MB max)
    if ($_FILES['media']['size'] > 10 * 1024 * 1024) {
        echo json_encode(["success" => false, "error" => "File too large"]);
        exit;
    }

    if (move_uploaded_file($_FILES['media']['tmp_name'], $upload_path)) {
        $media_url = $upload_path;
    }
}

// Insert post into database using your existing post table structure
$stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url, created_at, visibility) VALUES (?, ?, ?, NOW(), 'public')");
$stmt->bind_param("iss", $user_id, $content, $media_url);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Post created successfully"]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to create post"]);
}

$stmt->close();
$conn->close();
?>