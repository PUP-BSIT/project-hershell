<?php
require 'db_connection.php';
session_start();

date_default_timezone_set('UTC');

// Rate limiting constants - prevent abuse by limiting requests per hour
const MAX_REQUESTS_PER_HOUR = 3;
const WINDOW_SECONDS = 3600;

// Initialize CSRF token for security - prevents cross-site request forgery
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$message = '';
$step = 'start';
$show_resend = false;
$remaining_time = '';
$show_modal = false;
$user_email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate CSRF token for security - ensures request came from our form
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }

    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    $user_email = trim($_POST['email'] ?? '');

    if ($user_email === '') {
        $step = 'empty';
        $message = 'Please enter your email address.';
    } else {
        $stmt = $conn->prepare('SELECT user_id, first_name FROM user WHERE email = ?');
        $stmt->bind_param('s', $user_email);
        $stmt->execute();
        $stmt->bind_result($user_id, $first_name);

        if (!$stmt->fetch()) {
            $step = 'no_user';
            $message = 'No account found with that email address.';
        } else {
            $stmt->close();

            // Check rate limiting - count reset attempts in past hour
            $rate_query = "SELECT COUNT(*) AS cnt, MIN(created_at) AS oldest " .
                         "FROM password_reset_tokens " .
                         "WHERE user_id = ? AND created_at >= " .
                         "(UTC_TIMESTAMP() - INTERVAL 1 HOUR)";
            $rate_stmt = $conn->prepare($rate_query);
            $rate_stmt->bind_param('i', $user_id);
            $rate_stmt->execute();
            $rate_stmt->bind_result($attempt_count, $oldest_attempt);
            $rate_stmt->fetch();
            $rate_stmt->close();

            // Check if user has exceeded rate limit
            if ($attempt_count >= MAX_REQUESTS_PER_HOUR) {
                $reset_time = strtotime($oldest_attempt) + WINDOW_SECONDS;
                $remaining_seconds = max(0, $reset_time - time());
                $remaining_time = $remaining_seconds >= 3600
                    ? gmdate('H:i:s', $remaining_seconds)
                    : gmdate('i:s', $remaining_seconds);
                $step = 'rate_limited';
                $show_modal = true;
            }

            // Check if email was sent recently (spam protection)
            if (!$show_modal) {
                $spam_query = "SELECT COUNT(*) AS recent " .
                             "FROM password_reset_tokens " .
                             "WHERE user_id = ? AND created_at >= " .
                             "(UTC_TIMESTAMP() - INTERVAL 2 MINUTE)";
                $spam_stmt = $conn->prepare($spam_query);
                $spam_stmt->bind_param('i', $user_id);
                $spam_stmt->execute();
                $spam_stmt->bind_result($recent_count);
                $spam_stmt->fetch();
                $spam_stmt->close();

                if ($recent_count > 0) {
                    $step = 'too_recent';
                    $message = 'A password‑reset email requests too frequent. ' .
                              'Please wait and try again later.';
                    $show_resend = true;
                }
            }

            // Send reset email if all checks pass
            if ($step === 'start' && !$show_modal) {
                // Invalidate previous unused tokens for security
                $invalidate_query = "UPDATE password_reset_tokens " .
                                   "SET is_used = 1, used_at = UTC_TIMESTAMP() " .
                                   "WHERE user_id = ? AND is_used = 0";
                $invalidate = $conn->prepare($invalidate_query);
                $invalidate->bind_param('i', $user_id);
                $invalidate->execute();
                $invalidate->close();

                // Generate secure token for password reset
                $raw_token = bin2hex(random_bytes(32));
                $token_hash = hash('sha256', $raw_token);
                $expires_at = gmdate('Y-m-d H:i:s', time() + WINDOW_SECONDS);
                $created_at = gmdate('Y-m-d H:i:s');

                // Insert new token into database
                $insert_query = "INSERT INTO password_reset_tokens " .
                               "(user_id, token, expires_at, created_at, is_used) " .
                               "VALUES (?, ?, ?, ?, 0)";
                $insert = $conn->prepare($insert_query);
                $insert->bind_param('isss', $user_id, $token_hash,
                                   $expires_at, $created_at);

                if ($insert->execute()) {
                    $insert->close();

                    // Email content
                    $base_url = 'https://hershive.com/project-hershell/Hershive/php/';
                    $reset_link = $base_url . 'create_new_password.php?token=' . 
                                 urlencode($raw_token);
                    $subject = 'Password Reset Request – Hershive';
                    $headers = "MIME-Version: 1.0\r\n" .
                              "Content-Type: text/html; charset=UTF-8\r\n" .
                              "From: no-reply@hershive.com\r\n" .
                              "Reply-To: support@hershive.com\r\n";
                    $greeting = $first_name ? "Hello $first_name," : 'Hello,';

                    $body = <<<HTML
<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#fff;padding:20px;
                border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <h2 style="color:#333">Password Reset Request</h2>
      <p style="font-size:15px;color:#555;">$greeting</p>
      <p style="font-size:15px;color:#555;">
        You asked to reset the password for your Hershive account.<br>
        Click the button below to choose a new one:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="$reset_link" style="display:inline-block;background:#000;
          color:#fff;padding:12px 24px;border-radius:25px;text-decoration:none;
          font-weight:bold;font-size:16px;">Reset Password</a>
      </div>
      <p style="font-size:13px;color:#777;">
        Or copy and paste this link into your browser:<br>
        <a href="$reset_link" style="color:#3366cc;">$reset_link</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
      <p style="font-size:12px;color:#aaa;text-align:center;">
        If you didn’t request this, you can safely ignore this email.
        This link will expire in 1 hour.
      </p>
    </div>
  </body>
</html>
HTML;

                    // Send email and redirect to success page
                    if (mail($user_email, $subject, $body, $headers)) {
                        header('Location: email_sent.php?email=' . 
                              urlencode($user_email));
                        exit;
                    } else {
                        $step = 'email_error';
                        $message = 'Unable to send reset email. ' .
                                  'Please try again later.';
                    }
                } else {
                    $step = 'email_error';
                    $message = 'Unable to send reset email. ' .
                              'Please try again later.';
                }
            }
        }
    }
}

