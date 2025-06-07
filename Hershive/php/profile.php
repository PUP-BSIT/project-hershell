<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'db_connection.php';

$userId = $_SESSION['user_id'] ?? 1;

$sql = "SELECT * FROM user WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    die("User not found.");
}

// Use default images if none set
$profilePic = !empty($user['profile_picture_url']) ? $user['profile_picture_url'] : '../assets/temporary_pfp.png';
$coverPhoto = !empty($user['background_picture_url']) ? $user['background_picture_url'] : '../assets/cover_photo.png';

$fullName = htmlspecialchars(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
$username = htmlspecialchars($user['username'] ?? '');
$bio = htmlspecialchars($user['bio'] ?? '');
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="../style/profile.css" />
  <title>Profile Page</title>
</head>
<body  data-username="<?php echo htmlspecialchars($_SESSION['username']); ?>">
  <div class="top-bar">
    <img src="../assets/logo.png" alt="hershive logo" class="logo">
    <div class="search-bar">
      <input type="text" placeholder="Search">
      <button class="search-button"><img src="../assets/search_icon.png"
          alt="search_icon"></button>
    </div>
    <div class="navigation-icons">
      <a href="../html/home.html"><button><img src="../assets/home_icon.png"
          alt="home"></button></a>
      <button><img src="../assets/notification_icon.png"
          alt="notification"></button>
      <button class="menu-button">☰</button>
    </div>
  </div>

  <div class="main-container">
    <div class="profile-card">
      <div class="profile-header">
        <div class="more-option">
          <img src="../assets/more_icon.png" alt="more" onclick="toggleDropdown(this)">
          <div class="dropdown-menu">
            <button onclick="openEditModal()">Edit Profile</button>
            <button>Settings</button>
            <button onclick="cancelDropdown(this)">Cancel</button>
          </div>
        </div>
      </div>

      <div class="profile-banner">
        <img src="<?php echo $coverPhoto; ?>" alt="Cover Photo" class="cover-img">
        <img src="<?php echo $profilePic; ?>" alt="Profile Picture" class="profile-img">
      </div>
      
      <div class="profile-info">
        <h3><?php echo $username; ?></h3>
        <p>@<?php echo $username; ?></p>
        
        <div class="bio-section">
          <p><?php echo $bio; ?></p>
        </div>

        <div class="profile-stats">
          <div><strong id="postCount">0</strong><p>Posts</p></div>
          <div><strong id="followerCount">0</strong><p>Followers</p></div>
          <div><strong id="followingCount">0</strong><p>Following</p></div>
        </div>
      </div>
      
      <div class="post-divider"></div>
      
      <div class="post-section-toggle">Post</div>

      <span id="profile_user_id" style="display:none;"><?php echo $userId; ?></span>
      
      <!-- Post Container Section (User post go here) -->
      <div class="post-container">
        <div class="post"></div>
      </div>
        
      <div id="edit_modal" class="modal hidden">
        <div class="modal-content">
          <h2>Edit Profile</h2>
    
          <div class="edit-section">
            <label>Profile Picture</label>
            <div class="preview-circle">
              <img id="profile_img_preview" src="<?php echo $profilePic; ?>" alt="Image Preview" class="profile-img-preview">
              <label class="icon-button">
                <img src="../assets/camera_icon.png" alt="Image Icon">
                <input type="file" id="media_input" accept="image/*" hidden>
              </label>
            </div>
          </div>
    
          <div class="edit-section">
            <label>Cover Photo</label>
            <div class="cover-preview">
              <img id="cover_img_preview" src="<?php echo $coverPhoto; ?>" alt="Cover Preview" class="cover-img-preview">
              <label class="icon-button">
                <img src="../assets/camera_icon.png" alt="Image Icon">
                <input type="file" id="cover_media_input" accept="image/*" hidden>
              </label>
            </div>
          </div>
    
          <div class="edit-section">
            <label>Bio</label>
            <textarea id="bio_textarea" placeholder="Enter your bio here..."><?php echo $bio; ?></textarea>
          </div>
    
          <div class="modal-actions">
            <button onclick="closeEditModal()">Cancel</button>
            <button onclick="saveProfileUpdates()">Save</button>
          </div>
        </div>
      </div>

  <script src="../script/profile.js"></script>
</body>
</html>