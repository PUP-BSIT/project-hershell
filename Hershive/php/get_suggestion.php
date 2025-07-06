<?php
require_once 'db_connection.php';
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'error' => 'Not authenticated']);
  exit;
}

$currentUserId = $_SESSION['user_id'];

// Pagination settings
$limit = intval($_GET['limit'] ?? 10);
$page = intval($_GET['page'] ?? 1);
$offset = ($page - 1) * $limit;

// Get current user's city and country
$sql = "SELECT city, country FROM user WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $currentUserId);
$stmt->execute();
$stmt->bind_result($city, $country);
$stmt->fetch();
$stmt->close();

$city = $city ?: null;
$country = $country ?: null;

// 2. Get users the current user is already following
$alreadyFollowed = [];
$sql = "SELECT following_id FROM follow WHERE follower_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $currentUserId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
  $alreadyFollowed[] = $row['following_id'];
}
$stmt->close();

// Get users followed by people that current user follows
$followedByMyFollows = [];
if (!empty($alreadyFollowed)) {
  $placeholders = str_repeat('?,', count($alreadyFollowed) - 1) . '?';
  $sql = "SELECT following_id FROM follow WHERE follower_id IN ($placeholders)";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param(str_repeat('i', count($alreadyFollowed)), ...$alreadyFollowed);
  $stmt->execute();
  $result = $stmt->get_result();
  while ($row = $result->fetch_assoc()) {
    $followedByMyFollows[] = $row['following_id'];
  }
  $stmt->close();
}

// Exclusion list (current user + already followed)
$excluded = array_merge([$currentUserId], $alreadyFollowed);
$excludedPlaceholders = str_repeat('?,', count($excluded) - 1) . '?';

// Dynamic CASE conditions
$whenConditions = [];
$params = [];
$types = '';

// Priority for followedByMyFollows if any
if (!empty($followedByMyFollows)) {
  $placeholders = str_repeat('?,', count($followedByMyFollows) - 1) . '?';
  $whenConditions[] = "WHEN user_id IN ($placeholders) THEN 1";
  $params = array_merge($params, $followedByMyFollows);
  $types .= str_repeat('i', count($followedByMyFollows));
}

// Optional city priority
if ($city) {
  $whenConditions[] = "WHEN city = ? THEN 2";
  $params[] = $city;
  $types .= 's';
}

// Optional country priority
if ($country) {
  $whenConditions[] = "WHEN country = ? THEN 3";
  $params[] = $country;
  $types .= 's';
}

// Priority selection
if (!empty($whenConditions)) {
  $selectPriority = "CASE " . implode(" ", $whenConditions) . " ELSE 4 END as priority";
} else {
  $selectPriority = "4 as priority";
}

// Final SQL query
$sql = "SELECT user_id, first_name, middle_name, last_name, username, profile_picture_url,
        $selectPriority
        FROM user
        WHERE deleted_account = 0
        AND user_id NOT IN ($excludedPlaceholders)
        ORDER BY priority ASC
        LIMIT ? OFFSET ?";

// Add exclusion params
$params = array_merge($params, $excluded);
$types .= str_repeat('i', count($excluded));

// Add limit and offset
$params[] = $limit;
$params[] = $offset;
$types .= 'ii';

// Prepare and execute
$stmt = $conn->prepare($sql);
if (!$stmt) {
  echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
  exit;
}
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while ($row = $result->fetch_assoc()) {
  unset($row['priority']);
  $users[] = $row;
}
$stmt->close();

// Get total count for pagination
$countSql = "SELECT COUNT(*) as total FROM user 
             WHERE deleted_account = 0 
             AND user_id NOT IN ($excludedPlaceholders)";
$countStmt = $conn->prepare($countSql);
$countStmt->bind_param(str_repeat('i', count($excluded)), ...$excluded);
$countStmt->execute();
$countResult = $countStmt->get_result();
$totalCount = $countResult->fetch_assoc()['total'];
$countStmt->close();

echo json_encode([
  'users' => $users,
  'pagination' => [
    'current_page' => $page,
    'per_page' => $limit,
    'total' => $totalCount,
    'has_more' => ($offset + $limit) < $totalCount,
    'next_page' => ($offset + $limit) < $totalCount ? $page + 1 : null
  ]
]);