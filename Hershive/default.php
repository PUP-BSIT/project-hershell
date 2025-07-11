<?php
session_start();

if (isset($_SESSION['username'])) {
  header("Location: project-hershell/Hershive/html/home.html");
  exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Hershive</title>
  <link rel="stylesheet" href="project-hershell/Hershive/style/homepage.css"/>
  <link rel="icon" href="/project-hershell/Hershive/assets/logo.png"/>
</head>

<body>
  <div class="bg-particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>

  <div class="hive-pattern">
    <div class="hexagon hex1"></div>
    <div class="hexagon hex2"></div>
    <div class="hexagon hex3"></div>
    <div class="hexagon hex4"></div>
    <div class="hexagon hex5"></div>
    <div class="hexagon hex6"></div>
    <div class="hexagon hex7"></div>
    <div class="hexagon hex8"></div>
  </div>

  <div class="bee-swarm">
    <div class="bee bee1">🐝</div>
    <div class="bee bee2">🐝</div>
    <div class="bee bee3">🐝</div>
  </div>

  <header>
    <img src="project-hershell/Hershive/assets/logo.png" class="logo" alt="Hershive Logo"/>
    <div class="auth-buttons">
      <a href="project-hershell/Hershive/html/login.html" class="login-button">Log In</a>
      <a href="project-hershell/Hershive/php/register.php" class="register-button">Register</a>
    </div>
  </header>

  <main>
    <div class="left-content">
      <h1>HERSHIVE</h1>
      <p>
        Hershive is a dynamic social media project built to foster
        connection, creativity, and community across diverse voices.
        It's designed as a collaborative space for sharing ideas, stories,
        and experiences, where everyone is encouraged to take part,
        express themselves, and support others. Whether you're here to
        inspire or be inspired, Hershive offers a positive and inclusive
        environment where creativity and conversation thrive.
      </p>
    </div>

    <div class="right-content">
      <div class="image-container">
        <img src="project-hershell/Hershive/assets/homepage_image.png" alt="Hershive Community"/>
      </div>
    </div>
  </main>

  <footer>
    <p>©2025 Hershive. All Rights Reserved.</p>
    <a href="mailto:hershell.dit@gmail.com">hershell.dit@gmail.com</a>
  </footer>

  <script src="project-hershell/Hershive/js/homepage.js"></script>
</body>

</html>