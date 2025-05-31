<?php
session_start();
require_once 'db_connection.php';

$errors = [];
$success = "";

function clean_input($data) {
  return htmlspecialchars(stripslashes(trim($data)));
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $email = clean_input($_POST['email']);
  $username = clean_input($_POST['username']);
  $password = $_POST['password'];
  $confirm_password = $_POST['confirm_password'];

  // Validate input
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = "Invalid email format.";
  }
  if (strlen($username) < 3) {
    $errors[] = "Username must be at least 3 characters.";
  }
  if ($password !== $confirm_password) {
    $errors[] = "Passwords do not match.";
  }
  if (!preg_match('/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/', $password)) {
    $errors[] = "Password must be at least 8 characters and include an uppercase
       letter, lowercase letter, and number.";
  }

  if (empty($errors)) {
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // Check if email/username already exists
    $stmt = $conn->prepare("SELECT user_id FROM user 
        WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
      $errors[] = "Email or username already taken.";
    } else {
      $stmt = $conn->prepare("INSERT INTO user (email, username, password)
          VALUES (?, ?, ?)");
      $stmt->bind_param("sss", $email, $username, $password_hash);

      if ($stmt->execute()) {
        $user_id = $stmt->insert_id;

        // Generate verification token
        $verify_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 day'));

        $stmt_ver = $conn->prepare("INSERT INTO email_verification (user_id,
            verify_token, expires_at) VALUES (?, ?, ?)");
        $stmt_ver->bind_param("iss", $user_id, $verify_token, $expires_at);
        $stmt_ver->execute();

        // Send email
        $verify_link = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/verify.php?token=" . $verify_token;
        $subject = "Verify Your Email";
        $message = "Hello $username,\n\nPlease click the link below to verify 
            your email:\n$verify_link\n\nIf you did not register, 
            ignore this email.";
        $headers = "From: no-reply@" . $_SERVER['HTTP_HOST'];

        if (mail($email, $subject, $message, $headers)) {
          $success = "Registration successful! Please check your email to 
              verify your account.";
        } else {
          $errors[] = "Failed to send verification email.";
        }
      } else {
        $errors[] = "Registration error: " . $stmt->error;
      }
      $stmt->close();
    }
    $conn->close();
  }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Register</title>
  <link rel="stylesheet" href="../style/register.css"/>

</head>
<body>
  <div class="wrapper">
    <div class="left">
      <h1>Register</h1>
      <p>Connect, Share, Explore.</p>
      <img src="../assets/register_image.png" alt="Illustration" />
    </div>

    <div class="right">
      <div class="form-box">

        <?php if ($errors): ?>
          <div class="message error">
            <?php foreach ($errors as $error) {
              echo htmlspecialchars($error) . "<br>";
            } ?>
          </div>
        <?php endif; ?>

        <?php if ($success): ?>
          <div class="message success">
              <?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>

        <?php if (!$success): ?>
        <form id="registerForm"
            onsubmit="return validateForm()" 
            method="post" action="">
          <input
              type="email" id="email" placeholder="Email"
              value="<?php echo isset($email)
                  ? htmlspecialchars($email) : ''; ?>" required />
          <input type="text" id="username" placeholder="Username" 
              value="<?php echo isset($username) 
                  ? htmlspecialchars($username) : ''; ?>" required />

          <div class="password-wrapper">
            <input
              type="password"
              id="password"
              placeholder="Password"
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              title="Must contain at least 8 characters, one uppercase,
                  one lowercase, and one number." required/>

            <button type="button" class="toggle-password" 
                onclick="toggleVisibility('password', this)">Show
              </button>
          </div>

          <div class="password-wrapper">
            <input
              type="password"
              id="confirm_password"
              placeholder="Confirm Password"
              required
            />
            <button type="button" class="toggle-password" 
                onclick="toggleVisibility('confirm_password', this)">Show
              </button>
          </div>

          <button type="submit">Register</button>

          <p class="login-link">
            Already have an account?
            <a href="./login.php">Log in here</a>
          </p>
        </form>
        <?php endif; ?>
      </div>
    </div>
  </div>
  
  <script src="../script/register.js"></script>
</body>
</html>
