<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require_once 'db_connection.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST requests are allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

$userId = intval($data['user_id']);

// Get profile data of the requested user
$sql = "SELECT * FROM user WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Retrieve current session user ID and username if available
$currentSessionUserId = $_SESSION['user_id'] ?? null;
$currentSessionUsername = null;

if ($currentSessionUserId) {
    $sessionSql = "SELECT username FROM user WHERE user_id = ?";
    $sessionStmt = $conn->prepare($sessionSql);
    $sessionStmt->bind_param("i", $currentSessionUserId);
    $sessionStmt->execute();
    $sessionResult = $sessionStmt->get_result();
    $sessionUser = $sessionResult->fetch_assoc();
    if ($sessionUser) {
        $currentSessionUsername = $sessionUser['username'];
    }
}

// Use fallback images if none are set
$profilePic = !empty($user['profile_picture_url']) 
    ? $user['profile_picture_url'] 
    : '../assets/temporary_pfp.png';

$coverPhoto = !empty($user['background_picture_url']) 
    ? $user['background_picture_url'] 
    : '../assets/cover_photo.png';

$fullName = trim(
    htmlspecialchars($user['first_name'] ?? '') . ' ' .
    htmlspecialchars($user['middle_name'] ?? '') . ' ' .
    htmlspecialchars($user['last_name'] ?? '')
);

$username = htmlspecialchars($user['username'] ?? '');
$bio = htmlspecialchars($user['bio'] ?? '');

echo json_encode([
    'user_id' => $userId,
    'full_name' => $fullName,
    'username' => $username,
    'bio' => $bio,
    'profile_picture_url' => $profilePic,
    'background_picture_url' => $coverPhoto,
    'current_session_user_id' => $currentSessionUserId,
    'current_session_username' => $currentSessionUsername
]);
?>