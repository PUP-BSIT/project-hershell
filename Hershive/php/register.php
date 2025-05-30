<?php
session_start();
require_once 'db_connection.php';

$message = "";

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $email = trim($_POST['email']);
  $username = trim($_POST['username']);
  $password = $_POST['password'];
  $confirm = $_POST['confirm_password'];

  if ($password !== $confirm) {
    $message = "Passwords do not match.";
  } else {
    // Check if email already exists
    $stmt = $conn->prepare("SELECT user_id FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $message = "Email already registered.";
    } else {
      $stmt->close();

      $hashed_password = password_hash($password, PASSWORD_DEFAULT);
      $stmt = $conn->prepare("INSERT INTO user 
          (username, email, password) VALUES (?, ?, ?)");
      $stmt->bind_param("sss", $username, $email, $hashed_password);

      if ($stmt->execute()) {
        $_SESSION['username'] = $username;
        header("Location: welcome.php");
        exit;
      } else {
        $message = "Registration failed: " . $stmt->error;
      }
    }
    $stmt->close();
  }
  $conn->close();
}
?>