<?php
require 'db_connection.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';

    if (empty($email)) {
        $message = 'Please enter your email address.';
    } else {
        // Check if email exists
        $stmt = $conn->prepare("SELECT user_id FROM user WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $message = 'No account found with that email.';
        } else {
            $user = $result->fetch_assoc();
            $user_id = $user['user_id'];

            // Generate token
            $token = bin2hex(random_bytes(32));
            $expire = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Insert or update token
            $stmt = $conn->prepare("
                INSERT INTO oauth_token (user_id, platform, access_token, expire_date)
                VALUES (?, 'reset_password', ?, ?)
                ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), expire_date = VALUES(expire_date)
            ");
            $stmt->bind_param("iss", $user_id, $token, $expire);

            if ($stmt->execute()) {
                // Build reset link
                $reset_link = "https://hershive.com/php/create_new_password.php?token=$token";

                // Compose email
                $subject = "Password Reset Request";
                $headers = "From: no-reply@hershive.com\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

                $body = "
                <html>
                <head>
                    <title>Password Reset</title>
                </head>
                <body>
                    <p>Hello,</p>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <p><a href='$reset_link'>$reset_link</a></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                </body>
                </html>
                ";

                // Send email
                if (mail($email, $subject, $body, $headers)) {
                    // Redirect to confirmation page with email address
                    header("Location: email_sent.php?email=" . urlencode($email));
                    exit;
                } else {
                    $message = 'Failed to send the reset email. Please try again later.';
                }
            } else {
                $message = 'Failed to generate token. Please try again.';
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Forgot Password</title>
  <link rel="stylesheet" href="../style/forgot_password.css" />
</head>

<body>
  <div class="container">
    <h1>Forgot Password</h1>

    <p class="subtitle">
      Enter the email address you used to create an account,
      and we will email you instructions to reset your password.
    </p>
    
    <div class="form-box">
      <?php if (!empty($message)): ?>
        <p style="color:red;"><?= htmlspecialchars($message) ?></p>
      <?php endif; ?>

      <form method="POST" action="">
        <label for="email">Email Address</label>

        <div class="input-group">
          <span class="icon"><img src="../assets/person_icon.png" alt="Person Icon"></span>
          <input type="email" id="email" name="email" placeholder="example@example.com" required />
        </div>

        <button type="submit">Send Reset Link</button>
      </form>

      <p class="login-link">
        Remember Password?
        <a href="../html/login.html">Log In here</a>
      </p>
    </div>
  </div>
</body>
</html>
