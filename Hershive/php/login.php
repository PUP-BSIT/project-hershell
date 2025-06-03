<?php
session_set_cookie_params([
  'lifetime' => 0,
  'secure' => true,
  'httponly' => true,
  'samesite' => 'Strict'
]);
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(["success" => false, "error" => "Missing credentials."]);
    exit;
}

$stmt = $conn->prepare("SELECT user_id, password FROM user WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows === 1) {
    $user = $result->fetch_assoc();
    if (password_verify($password, $user['password'])) {
        $_SESSION['username'] = $username;
        $_SESSION['user_id'] = $user['user_id'];

        // Check if redirect is stored
        $redirect = $_SESSION['redirect_after_login'] ?? 'home.php';
        unset($_SESSION['redirect_after_login']);

        echo json_encode(["success" => true, "redirect" => $redirect]);
    } else {
        echo json_encode(["success" => false, "error" => "Incorrect password."]);
    }
} else {
    echo json_encode(["success" => false, "error" => "User not found."]);
}

$conn->close();
?>