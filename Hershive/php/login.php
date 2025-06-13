<?php
session_set_cookie_params([
    'lifetime' => 0,
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();
require_once 'db_connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username_or_email = '';
    $password = '';
    
    if ($input) {
        $username_or_email = trim($input['username'] ?? $input['username_or_email'] ?? '');
        $password = $input['password'] ?? '';
    } else {
        $username_or_email = trim($_POST['username_or_email'] ?? $_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
    }
    
    if (empty($username_or_email) || empty($password)) {
        echo json_encode([
            "success" => false, 
            "status" => "error",
            "error" => "Missing credentials.",
            "message" => "Please fill in all fields"
        ]);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("SELECT `user_id`, `username`, `email`, `password`, `deleted_account` FROM `user` WHERE (`username` = ? OR `email` = ?)");
        $stmt->bind_param("ss", $username_or_email, $username_or_email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows === 1) {
            $user = $result->fetch_assoc();
            
            if (isset($user['deleted_account']) && $user['deleted_account'] == 1) {
                echo json_encode([
                    "success" => false,
                    "status" => "error", 
                    "error" => "This account has been deleted and cannot be accessed. Please contact support if you believe this is an error.",
                    "message" => "This account has been deleted and cannot be accessed. Please contact support if you believe this is an error."
                ]);
                exit;
            }
            
            if (password_verify($password, $user['password'])) {
                $_SESSION['username'] = $user['username'];
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['email'] = $user['email'];
                
                $redirect = $_SESSION['redirect_after_login'] ?? 'home.php';
                unset($_SESSION['redirect_after_login']);
                
                echo json_encode([
                    "success" => true,
                    "status" => "success",
                    "message" => "Login successful",
                    "redirect" => $redirect
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "status" => "error",
                    "error" => "Invalid username/email or password",
                    "message" => "Invalid username/email or password"
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "status" => "error",
                "error" => "Invalid username/email or password",
                "message" => "Invalid username/email or password"
            ]);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "status" => "error",
            "error" => "Server error: " . $e->getMessage(),
            "message" => "Server error: " . $e->getMessage()
        ]);
    }
}

$conn->close();
?>