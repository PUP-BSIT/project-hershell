<?php
session_start();
header("Content-Type: application/json");
require_once 'db_connection.php';

if (!isset($_SESSION['username']) || !isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "error" => "Not authenticated"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$post_id = (int)($input['post_id'] ?? 0);
$action = $input['action'] ?? '';
$user_id = $_SESSION['user_id'];

if (!$post_id || !in_array($action, ['like', 'unlike'])) {
    echo json_encode(["success" => false, "error" => "Invalid parameters"]);
    exit;
}

try {
    if ($action === 'like') {
        // Check if user already liked this post
        $check_stmt = $conn->prepare("SELECT heart_react_id FROM heart_react
            WHERE user_id = ? AND post_id = ?");
        $check_stmt->bind_param("ii", $user_id, $post_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows == 0) {
            $stmt = $conn->prepare("INSERT INTO heart_react
                (user_id, post_id, timestamp) VALUES (?, ?, NOW())");
            $stmt->bind_param("ii", $user_id, $post_id);
            $stmt->execute();
            $stmt->close();
        }
        $check_stmt->close();

    } else {
        $stmt = $conn->prepare("DELETE FROM heart_react WHERE
            user_id = ? AND post_id = ?");
        $stmt->bind_param("ii", $user_id, $post_id);
        $stmt->execute();
        $stmt->close();
    }

    echo json_encode(["success" => true]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Database error"]);
}

$conn->close();
?>