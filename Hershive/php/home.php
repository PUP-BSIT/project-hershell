<?php
session_start();
require_once 'db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'User not logged in']);
  exit;
}

$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT username, profile_picture_url,
    background_picture_url, first_name, middle_name, last_name
    FROM user WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $row = $result->fetch_assoc()) {
  $display_name = '';
  if (!empty($row['first_name'])) {
    $display_name = $row['first_name'];
    if (!empty($row['middle_name'])) {
      $display_name .= ' ' . $row['middle_name'];
    }
    if (!empty($row['last_name'])) {
      $display_name .= ' ' . $row['last_name'];
    }
  } else {
    // Fallback to username if no first name
    $display_name = $row['username'];
  }

  echo json_encode([
    'success' => true,
    'user_id' => $user_id,
    'username' => $row['username'],
    'display_name' => $display_name,
    'profile_picture_url' => $row['profile_picture_url'] ?? '../assets/temporary_pfp.png',
    'background_picture_url' => $row['background_picture_url'] ?? '../assets/cover_photo.png',
    'oauth' => [
      'devhive' => [
        'token' => $_SESSION['oauth_token_devhive'] ?? '',
        'allowed' => (($_SESSION['isAllowed'] ?? '') === 'allowed_to_share')
      ],
      'heybleepi' => [
        'token' => $_SESSION['oauth_token_heybleepi'] ?? '',
        'allowed' => (($_SESSION['isAllowed'] ?? '') === 'allowed_to_share')
      ]
    ]
  ]);
} else {
  echo json_encode(['success' => false, 'error' => 'User not found']);
}
?>