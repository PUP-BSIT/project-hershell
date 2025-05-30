<?php
require_once 'db_connection.php';

if (!isset($_GET['token'])) {
  die("Invalid verification request.");
}

$token = $_GET['token'];

$stmt = $conn->prepare("
  SELECT ev.user_id, ev.expires_at, ev.verified_at, u.email_verified 
  FROM email_verification ev 
  JOIN user u ON u.user_id = ev.user_id 
  WHERE ev.verify_token = ?
  LIMIT 1
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
  die("Invalid or expired verification link.");
}

$row = $result->fetch_assoc();
$user_id = $row['user_id'];
$expires_at = $row['expires_at'];
$verified_at = $row['verified_at'];
$email_verified = $row['email_verified'];

if ($verified_at || $email_verified) {
  die("Email already verified.");
}

if (strtotime($expires_at) < time()) {
  die("Verification link expired.");
}

// Update user table and mark token as used
$conn->begin_transaction();

try {
  $conn->query("UPDATE user SET email_verified = 1 WHERE user_id = $user_id");
  $conn->query("UPDATE email_verification 
      SET verified_at = NOW() WHERE user_id = $user_id");
  $conn->commit();
  echo "Your email has been successfully verified!";
} catch (Exception $e) {
  $conn->rollback();
  echo "Verification failed: " . $e->getMessage();
}

$stmt->close();
$conn->close();
?>
