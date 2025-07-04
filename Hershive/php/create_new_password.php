<?php
require 'db_connection.php';
$message = '';
$showForm = false;

if (!isset($_GET['token'])) {
    $message = "We were unable to locate your password reset link.";
} else {
    $token = $_GET['token'];

    // Check token validity
    $stmt = $conn->prepare("
        SELECT user_id, expires_at, is_used 
        FROM password_reset_tokens 
        WHERE token = ?
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows === 1) {
        $row = $result->fetch_assoc();
        $user_id = $row['user_id'];
        $expire_date = $row['expires_at'];
        $is_used = $row['is_used'];

        if ($is_used) {
            $message = "This password reset link has already been used.";
        } elseif (strtotime($expire_date) > time()) {
            $showForm = true;

            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $new_password = $_POST['new_password'] ?? '';
                $confirm_password = $_POST['confirm_password'] ?? '';

                if ($new_password === $confirm_password && strlen($new_password) >= 8) {
                    $hashed = password_hash($new_password, PASSWORD_DEFAULT);

                    // Update user's password
                    $update = $conn->prepare("UPDATE user SET password = ? WHERE user_id = ?");
                    $update->bind_param("si", $hashed, $user_id);
                    $update->execute();

                    // Mark token as used
                    $markUsed = $conn->prepare("
                        UPDATE password_reset_tokens 
                        SET is_used = 1, used_at = NOW() 
                        WHERE token = ?
                    ");
                    $markUsed->bind_param("s", $token);
                    $markUsed->execute();

                    $message = "Password reset successful! <a href='https://hershive.com/project-hershell/Hershive/html/login.html'>Log in here</a>.";
                    $showForm = false;
                } else {
                    $message = "Passwords must match and be at least 8 characters.";
                }
            }
        } else {
            $message = "This password reset link has expired.";
        }
    } else {
        $message = "Invalid reset token.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Create New Password</title>
  <link rel="stylesheet" href="../style/create_new_password.css">
  <link rel="icon" href="../assets/logo.png"/>
</head>
<body>
  <div class="container">
    <h2>Create New Password</h2>

    <?php if (!empty($message)): ?>
      <div class="message" style="color:<?= $showForm ? 'red' : 'green' ?>"><?= $message ?></div>
    <?php endif; ?>

    <?php if ($showForm): ?>
    <div class="form-box">
      <form method="POST">
        <label>New Password</label>
        <div class="input-group">
          <input type="password"
                name="new_password"
                id="new_password"
                oninput="validatePassword()"
                onblur="hideRules()"
                required />
          <button type="button"
                  id="toggle_new_pass"
                  onclick="togglePassword('new_password', 'toggle_new_pass')">Show
          </button>
        </div>

        <ul id="rules" class="rules">
          <li id="length" class="invalid">Minimum 8 characters</li>
          <li id="number" class="invalid">At least one number</li>
          <li id="uppercase" class="invalid">At least one uppercase letter</li>
          <li id="lowercase" class="invalid">At least one lowercase letter</li>
        </ul>

        <label>Confirm Password</label>
        <div class="input-group">
          <input type="password" name="confirm_password" id="confirm_password" required />
          <button type="button"
                  id="toggle_confirm_pass"
                  onclick="togglePassword('confirm_password', 'toggle_confirm_pass')">Show
          </button>
        </div>

        <button id="reset_btn" type="submit" disabled>Reset Password</button>
      </form>
    </div>
    <?php endif; ?>
  </div>

  <script src="../script/create_new_password.js"></script>
</body>
</html>
