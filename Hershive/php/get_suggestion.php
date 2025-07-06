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

// 1. Get current user's city and country
$sql = "SELECT city, country FROM user WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $currentUserId);
$stmt->execute();
$stmt->bind_result($city, $country);
$stmt->fetch();
$stmt->close();

if (!$city) $city = null;
if (!$country) $country = null;

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

// 3. Get users followed by people I (current user) follow
$followedByMyFollows = [];
if (count($alreadyFollowed) > 0) {
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

// 4. Build initial exclusion list (already followed + self)
$excluded = array_merge([$currentUserId], $alreadyFollowed);
$collectedUserIds = []; // Track users we've already added to results
$result = [];

// Helper function to get users with proper duplicate prevention
function fetchUsers($conn, $whereClause, $params, $excludedList, &$collectedUserIds, $limitLeft)
{
  if ($limitLeft <= 0) return [];

  $users = [];
  $excludedPlaceholders = str_repeat('?,', count($excludedList) - 1) . '?';
  
  $sql = "SELECT user_id, first_name, middle_name, last_name, username, profile_picture_url
            FROM user
            WHERE $whereClause AND deleted_account = 0 AND user_id NOT IN ($excludedPlaceholders)
            LIMIT ?";
  
  $stmt = $conn->prepare($sql);
  if (!$stmt) {
    error_log("Database error: " . $conn->error);
    return [];
  }
  
  // Combine parameters: whereClause params + excluded list + limit
  $allParams = array_merge($params, $excludedList, [$limitLeft * 2]);
  $types = str_repeat('s', count($params)) . str_repeat('i', count($excludedList)) . 'i';
  
  $stmt->bind_param($types, ...$allParams);
  $stmt->execute();
  $res = $stmt->get_result();
  
  if (!$res) {
    error_log("Query failed: " . $conn->error);
    $stmt->close();
    return [];
  }

  while (($row = $res->fetch_assoc()) && count($users) < $limitLeft) {
    if (!in_array($row['user_id'], $collectedUserIds)) {
      $collectedUserIds[] = $row['user_id'];
      $users[] = $row;
    }
  }
  
  $stmt->close();
  return $users;
}

// Update excluded list dynamically
function updateExcluded($excluded, $collectedUserIds) {
  return array_merge($excluded, $collectedUserIds);
}

// Tier 1: Followed by my follows
if (count($followedByMyFollows) > 0) {
  $uniqueFollowedByMyFollows = array_diff($followedByMyFollows, $excluded);
  if (!empty($uniqueFollowedByMyFollows)) {
    $placeholders = str_repeat('?,', count($uniqueFollowedByMyFollows) - 1) . '?';
    $whereClause = "user_id IN ($placeholders)";
    $newUsers = fetchUsers($conn, $whereClause, $uniqueFollowedByMyFollows, updateExcluded($excluded, $collectedUserIds), $collectedUserIds, $limit - count($result));
    $result = array_merge($result, $newUsers);
  }
}

// Tier 2: Same city
if ($city !== null && count($result) < $limit) {
  $whereClause = "city = ?";
  $newUsers = fetchUsers($conn, $whereClause, [$city], updateExcluded($excluded, $collectedUserIds), $collectedUserIds, $limit - count($result));
  $result = array_merge($result, $newUsers);
}

// Tier 3: Same country
if ($country !== null && count($result) < $limit) {
  $whereClause = "country = ?";
  $newUsers = fetchUsers($conn, $whereClause, [$country], updateExcluded($excluded, $collectedUserIds), $collectedUserIds, $limit - count($result));
  $result = array_merge($result, $newUsers);
}

// Tier 4: Everyone else
if (count($result) < $limit) {
  $whereClause = "1 = ?";
  $newUsers = fetchUsers($conn, $whereClause, [1], updateExcluded($excluded, $collectedUserIds), $collectedUserIds, $limit - count($result));
  $result = array_merge($result, $newUsers);
}

$result = array_slice($result, 0, $limit);

echo json_encode($result);