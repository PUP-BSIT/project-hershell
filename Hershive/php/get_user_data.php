<?php
header("Content-Type: application/json");
require_once './db_connection.php';

$token = $_GET['token'] ?? '';
$provider = $_GET['provider'] ?? 'default';

if (!$token) {
  http_response_code(400);
  echo json_encode(["error_message" => "Missing token"]);
  exit;
}

$stmt = $conn->prepare("
    SELECT user_id 
    FROM oauth_tokens 
    WHERE token = ? AND expires_at > NOW()
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
  $user_id = $row['user_id'];

  switch ($provider) {
    case 'heybleepi':
      $query = "
          SELECT username AS user_name,
            first_name, middle_name, last_name, email, birthday AS birthdate 
          FROM users 
          WHERE id = ?";
      break;

    case 'devhive':
      $query = "
          SELECT username,
            first_name, middle_name, last_name, email, birthday 
          FROM user
          WHERE user_id = ?";
      break;

    default:
      http_response_code(400);
      echo json_encode(["error_message" => "Invalid platform"]);
      exit;
  }

  $userStmt = $conn->prepare($query);
  $userStmt->bind_param("i", $user_id);
  $userStmt->execute();
  $userResult = $userStmt->get_result();

  if ($user = $userResult->fetch_assoc()) {
    $user['user_id'] = $user_id;
    echo json_encode($user);    } else {

    http_response_code(404);
    echo json_encode(["error_message" => "User not found"]);
  }
} else {
  http_response_code(401);
  echo json_encode(["error_message" => "Invalid or expired token"]);
}
?>