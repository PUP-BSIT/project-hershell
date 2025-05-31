<?php
session_start();
require_once 'db_connection.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        $stmt = $conn->prepare("SELECT user_id, password FROM user WHERE username = ?");
        if ($stmt) {
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result && $result->num_rows === 1) {
                $user = $result->fetch_assoc();
                if (password_verify($password, $user['password'])) {
                    $_SESSION['username'] = $username;
                    header("Location: welcome.php");
                    exit;
                } else {
                    $error = 'Incorrect password.';
                }
            } else {
                $error = 'No user found with that username.';
            }

            $stmt->close();
        } else {
            $error = 'Database error: ' . $conn->error;
        }
    }

    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Login</title>
  <link rel="stylesheet" href="../style/login.css">
</head>
<body>
  <div class="container">
    <div class="left-section">
      <h1>Log in</h1>
      <p>Connect, Share, Explore.</p>
      <img src="../assets/Login_image.png" alt="Login Design Image" class="login-image">
    </div>

    <div class="right-section">
      <h2>Welcome Back!</h2>
      <p>Please enter login details below</p>

      <?php if (!empty($error)): ?>
        <p style="color:red;"><?= htmlspecialchars($error) ?></p>
      <?php endif; ?>

      <form method="POST" action="">
        <label>Username</label>
        <input type="text" name="username" placeholder="username" required>

        <label>Password</label>
        <input type="password" name="password" placeholder="password" required>

        <a href="forgot_password.php" class="forgot-link">Forgot password?</a>

        <button type="submit" class="login-btn">Log in</button>

        <p class="or-text">or Log in with</p>
        <div class="social-icons">
          <img src="../assets/devhive_logo.jpg" alt="Devhive">
          <img src="../assets/heybleepi_logo.png" alt="HeyBleepi">
        </div>

        <p>Don't have an account?
          <a href="register.php">Register here</a>
        </p>
      </form>
    </div>
  </div>
</body>
</html>
