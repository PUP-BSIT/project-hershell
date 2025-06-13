<?php
session_start();
require_once './db_connection.php';

$client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? '';
$redirect_uri = $_GET['redirect_uri'] ?? $_POST['redirect_uri'] ?? '';
$error = '';

// Allow/Deny logic
if (isset($_POST['allow'])) {
    $user_id = $_SESSION['user_id'];
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $stmt = $conn->prepare("INSERT INTO oauth_tokens
        (user_id, client_id, token, expires_at) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $user_id, $client_id, $token, $expires_at);
    $stmt->execute();
    header("Location: $redirect_uri&token=$token");
    exit;
}
if (isset($_POST['deny'])) {
    header("Location: $redirect_uri?error=access_denied");
    exit;
}
    
// Login logic
if (!isset($_SESSION['user_id'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' 
            && isset($_POST['email'], $_POST['password'])) {
        $email = $_POST['email'];
        $password = $_POST['password'];
        $stmt = $conn->prepare("SELECT user_id, 
            password FROM user WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->bind_result($user_id, $hashed_password);
        if ($stmt->fetch() && password_verify($password, $hashed_password)) {
            $_SESSION['user_id'] = $user_id;
            header("Location: oauth_authorize.php?client_id=$client_id
                &redirect_uri=" . urlencode($redirect_uri));
            exit;
        } else {
            $error = "Invalid credentials.";
        }
        $stmt->close();
    }
    // Show login form
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Authorize Access</title>
      <link rel="stylesheet" href="../style/oauth_login.css"/>
    </head>
    <body>
      <div class="card-container">
        <div class="auth-card">
          <h2>Sign in using Hershive</h2>
          <p><strong>Log In</strong></p>

          <?php if ($error) echo "<p class='error-message'>$error</p>"; ?>
          <form method="POST" class="auth-form">
            <input type="hidden" name="client_id"
                value="<?= htmlspecialchars($client_id) ?>">
            <input type="hidden" name="redirect_uri"
                value="<?= htmlspecialchars($redirect_uri) ?>">

            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password"
                placeholder="Password" required />

            <div class="button-group">
                <button type="submit" class="btn login">Login</button>
            </div>
            </form>
        </div>
      </div>
    </body>
    </html>
    <?php
    exit;
}

// Consent form
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Authorize Application</title>
    <link rel="stylesheet" href="../style/oauth_concent.css">
</head>
<body>
    <div class="container">
        <h1>Authorize Access</h1>
        <p>The application <strong><?php echo htmlspecialchars(
            $_GET["client_id"]); ?></strong> is requesting
            permission to access your account.</p>

        <form method="post" class="button-group">
            <input type="hidden" name="client_id"
                value="<?= htmlspecialchars($client_id) ?>">
            <input type="hidden" name="redirect_uri"
                value="<?= htmlspecialchars($redirect_uri) ?>">
        
            <button type="submit" name="allow"
                class="btn btn-allow">Allow</button>
            <button type="submit" name="deny" class="btn btn-deny">Deny</button>
        </form>
    </div>
</body>
</html>