$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forgot Password – Hershive</title>
  <link rel="stylesheet" href="../style/forgot_password.css">
  <link rel="icon" href="../assets/logo.png">
</head>
<body>
  <div class="container">
    <h1>Forgot Password</h1>
    <p class="subtitle">Enter your email address and we'll send a password reset link.</p>

    <?php if ($message && !$show_modal && $step !== 'too_recent'): ?>
      <div class="alert-message"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>

    <div class="form-box">
      <form method="POST" id="reset_form">
        <input type="hidden" name="csrf_token" 
               value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

        <label for="email">Email</label>
        <div class="input-group">
          <span class="icon">
            <img src="../assets/person_icon.png" alt="">
          </span>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            value="<?= htmlspecialchars($user_email) ?>"
            <?= $show_modal ? 'disabled' : '' ?>
          >
        </div>

        <button type="submit" id="submit_btn" 
                <?= $show_modal ? 'disabled' : '' ?>>
          Send Reset Link
        </button>
      </form>

      <p class="login-link">
        Remember Password?
        <a href="https://hershive.com/project-hershell/Hershive/html/login.html">Log In here</a>
      </p>
    </div>
  </div>

  <?php if ($step === 'rate_limited'): ?>
    <div class="modal-overlay">
      <div class="modal-box">
        <h2>Too Many Requests</h2>
        <p>You've already requested <strong>3 reset emails</strong> 
           in the past hour.<br>Please wait before trying again.</p>
        <div id="modal_timer" 
             data-remaining="<?= htmlspecialchars($remaining_time) ?>">
          <?= htmlspecialchars($remaining_time) ?>
        </div>
        <button onclick="location.reload()">Okay</button>
      </div>
    </div>
  <?php endif; ?>

  <?php if ($step === 'too_recent'): ?>
    <div class="toast-message" id="toast_message">
      <?= htmlspecialchars(strip_tags($message)) ?>
    </div>
  <?php endif; ?>

  <script src="../js/forgot_password.js"></script>
</body>
</html>