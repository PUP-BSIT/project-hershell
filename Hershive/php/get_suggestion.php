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
$res = $conn->query("SELECT following_id FROM follow WHERE follower_id = $currentUserId");
while ($row = $res->fetch_assoc()) {
  $alreadyFollowed[] = $row['following_id'];
}

// 3. Get users followed by people I follow (level 2 follows)
$followedByMyFollows = [];
if (count($alreadyFollowed) > 0) {
  $inList = implode(",", array_map('intval', $alreadyFollowed));
  $res = $conn->query("SELECT following_id FROM follow WHERE follower_id IN ($inList)");
  while ($row = $res->fetch_assoc()) {
    $followedByMyFollows[] = $row['following_id'];
  }
}

// 4. Build exclusion list (already followed + self)
$excluded = array_merge([$currentUserId], $alreadyFollowed);
$excludedList = implode(",", array_map('intval', $excluded));

// 5. Prepare to collect results
$suggestions = [];
$result = [];

// Helper function to get users
function fetchUsers($conn, $whereClause, $excludedList, &$collected, $limitLeft)
{
  if ($limitLeft <= 0) return [];

  $users = [];
  $sql = "SELECT user_id, first_name, middle_name, last_name, username, profile_picture_url
            FROM user
            WHERE $whereClause AND user_id NOT IN ($excludedList)
            LIMIT $limitLeft";
  $res = $conn->query($sql);

  while ($row = $res->fetch_assoc()) {
    if (!in_array($row['user_id'], $collected)) {
      $collected[] = $row['user_id'];
      $users[] = $row;
    }
  }

  return $users;
}

// Tier 1: Followed by my follows
if (count($followedByMyFollows) > 0) {
  $ids = implode(",", array_map('intval', array_diff($followedByMyFollows, $excluded)));
  if (!empty($ids)) {
    $result = array_merge($result, fetchUsers($conn, "user_id IN ($ids)", $excludedList, $suggestions, $limit - count($result)));
  }
}

if ($city !== null) {
  $result = array_merge($result, fetchUsers($conn, "city = '" . $conn->real_escape_string($city) . "'", $excludedList, $suggestions, $limit - count($result)));
}

if ($country !== null) {
  $result = array_merge($result, fetchUsers($conn, "country = '" . $conn->real_escape_string($country) . "'", $excludedList, $suggestions, $limit - count($result)));
}

// Tier 4: Everyone else
$result = array_merge($result, fetchUsers($conn, "1", $excludedList, $suggestions, $limit - count($result)));

echo json_encode(array_slice($result, 0, $limit));
