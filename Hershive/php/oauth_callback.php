<?php
session_start();
require_once 'db_connection.php';

$provider = $_GET['provider'];
$token = $_GET['token'] ?? "";

$_SESSION['oauth_token_' . $provider] = $token;

$stmt = $conn->prepare("SELECT provider_url FROM oauth_clients WHERE provider_name = ?");
$stmt->bind_param("s", $provider);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    $provider_url = rtrim($row['provider_url'], '/');
} else {
    die('Unknown provider.');
}

switch ($provider) {
    case 'heybleepi':
        $getUserDataPath = "$provider_url/get-user-data.php";
        break;
    case 'hershive':
        $getUserDataPath = "$provider_url/php/get_user_data.php";
        break;
    case 'devhive':
        $getUserDataPath = "$provider_url/api/oauth/get-user-data.php";
        break;
    default:
        $getUserDataPath = "$provider_url/get-user-data.php";
        break;
}

$userDataJson = file_get_contents("$getUserDataPath?token=$token");
    $userData = json_decode($userDataJson, true);

if (!$userData || isset($userData['error'])) {
    header('Location: ../html/login.html?error=oauth_failed');
    exit;
}

$stmt = $conn->prepare("SELECT * FROM user WHERE username = ?");
$stmt->bind_param("s", $userData['username']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt = $conn->prepare("INSERT INTO 
        user (username, first_name, middle_name, last_name, email,
        birthday, password) VALUES (?, ?, ?, ?, ?, ?, '')");
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
}

$stmt = $conn->prepare("SELECT user_id FROM user WHERE username = ?");
$stmt->bind_param("s", $userData['username']);
$stmt->execute();
$stmt->bind_result($local_user_id);
$stmt->fetch();
$stmt->close();

$stmt = $conn->prepare("SELECT client_id FROM oauth_clients WHERE provider_name = ?");
$stmt->bind_param("s", $provider);
$stmt->execute();
$stmt->bind_result($local_client_id);
$stmt->fetch();
$stmt->close();

$expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));

$stmt = $conn->prepare("INSERT INTO oauth_tokens (user_id, client_id,
    token, expires_at) VALUES (?, ?, ?, ?)");
$stmt->bind_param("isss", $local_user_id,
    $local_client_id, $token, $expires_at);
$stmt->execute();
$stmt->close();

// Set session variables for 
$_SESSION['user_id'] = $local_user_id;
$_SESSION['username'] = $userData['username'];
$_SESSION['user_email'] = $userData['email'];
$_SESSION['first_name'] = $userData['first_name'];
$_SESSION['middle_name'] = $userData['middle_name'];
$_SESSION['last_name'] = $userData['last_name'];
$_SESSION['full_name'] = $userData['first_name'] . ' ' . $userData['last_name'];

header('Location: ../html/home.html');
exit;
?>