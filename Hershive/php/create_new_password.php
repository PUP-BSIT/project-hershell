<?php
require 'db_connection.php';

$message = '';
$showForm = false;

// Guard clause: Check if token exists
if (!isset($_GET['token'])) {
    $message = "We were unable to locate your password reset link.";
    renderPage($message, $showForm);
    exit;
}

$raw_token = $_GET['token'];
$token_hash = hash('sha256', $raw_token);

$stmt = $conn->prepare(
    "SELECT user_id, expires_at, is_used FROM password_reset_tokens WHERE token = ?"
);
$stmt->bind_param("s", $token_hash);
$stmt->execute();
$result = $stmt->get_result();

// Guard clause: Check if token is valid
if (!$result || $result->num_rows !== 1) {
    $message = "Invalid reset token.";
    renderPage($message, $showForm);
    exit;
}

$row = $result->fetch_assoc();
$user_id = $row['user_id'];
$expire_date = $row['expires_at'];
$is_used = $row['is_used'];

// Guard clause: Check if token is already used
if ($is_used) {
    $message = "This password reset link has already been used.";
    renderPage($message, $showForm);
    exit;
}

// Guard clause: Check if token is expired
if (strtotime($expire_date) <= time()) {
    $message = "This password reset link has expired.";
    renderPage($message, $showForm);
    exit;
}

// Token is valid, show form
$showForm = true;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $new_password = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Guard clause: Check password requirements
    if ($new_password !== $confirm_password) {
        $message = "Passwords do not match.";
        renderPage($message, $showForm);
        exit;
    }

    if (strlen($new_password) < 8) {
        $message = "Password must be at least 8 characters long.";
        renderPage($message, $showForm);
        exit;
    }

    // Check if new password is different from current password
    $check = $conn->prepare("SELECT password FROM user WHERE user_id = ?");
    $check->bind_param("i", $user_id);
    $check->execute();
    $current = $check->get_result()->fetch_assoc();

    // Guard clause: Check if new password is same as current
    if (password_verify($new_password, $current['password'])) {
        $message =
            "New password must be different from your current password.";
        renderPage($message, $showForm);
        exit;
    }

    // Update password
    $hashed = password_hash($new_password, PASSWORD_DEFAULT);
    $update = $conn->prepare(
        "UPDATE user SET password = ? WHERE user_id = ?"
    );
    $update->bind_param("si", $hashed, $user_id);
    $update->execute();

    // Mark token as used
    $markUsed = $conn->prepare(
        "UPDATE password_reset_tokens SET is_used = 1, used_at = NOW() " .
        "WHERE token = ?"
    );
    $markUsed->bind_param("s", $token_hash);
    $markUsed->execute();

    $message =
        "Password reset successful! <a href='https://hershive.com/project-" .
        "hershell/Hershive/html/login.html'>Log in here</a>.";
    $showForm = false;
}

renderPage($message, $showForm);

function renderPage($message, $showForm)
{
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
    <?php if ($showForm): ?>
    <h2 class="page-title">Create new password</h2>
    <?php endif; ?>

    <div class="container">
        <?php if (!empty($message)): ?>
        <div class="message-box <?= $showForm ? 'error' : 'success' ?>">
            <?= $message ?>
        </div>
        <?php endif; ?>

        <?php if ($showForm): ?>
        <div class="form-box">
            <form method="POST">
                <label for="new_password">New password</label>
                <div class="input-group">
                    <input type="password" name="new_password" 
                        id="new_password" required />
                    <img src="../assets/closed_eye.png" alt="Toggle" 
                        class="eye-icon" id="toggle_new_pass" 
                        onclick="togglePassword('new_password', 'toggle_new_pass')" />
                </div>

                <div class="strength-meter">
                    <div id="strength-bar"></div>
                </div>

                <ul id="rules" class="rules">
                    <li id="length" class="invalid">Minimum 8 characters</li>
                    <li id="number" class="invalid">At least one number</li>
                    <li id="uppercase" class="invalid">
                        At least one uppercase letter
                    </li>
                    <li id="lowercase" class="invalid">
                        At least one lowercase letter
                    </li>
                </ul>

                <label for="confirm_password">Re-enter password</label>
                <div class="input-group">
                    <input type="password" name="confirm_password" 
                        id="confirm_password" required />
                    <img src="../assets/closed_eye.png" alt="Toggle" 
                        class="eye-icon" id="toggle_confirm_pass" 
                        onclick="togglePassword('confirm_password', 'toggle_confirm_pass')" />
                </div>

                <p id="match-warning" class="warning-text hidden">
                    Passwords do not match.
                </p>

                <button id="reset_btn" type="submit" disabled>
                    Reset Password
                </button>
            </form>
        </div>
        <?php endif; ?>
    </div>

    <script src="../script/create_new_password.js"></script>
</body>
</html>
<?php
}
