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
      <div class="modal-content">
        <div class="header-row">
          <div class="icon">
            <img src="../assets/email_icon.png" alt="Email Icon" />
          </div>
          <div class="text-block">
            <h2>Email Sent</h2>
            <p class="subtitle">
              We have sent you an email at <strong><?= $email ?></strong>.<br />
            </p>
          </div>
        </div>
        <p class="link-text">
          Did not receive the email? <a href="forgot_password.php">Resend Email</a>
        </p>
        <p class="link-text">
          Wrong email address? <a href="forgot_password.php">Change Email Address</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
