<?php
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "error" => "Not authenticated"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

$post_id = $_POST['post_id'] ?? null;
$content = trim($_POST['content'] ?? '');

if (!$post_id) {
    echo json_encode(["success" => false, "error" => "Post ID is required"]);
    exit;
}
if (!$content) {
    echo json_encode(["success" => false, "error" => "Post content cannot be empty"]);
    exit;
}

$stmt = $conn->prepare("SELECT user_id, media_url FROM post WHERE post_id = ?");
$stmt->bind_param("i", $post_id);
$stmt->execute();
$result = $stmt->get_result();
$post = $result->fetch_assoc();

if (!$post) {
    echo json_encode(["success" => false, "error" => "Post not found"]);
    $stmt->close();
    $conn->close();
    exit;
}

if ($post['user_id'] != $_SESSION['user_id']) {
    echo json_encode(["success" => false, "error" => "Unauthorized to edit this post"]);
    $stmt->close();
    $conn->close();
    exit;
}

$media_url = null;

if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = '../uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $file_extension = strtolower(pathinfo($_FILES['media']['name'], PATHINFO_EXTENSION));
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'];
    if (!in_array($file_extension, $allowed_types)) {
        echo json_encode(["success" => false, "error" => "Invalid file type"]);
        $stmt->close();
        $conn->close();
        exit;
    }

    if ($_FILES['media']['size'] > 10 * 1024 * 1024) { // 10MB max
        echo json_encode(["success" => false, "error" => "File too large"]);
        $stmt->close();
        $conn->close();
        exit;
    }

    $filename = uniqid() . '.' . $file_extension;
    $upload_path = $upload_dir . $filename;

    if (move_uploaded_file($_FILES['media']['tmp_name'], $upload_path)) {
        $media_url = $upload_path;

        if ($post['media_url'] && file_exists($post['media_url'])) {
            unlink($post['media_url']);
        }
    } else {
        echo json_encode(["success" => false, "error" => "Failed to upload media"]);
        $stmt->close();
        $conn->close();
        exit;
    }
}

if ($media_url) {
    $stmt_update = $conn->prepare("UPDATE post SET content = ?, media_url = ?, updated_at = NOW() WHERE post_id = ? AND user_id = ?");
    $stmt_update->bind_param("ssii", $content, $media_url, $post_id, $_SESSION['user_id']);
} else {
    $stmt_update = $conn->prepare("UPDATE post SET content = ?, updated_at = NOW() WHERE post_id = ? AND user_id = ?");
    $stmt_update->bind_param("sii", $content, $post_id, $_SESSION['user_id']);
}

if ($stmt_update->execute()) {
    echo json_encode(["success" => true, "message" => "Post updated successfully"]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to update post"]);
}

$stmt_update->close();
$stmt->close();
$conn->close();
?>