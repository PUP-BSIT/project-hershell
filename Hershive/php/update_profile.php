<?php
session_start();
require_once 'db_connection.php';
header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    echo json_encode(['error' => 'User not authenticated']);
    exit;
}

$bio = $_POST['bio'] ?? '';
$uploadDir = '../uploads/';
$profilePath = '';
$coverPath = '';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Handle profile picture upload
if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['profile_picture']['name'], PATHINFO_EXTENSION);
    $profilePath = $uploadDir . 'profile_' . $userId . '.' . $ext;
    move_uploaded_file($_FILES['profile_picture']['tmp_name'], $profilePath);
}

// Handle cover photo upload
if (isset($_FILES['cover_photo']) && $_FILES['cover_photo']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['cover_photo']['name'], PATHINFO_EXTENSION);
    $coverPath = $uploadDir . 'cover_' . $userId . '.' . $ext;
    move_uploaded_file($_FILES['cover_photo']['tmp_name'], $coverPath);
}

$sql = "UPDATE user SET bio = ?";
$params = [$bio];
$types = "s";

if ($profilePath !== '') {
    $sql .= ", profile_picture_url = ?";
    $params[] = $profilePath;
    $types .= "s";
}

if ($coverPath !== '') {
    $sql .= ", background_picture_url = ?";
    $params[] = $coverPath;
    $types .= "s";
}

$sql .= " WHERE user_id = ?";
$params[] = $userId;
$types .= "i";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Database update failed']);
}
?>
