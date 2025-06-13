<?php
session_start();

// Check if user is already logged in
if (isset($_SESSION['username'])) {
  // User is logged in, redirect to home page
  header("Location: html/home.html");
  exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hershive</title>
  <link rel="stylesheet" href="style/homepage.css" />
</head>

<body>
  <div class="container">
    <header>
      <img src="assets/logo.png" class="logo" />
      <div class="auth-buttons">
        <a href="html/login.html" class="login-button">Log In</a>
        <a href="php/register.php" class="register-button">Register</a>
      </div>
    </header>

    <main>
      <div class="left-content">
        <h1>HERSHIVE</h1>
        <p>
          Hershive is a dynamic social media project built to foster
          connection, creativity, and community across diverse voices.
          It’s designed as a collaborative space for sharing ideas, stories,
          and experiences, where everyone is encouraged to take part,
          express themselves, and support others. Whether you're here to
          inspire or be inspired, Hershive offers a positive and inclusive
          environment where creativity and conversation thrive.
        </p>
      </div>

      <div class="right-content">
        <img src="assets/homepage_image.png" />
      </div>
    </main>

    <footer>
      <p>©2025 Hershive. All Rights Reserve.</p>
      <a href="mailto:support@hershive.com">support@hershive.com</a>
    </footer>
  </div>
  <script src="script/homepage.js"></script>
</body>

</html>