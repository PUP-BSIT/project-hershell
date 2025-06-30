<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once './db_connection.php';

$provider = $_GET['provider'] ?? null;
$token = $_GET['token'] ?? '';

if (!$provider || !$token) {
  header('Location: /project-hershell/Hershive/html/login.html?error=missing_data');
  exit;
}

$_SESSION['oauth_token_' . $provider] = $token;
$_SESSION['oauth_provider'] = $provider;

$conn->query("UPDATE oauth_tokens SET is_revoked = 1 WHERE expires_at < NOW()");    

$stmt = $conn->prepare("SELECT provider_url, client_id FROM oauth_clients WHERE provider_name = ?");
$stmt->bind_param("s", $provider);
$stmt->execute();
$stmt->bind_result($provider_url, $local_client_id);
if (!$stmt->fetch()) {
  header('Location: /project-hershell/Hershive/html/login.html?error=unknown_provider');
  exit;
}
$stmt->close();
$provider_url = rtrim($provider_url, '/');

$stmt = $conn->prepare("
  SELECT u.* 
  FROM oauth_tokens t
  JOIN user u ON t.user_id = u.user_id
  WHERE t.token = ? AND t.client_id = ? 
    AND t.expires_at > NOW() 
    AND t.is_revoked = 0
  LIMIT 1");
$stmt->bind_param("ss", $token, $local_client_id);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
  $local_user_id = $user['user_id'];
} else {
  $stmt = $conn->prepare("
    SELECT u.* 
    FROM oauth_tokens t
    JOIN user u ON t.user_id = u.user_id
    WHERE t.token = ? AND t.client_id = ?
    LIMIT 1
  ");
  $stmt->bind_param("ss", $token, $local_client_id);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($user = $result->fetch_assoc()) {
    $local_user_id = $user['user_id'];

    $user_data_url = match ($provider) {
      'heybleepi' => $provider_url . '/get-user-data.php',
      'hershive'  => $provider_url . '/project-hersell/Herhsive/php/get_user_data.php',
      'devhive'   => $provider_url . '/api/users/get-user-data.php',
      default     => null,
    };

    $userDataUrl = "$user_data_url?token=$token&provider=$provider";
    $userDataJson = file_get_contents($userDataUrl);
    $userData = json_decode($userDataJson, true);

    if ($userData && !isset($userData['error_message'])) {
      $stmt = $conn->prepare("SELECT user_id FROM user WHERE username = ? AND user_id != ?");
      $stmt->bind_param("si", $userData['username'], $local_user_id);
      $stmt->execute();
      $result = $stmt->get_result();

      if ($result->num_rows > 0) {
        $stmt = $conn->prepare("
          UPDATE user
          SET first_name = ?, middle_name = ?, last_name = ?, email = ?, birthday = ?
          WHERE user_id = ?
        ");
        $stmt->bind_param(
          "sssssi",
          $userData['first_name'],
          $userData['middle_name'],
          $userData['last_name'],
          $userData['email'],
          $userData['birthday'],
          $local_user_id
        );
      } else {
        $stmt = $conn->prepare("
          UPDATE user
          SET username = ?, first_name = ?, middle_name = ?, last_name = ?, email = ?, birthday = ?
          WHERE user_id = ?");
        $stmt->bind_param(
          "ssssssi",
          $userData['username'],
          $userData['first_name'],
          $userData['middle_name'],
          $userData['last_name'],
          $userData['email'],
          $userData['birthday'],
          $local_user_id
        );
      }
      $stmt->execute();
  }
  } else {
    $user_data_url = match ($provider) {
      'heybleepi' => $provider_url . '/get-user-data.php',
      'hershive'  => $provider_url . '/project-hershell/Hershive/php/get_user_data.php',
      'devhive'   => $provider_url . '/api/users/get-user-data.php',
      default     => null,
    };

    $userDataUrl = "$user_data_url?token=$token&provider=$provider";
    $userDataJson = file_get_contents($userDataUrl);
    $userData = json_decode($userDataJson, true);

    if (!$userData || isset($userData['error_message'])) {
      header('Location: /project-hershell/Hershive/html/login.html?error=oauth_failed');
      exit;
    }

    $stmt = $conn->prepare("SELECT * FROM user WHERE username = ?");
    $stmt->bind_param("s", $userData['username']);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
      $stmt = $conn->prepare("
        INSERT INTO user (username, first_name, middle_name, last_name, email, birthday, password) 
        VALUES (?, ?, ?, ?, ?, ?, '')");
      $stmt->bind_param(
        "ssssss",
        $userData['username'],
        $userData['first_name'],
        $userData['middle_name'],
        $userData['last_name'],
        $userData['email'],
        $userData['birthday']
      );
      $stmt->execute();
      $local_user_id = $stmt->insert_id;
    } else {
      $user = $result->fetch_assoc();
      $local_user_id = $user['user_id'];
    }
  }
}

$stmt = $conn->prepare("SELECT id FROM oauth_tokens WHERE token = ? AND client_id = ?");
$stmt->bind_param("ss", $token, $local_client_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
  $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
  $stmt = $conn->prepare("
    INSERT INTO oauth_tokens (user_id, client_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  ");
  $stmt->bind_param("isss", $local_user_id, $local_client_id, $token, $expires_at);
  $stmt->execute();
}

$stmt = $conn->prepare("SELECT * FROM user WHERE user_id = ?");
$stmt->bind_param("i", $local_user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

$_SESSION['user_id'] = $local_user_id;
$_SESSION['username'] = $user['username'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['first_name'] = $user['first_name'];
$_SESSION['middle_name'] = $user['middle_name'];
$_SESSION['last_name'] = $user['last_name'];
$_SESSION['full_name'] = $user['first_name'] . ' ' . $user['last_name'];

header('Location: /project-hershell/Hershive/html/home.html');
exit;
?>