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

$input = json_decode(file_get_contents('php://input'), true);
$post_id = $input['post_id'] ?? null;

if (!$post_id) {
    echo json_encode(["success" => false, "error" => "Post ID is required"]);
    exit;
}

$stmt = $conn->prepare("SELECT user_id FROM post WHERE post_id = ?");
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
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
    $stmt->close();
    $conn->close();
    exit;
}

$stmt = $conn->prepare("UPDATE post SET deleted=1, updated_at=NOW() WHERE post_id = ?");
$stmt->bind_param("i", $post_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(["success" => true, "message" => "Post marked as deleted"]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to update post"]);
}

$stmt->close();
$conn->close();
?>