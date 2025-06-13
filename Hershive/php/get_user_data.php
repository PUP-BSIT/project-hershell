<?php
header("Content-Type: application/json");
require_once '../db_connection.php';

$token = $_GET['token'] ?? '';

if (!$token) {
    http_response_code(400);
    echo json_encode(["error_message" => "Missing token"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT user_id 
    FROM oauth_tokens 
    WHERE token = ? AND expires_at > NOW()
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $user_id = $row['user_id'];

        $userStmt = $conn->prepare("
        SELECT username, first_name, middle_name, last_name, email, birthday 
        FROM user 
        WHERE user_id = ?
    ");
    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $userResult = $userStmt->get_result();

    if ($user = $userResult->fetch_assoc()) {
        echo json_encode($user);
    } else {
        http_response_code(404);
        echo json_encode(["error_message" => "User not found"]);
    }
} else {
    http_response_code(401);
    echo json_encode(["error_message" => "Invalid or expired token"]);
}
?>