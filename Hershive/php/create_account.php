<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

$user_id = $_SESSION['pending_profile_user_id'] ?? null;
if (!$user_id) {
  echo json_encode([
      "success" => false, "error" => "Unauthorized or expired session."]);
  exit;
}

$first_name = trim($_POST['first_name'] ?? '');
$middle_name = trim($_POST['middle_name'] ?? '');
$last_name = trim($_POST['last_name'] ?? '');
$birthday = $_POST['birthday'] ?? null;
$status = $_POST['status'] ?? null;
$gender = $_POST['gender'] ?? null;
$country = trim($_POST['country'] ?? '');
$city = trim($_POST['city'] ?? '');
$bio = trim($_POST['bio'] ?? '');

if (!$first_name || !$last_name || !$birthday || !$gender || !$status) {
  echo json_encode([
      "success" => false, "error" => "Missing required fields."]);
  exit;
}

function calculateAge($birthday) {
  $birthDate = new DateTime($birthday);
  $today = new DateTime();
  return $today->diff($birthDate)->y;
}
$age = calculateAge($birthday);

$uploadDir = '../uploads/';
$profile_picture_url = '';
$background_picture_url = '';

if (!is_dir($uploadDir)) {
  mkdir($uploadDir, 0755, true);
}

if (isset($_FILES['profile_image']) && 
      $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
  $ext = pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION);
  $profile_picture_url = $uploadDir . 'profile_' . $user_id . '.' . $ext;
  move_uploaded_file($_FILES['profile_image']['tmp_name'],
      $profile_picture_url);
}

if (isset($_FILES['cover_image']) && 
      $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
  $ext = pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION);
  $background_picture_url = $uploadDir . 'cover_' . $user_id . '.' . $ext;
  move_uploaded_file($_FILES['cover_image']['tmp_name'],
      $background_picture_url);
}

$sql = "
  UPDATE user SET
  first_name = ?,
  middle_name = ?,
  last_name = ?,
  birthday = ?,
  age = ?,
  status = ?,
  gender = ?,
  country = ?,
  city = ?,
  bio = ?";

$params = [
  $first_name,
  $middle_name,
  $last_name,
  $birthday,
  $age,
  $status,
  $gender,
  $country,
  $city,
  $bio];
$types = "sssissssss";

if ($profile_picture_url) {
  $sql .= ", profile_picture_url = ?";
  $params[] = $profile_picture_url;
  $types .= "s";
}

if ($background_picture_url) {
  $sql .= ", background_picture_url = ?";
  $params[] = $background_picture_url;
  $types .= "s";
}

$sql .= " WHERE user_id = ?";
$params[] = $user_id;
$types .= "i";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  echo json_encode([
      "success" => false, "error" => "Prepare failed: " . $conn->error]);
  exit;
}
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
  $_SESSION['user_id'] = $user_id;

  $stmtUsername = $conn->prepare(
      "SELECT username FROM user WHERE user_id = ?");
  $stmtUsername->bind_param("i", $user_id);
  $stmtUsername->execute();
  $resultUsername = $stmtUsername->get_result();
  
  if ($row = $resultUsername->fetch_assoc()) {
      $_SESSION['username'] = $row['username'];
  }

  echo json_encode([
    "success" => true,
    "message" => "Account created and user logged in."
  ]);
} else {
  echo json_encode([
      "success" => false, "error" => "Database error: " . $stmt->error]);
}

$conn->close();
?>