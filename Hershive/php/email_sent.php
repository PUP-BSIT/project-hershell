<?php
$email = isset($_GET['email']) ? htmlspecialchars($_GET['email']) : 'your email';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Sent</title>
  <link rel="stylesheet" href="../style/email_sent.css"/>
  <link rel="icon" href="../assets/logo.png"/>
</head>
<body>
  <div class="overlay">
    <div class="modal">
      <button class="close-btn" onclick="window.location.href='login.php'">×</button>

      <div class="modal-content">
        <div class="icon"><img src="../assets/email_icon.png" alt="Email Icon"></div>
        <h2>Email Sent</h2>

        <p class="message">
          We have sent you an email at <strong><?= $email ?></strong>.
        </p>

        <p class="link-text">Did not receive the email?
          <a href="forgot_password.php">Resend Email</a>
        </p>

        <p class="link-text">Wrong email address?
          <a href="forgot_password.php">Change Email Address</a>
        </p>
      </div>
    </div>
  </div>
  <script src="../script/email_sent.js"></script>
</body>
</html>
