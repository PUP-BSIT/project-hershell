<?php
require 'db_connection.php';

$message = '';
$step = 'start';
$resend = isset($_POST['resend']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    switch (true) {
        case empty($email):
            $step = 'empty';
            $message = 'Please enter your email address.';
            break;

        case !($stmt = $conn->prepare("SELECT user_id, first_name FROM user WHERE email = ?")) ||
             !$stmt->bind_param("s", $email) ||
             !$stmt->execute() ||
             !($result = $stmt->get_result()) ||
             $result->num_rows === 0:
            $step = 'no_user';
            $message = 'No account found with that email.';
            break;

        case (
            $user = $result->fetch_assoc()
        ) &&
        ($stmt = $conn->prepare("SELECT COUNT(*) as reset_count FROM password_reset_tokens WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 HOUR")) &&
        $stmt->bind_param("i", $user['user_id']) &&
        $stmt->execute() &&
        ($row = $stmt->get_result()->fetch_assoc()) &&
        $row['reset_count'] >= 3 && !$resend:
            $step = 'rate_limited';

            $stmt = $conn->prepare("SELECT MIN(created_at) as oldest FROM password_reset_tokens WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 HOUR");
            $stmt->bind_param("i", $user['user_id']);
            $stmt->execute();
            $oldestTime = $stmt->get_result()->fetch_assoc()['oldest'];
            $resetWindowEnd = strtotime($oldestTime) + 3600;
            $now = time();
            $remaining = max(0, $resetWindowEnd - $now);

            if ($remaining > 0) {
                $minutes = floor($remaining / 60);
                $seconds = $remaining % 60;
                $formattedTime = sprintf("%02d:%02d", $minutes, $seconds);
                $message = "Too many reset attempts. Try again in $formattedTime.";
            } else {
                $message = "You have exceeded the password reset limit. Please try again later.";
            }
            break;

        default:
            $token = '';
            $expires_at = '';
            $created_at = date('Y-m-d H:i:s');

            // Try to reuse existing token
            $stmt = $conn->prepare("
                SELECT token, expires_at 
                FROM password_reset_tokens 
                WHERE user_id = ? AND is_used = 0 AND created_at >= NOW() - INTERVAL 1 HOUR 
                ORDER BY created_at DESC LIMIT 1
            ");
            $stmt->bind_param("i", $user['user_id']);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($row = $result->fetch_assoc()) {
                $token = $row['token'];
                $expires_at = $row['expires_at'];
            } else {
                $token = bin2hex(random_bytes(32));
                $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));

                $stmt = $conn->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("isss", $user['user_id'], $token, $expires_at, $created_at);
                if (!$stmt->execute()) {
                    $step = 'store_error';
                    $message = 'Failed to generate reset token.';
                    break;
                }
            }

            $reset_link = "https://hershive.com/project-hershell/Hershive/php/create_new_password.php?token=$token";
            $subject = "Password Reset Request";

            $headers = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: no-reply@hershive.com\r\n";
            $headers .= "Reply-To: support@hershive.com\r\n";

            $firstName = !empty($user['first_name']) ? htmlspecialchars($user['first_name']) : '';
            $greeting = $firstName ? "Hello $firstName" : "Hello";

            $body = '
            <!DOCTYPE html>
            <html>
              <body style="margin: 0; padding: 0; background-color: #f8f5ea; font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                  <div style="text-align: center; padding-bottom: 20px;">
                    <img src="https://hershive.com/project-hershell/Hershive/assets/logo.png" alt="Hershive Logo" width="80" style="margin-bottom: 10px;">
                    <h2 style="margin: 0; color: #333;">Password Reset</h2>
                  </div>

                  <p style="font-size: 15px; color: #333;">' . $greeting . ',</p>
                  <p style="font-size: 15px; color: #333;">
                    You requested a password reset for your Hershive account.
                    Click the button below to create a new password:
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="' . $reset_link . '" style="
                        background-color: #000000;
                        color: #ffffff;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: bold;
                        display: inline-block;
                        font-size: 16px;">
                      Reset Password
                    </a>
                  </div>

                  <p style="font-size: 13px; color: #777;">
                    Or copy and paste this link in your browser:<br>
                    <a href="' . $reset_link . '" style="color: #3366cc; word-break: break-word;">' . $reset_link . '</a>
                  </p>

                  <p style="font-size: 13px; color: #999; margin-top: 40px;">
                    This link will expire in 1 hour. If you didn’t request this, you can safely ignore this email.
                  </p>
                </div>
              </body>
            </html>';

            if (!mail($email, $subject, $body, $headers)) {
                error_log("Failed to send reset email to: $email");
                $step = 'email_error';
                $message = 'Unable to send reset email. Please try again later.';
                break;
            }

            header("Location: email_sent.php?email=" . urlencode($email));
            exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Forgot Password</title>
  <link rel="stylesheet" href="../style/forgot_password.css"/>
  <link rel="icon" href="../assets/logo.png" />
</head>
<body>
  <div class="container">
    <h1>Forgot Password</h1>
    <p class="subtitle">
      Enter the email you used to register. We will send a link to reset your password.
    </p>

    <div class="form-box">
      <?php if (!empty($message)): ?>
        <p style="color:red;" id="server-message"><?= htmlspecialchars($message) ?></p>
      <?php endif; ?>

      <form method="POST" id="reset-form">
        <label for="email">Email Address</label>
        <div class="input-group">
          <span class="icon"><img src="../assets/person_icon.png" alt=""></span>
          <input type="email" id="email" name="email" placeholder="Enter your email" required value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" />
        </div>
        <button type="submit" name="submit">Send Reset Link</button>

        <?php if (!empty($_POST['email']) && $step === 'rate_limited'): ?>
          <div style="margin-top: 20px;">
            <p style="color: #555;">Didn't get the email?</p>
            <button type="submit" name="resend" style="background: #555; color: white; padding: 8px 16px; border-radius: 5px; border: none;">Resend Link</button>
          </div>
        <?php endif; ?>
      </form>

      <p class="login-link">
        Remember Password?
        <a href="login.php">Log In here</a>
      </p>
    </div>
  </div>
</body>
</html>
