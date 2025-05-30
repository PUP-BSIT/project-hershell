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

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Register</title>
  <link rel="stylesheet" href="../style/register.css"/>
</head>
<body>
  <div class="wrapper">
    <div class="left">
      <h1>Register</h1>
      <p>Connect, Share, Explore.</p>
      <img src="../assets/register_image.png" alt="Illustration"/>
    </div>

    <div class="right">
      <div class="form-box">
        <?php if (!empty($message)): ?>
          <p style="color:red;"><?= $message ?></p>
        <?php endif; ?>
        <form method="POST" onsubmit="return validateForm()">
          <input type="email" id="email" placeholder="Email" required />
          <input type="text" id="username" placeholder="Username" required />

          <div class="password-wrapper">
            <input type="password" id="password" placeholder="Password"
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              title="Must contain at least 8 characters, one uppercase,
                  one lowercase, and one number." required />
            <button
                type="button"
                class="toggle-password"
                onclick="toggleVisibility('password', this)">Show
              </button>
          </div>

          <div class="password-wrapper">
            <input 
                type="password"
                id="confirm_password"
                placeholder="Confirm Password" required />
            <button
                type="button"
                class="toggle-password"
                onclick="toggleVisibility('confirm_password', this)">Show
              </button>
          </div>

          <button type="submit">Register</button>
          <p class="login-link">
            Already have an account? <a href="./login.php">Log in here</a>
          </p>
        </form>
      </div>
    </div>
  </div>
  <script src="../script/register.js"></script>
</body>
</html>
