<?php
session_start();
require_once 'db_connection.php';

$provider = $_GET['provider'] ?? null;
if (!$provider) {
    die('No provider specified.');
}

$stmt = $conn->prepare("SELECT client_id, redirect_uri, provider_url
        FROM oauth_clients WHERE provider_name = ?");
$stmt->bind_param("s", $provider);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $client_id = $row['client_id'];
    $redirect_uri = $row['redirect_uri'];
    $provider_url = rtrim($row['provider_url'], '/');

    switch ($provider) {
        case 'heybleepi':
            $auth_path = '/oauth_authorize.php';
            break;
        case 'hershive':
            $auth_path = '/php/oauth_authorize.php';
            break;
        case 'devhive':
            $auth_path = '/public_html/oauth_login/index.html';
            break;
        default:
            die('Unsupported provider.');
    }

    $auth_url = "{$provider_url}{$auth_path}?client_id={$client_id}
        &redirect_uri=" . urlencode($redirect_uri);
    header("Location: $auth_url");
    exit;
} else {
    die('Unknown provider.');
}
?>
