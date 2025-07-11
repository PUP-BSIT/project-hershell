<?php
session_start();
require_once './db_connection.php';

$client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? '';
$redirect_uri = $_GET['redirect_uri'] ?? $_POST['redirect_uri'] ?? '';
$error = '';

// Allow/Deny logic
if (isset($_POST['allow'])) {
    $user_id = $_SESSION['user_id'];

    $stmt = $conn->prepare("
        SELECT token 
        FROM oauth_tokens 
        WHERE user_id = ? AND client_id = ? AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->bind_param("is", $user_id, $client_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $token = $row['token'];
    } else {
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
        $stmt = $conn->prepare("INSERT INTO oauth_tokens (user_id, client_id, token, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $user_id, $client_id, $token, $expires_at);
        $stmt->execute();
    }

    header("Location: $redirect_uri&token=$token");
    exit;
}

if (isset($_POST['deny'])) {
    header("Location: $redirect_uri?error=access_denied");
    exit;
}

if (isset($_POST['switch_user'])) {
    session_destroy();
    header("Location: oauth_authorize.php?client_id=$client_id&redirect_uri=" . urlencode($redirect_uri));
    exit;
}

if (!isset($_SESSION['user_id'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['email'], $_POST['password'])) {
        $email = $_POST['email'];
        $password = $_POST['password'];
        $stmt = $conn->prepare("SELECT user_id, password FROM user WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->bind_result($user_id, $hashed_password);
        if ($stmt->fetch() && password_verify($password, $hashed_password)) {
            $_SESSION['user_id'] = $user_id;
            header("Location: oauth_authorize.php?client_id=$client_id&redirect_uri=" . urlencode($redirect_uri));
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
      <link rel="icon" href="../assets/logo.png"/>
    </head>
    <body>
      <div class="card-container">
        <div class="auth-card">
          <h2>Authorize Access</h2>
          <p>The application <strong><?= htmlspecialchars($client_id) ?>
              </strong> is requesting permission to access your account.</p>

          <?php if ($error) echo "<p class='error-message'>$error</p>"; ?>
          <form method="POST" class="auth-form">
            <input type="hidden" name="client_id"
                value="<?= htmlspecialchars($client_id) ?>">
            <input type="hidden" name="redirect_uri"
                value="<?= htmlspecialchars($redirect_uri) ?>">

            <input type="email" name="email" placeholder="Email" required/>
            <div class="password-wrapper">
              <input type="password" name="password"
                    id="password" placeholder="Password" required/>
              <img src="../assets/eye_closed.png"
                    id="togglePassword" class="toggle-password"
                    alt="Show Password"/></div>

            <div class="button-group">
                <button type="submit" class="btn login">Login</button>
            </div>
          </form>
        </div>
      </div>
    <script src="../script/oauth_authorize.js"></script>
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
    <link rel="icon" href="../assets/logo.png">
</head>
<body>
    <div class="container">
        <form method="post" class="switch-form">
            <input type="hidden" name="client_id"
                value="<?= htmlspecialchars($client_id) ?>">
            <input type="hidden" name="redirect_uri"
                value="<?= htmlspecialchars($redirect_uri) ?>">
            <button type="submit" name="switch_user"
                class="btn-top-switch">Login with another account</button>
        </form>

        <h1>Authorize Access</h1>
        <p>The application <strong><?= htmlspecialchars($client_id) ?>
            </strong> is requesting permission to access your account.</p>

        <form method="post" class="button-group">
            <input type="hidden" name="client_id"
                value="<?= htmlspecialchars($client_id) ?>">
            <input type="hidden" name="redirect_uri"
                value="<?= htmlspecialchars($redirect_uri) ?>">

            <button type="submit" name="allow" class="btn btn-allow">Allow</button>
            <button type="submit" name="deny" class="btn btn-deny">Deny</button>
        </form>
    </div>
</body>
</html>