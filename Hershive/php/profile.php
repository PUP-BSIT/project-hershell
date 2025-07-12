<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'db_connection.php';

$userId = $_GET['user_id'] ?? $_SESSION['user_id'] ?? 1;
$currentUserId = $_SESSION['user_id'] ?? 1;
$isOwnProfile = ($userId == $currentUserId);
$fromSearch = isset($_GET['from']) && $_GET['from'] === 'search';

$sql = "SELECT * FROM user WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    die("User not found.");
}

$profilePic = !empty($user['profile_picture_url'])
    ? $user['profile_picture_url'] : '../assets/temporary_pfp.png';
$coverPhoto = !empty($user['background_picture_url'])
    ? $user['background_picture_url'] : '../assets/cover_photo.png';

$fullName = htmlspecialchars((
    $user['first_name'] ?? '') . ' ' . ($user['middle_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
$username = htmlspecialchars($user['username'] ?? '');
$bio = htmlspecialchars($user['bio'] ?? '');
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="/project-hershell/Hershive/style/profile.css?v=3"/>
<title>Profile Page</title>
<link rel="icon" href="../assets/logo.png"/>
</head>
<body data-user-id="<?= $_SESSION['user_id'] ?>" data-username="<?php echo htmlspecialchars($_SESSION['username']); ?>">
  <div class="top-bar">
    <img src="../assets/logo.png" alt="hershive logo" class="logo">
    <?php if ($fromSearch): ?>
      <button class="back-btn" onclick="backToSearch()">← Back</button>
    <?php endif; ?>
    <div class="search-bar">
      <input type="text" id="search_input" placeholder="Search">
      <button class="search-button" id="search_button">
          <img src="../assets/search_icon.png" alt="search_icon"></button>
    </div>
    <div class="navigation-icons">
      <button class="profile-tab-btn" onclick="scrollToProfile()">
        <span class="profile-tab-circle"><?php echo $username; ?></span>
      </button>
      <a href="/project-hershell/Hershive/html/home.html"><button><img src="../assets/home_icon.png"
          alt="home"></button></a>

        <button class="menu-button" onclick="menuToggleDropdown()">☰</button>
    </div>
  </div>

    <div id="menu_dropdown" class="hidden">
      <a href="/project-hershell/Hershive/php/settings.php" class="menu-dropdown-item">
        <img src="/project-hershell/Hershive/assets/settings_icon.png" alt="settings"/>
        Settings
      </a>
      <div onclick="toggleLogout()" class="menu-dropdown-item">
        <img src="../assets/logout_icon.png" alt="logout"/>
        <p>Log out</p>
      </div>
    </div>

    <div class="logout-modal-overlay hidden" id="logout_modal">
      <div id="logout">
        <p><strong>Log out of your account?</strong></p>
        <div class="button-holder">
          <button class="cancel-btn" onclick="hideLogout()">Cancel</button>
          <button class="logout-btn" onclick="logout()">Log out</button>
        </div>
      </div>
    </div>

  <div class="main-container">
    <div class="profile-card">
      <div class="profile-header">
        <?php if ($isOwnProfile): ?>
          <div class="more-option">
            <img src="../assets/more_icon.png"
                alt="more" onclick="toggleDropdown(this)">
            <div class="dropdown-menu">
              <button onclick="openEditModal()">Edit Profile</button>
              <button onclick="cancelDropdown(this)">Cancel</button>
            </div>
          </div>
        <?php endif; ?>
      </div>

    <div class="profile-banner">
      <img src="<?php echo $coverPhoto; ?>"
          alt="Cover Photo" class="cover-img">
      <img src="<?php echo $profilePic; ?>"
          alt="Profile Picture" class="profile-img">
    </div>

      <div class="profile-info">
        <div class="profile-name-section">
          <h3><?php echo $fullName; ?></h3>
          <?php if (!$isOwnProfile): ?>
            <button class="follow-btn" id="follow_btn"
                onclick="toggleMainProfileFollow('<?php echo $username; ?>', this)">
              Follow
            </button>
          <?php endif; ?>
        </div>
        <p>@<?php echo $username; ?></p>
        <div class="bio-section">
          <p><?php echo $bio; ?></p>
        </div>
      </div>

    <div class="post-divider"></div>

      <div class="container">
        <div class="post-section-toggle" id="tabs">
          <div class="tab active" data-tab="post">
            <strong id="postCount">0</strong>
          Post</div>
          <div class="tab" data-tab="followers">
            <strong id="followerCount">0</strong>
          Followers</div>
          <div class="tab" data-tab="following">
            <strong id="followingCount">0</strong>
          Following</div>
        </div>
      </div>

        <!-- Post Tab Content -->
        <div class="tab-content active" id="post-tab">
          <?php if ($isOwnProfile): ?>
            <div class="create-post" id="share_trigger" onclick="openPostModal(event)">
              <div class="main-create-post">
                <img
                  src="<?php echo $profilePic; ?>"
                  alt="user profile"
                  class="profile-pic"/>
                <span>Share something</span>
              </div>

              <div class="sub-create-post">
                <label class="upload-option">
                  <div class="image">
                    <img src="../assets/camera_icon.png" alt="image"/>
                    <span>image</span>
                  </div>
                  <input type="file" accept="image/*" hidden id="trigger_media_image"/>
                </label>

                <label class="upload-option">
                  <div class="video">
                    <img src="../assets/video_icon.png" alt="video"/>
                    <span>video</span>
                  </div>
                  <input type="file" accept="video/*" hidden id="trigger_media_video"/>
                </label>

                <div class="privacy">
                  <img id="mini_privacy_icon" src="../assets/public_icon.png"
                      alt="public" />
                  <span>
                    <select name="visibility" id="privacy">
                      <option value="public">Public</option>
                      <option value="followers">Followers</option>
                      <option value="private">Private</option>
                    </select>
                  </span>
                </div>
              </div>
            </div>
          <?php endif; ?>
          <div id="post-container" class="post-container"></div>
        </div>

      <!-- Following Tab Content -->
      <div class="tab-content" id="following-tab">
        <div class="loading" id="following-loading">Loading following...</div>
        <div id="following-list" class="user-list"></div>
      </div>

      <!-- Followers Tab Content -->
      <div class="tab-content" id="followers-tab">
        <div class="loading" id="followers-loading">Loading followers...</div>
        <div id="followers-list" class="user-list"></div>
      </div>
    </div>

    <span id="profile_user_id"
        style="display:none;"><?php echo $userId; ?></span>

      <?php if ($isOwnProfile): ?>
        <!-- Edit Modal -->
        <div id="edit_modal" class="modal hidden">
          <div class="modal-content">
            <h2>Edit Profile</h2>

          <div class="edit-section">
            <label>Profile Picture</label>
            <div class="preview-circle">
              <img id="profile_img_preview"
                  src="<?php echo $profilePic; ?>"
                  alt="Image Preview" class="profile-img-preview">
              <label class="profile-icon-button">
                <img src="../assets/camera_icon.png" alt="Image Icon">
                <input type="file" id="profile_media_input" accept="image/*" hidden>
              </label>
            </div>
          </div>

            <div class="edit-section">
              <label>Cover Photo</label>
              <div class="cover-preview">
                <img id="cover_img_preview"
                    src="<?php echo $coverPhoto; ?>"
                    alt="Cover Preview" class="cover-img-preview">
                <label class="profile-icon-button">
                  <img src="../assets/camera_icon.png" alt="Image Icon">
                  <input type="file"
                      id="cover_media_input" accept="image/*" hidden>
                </label>
              </div>
            </div>

            <div class="edit-section">
              <label>Bio</label>
              <textarea id="bio_textarea"
                  placeholder="Enter your bio here..."><?php echo $bio; ?>
              </textarea>
            </div>

            <div class="modal-actions">
              <button onclick="closeEditModal()">Cancel</button>
              <button onclick="saveProfileUpdates()">Save</button>
            </div>
          </div>
        </div>

        <!-- Share Modal -->
        <div class="modal-overlay hidden" id="share_modal">
          <div class="share-modal">
            <div class="share-modal-header">
              <h3>Share Post</h3>
              <button class="close-btn" onclick="closeShareModal()">&times;</button>
            </div>

            <textarea id="share_message" class="share-textarea"
                placeholder="Say something about this..."></textarea>

            <div class="shared-post-preview" id="shared_post_preview"></div>

            <button class="submit-share-btn" onclick="submitShare()">Share</button>

            <form action="/project-hershell/Hershive/php/create-post.php" method="POST">
              <p><strong>Share To:</strong></p>
              <input type="hidden" name="shared_post_id" id="shared_post_id">
              <div class="share-icons">
                <button type="submit" name="share_to" value="devhive" id="share_to_devhive">
                  <img src="../assets/devhive_logo1.jpg" alt="devhive"/>
                </button>
                <button type="submit" name="share_to" value="heybleepi"
                        id="share_to_heybleepi" title="Share to heybleepi">
                  <img src="../assets/heybleepi_logo1.png" alt="heybleepi"/>
                </button>
              </div>
            </form>

            <div class="share-link-section">
              <p><strong>Page link</strong></p>
              <div class="link-box">
                <input
                  type="text"
                  id="share_link"
                  readonly>
                <button id="copy_link" onclick="copyLink(this)" title="Copy link">
                  <img src="../assets/copy_icon.png" alt="Copy"/>
                </button>
              </div>
            </div>
          </div>
        </div>

      <!-- Post Modal -->
      <div class="modal-overlay hidden" id="post_modal">
        <div class="create-post-modal">
          <div class="modal-header">
            <h2>Create Post</h2>
            <button class="close-button" onclick="closePostModal()">×</button>
          </div>
          <div class="user-info-box">
            <img src="<?php echo $profilePic; ?>"
                alt="user profile" class="modal-profile-pic" />
            <span class="username"><?php echo $username; ?></span>
          </div>
          <div class="text-editor" id="editor" contenteditable="true"
              placeholder="Share something..."></div>
          <div class="preview" id="preview_container"></div>
          <div class="formatting-options">
            <button onclick="formatText('bold')">B</button>
            <button onclick="formatText('italic')">I</button>
            <button onclick="formatText('underline')">U</button>
          </div>
          <div class="upload-controls">
            <label class="icon-button">
              <img src="../assets/camera_icon.png" alt="Image Icon"/>
              <input type="file" id="media_input" accept="image/*" hidden />
              <span>Image</span>
            </label>
            <label class="icon-button">
              <img src="../assets/video_icon.png" alt="Video Icon"/>
              <input type="file" id="media_input_video" accept="video/*" hidden/>
              <span>Video</span>
            </label>
            <div class="privacy-select">
              <img id="modal_privacy_icon" src="../assets/public_icon.png"
                  alt="Privacy Icon" />
              <select id="privacy_setting">
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <button class="submit-button" id="submit_post_button"
              onclick="submitPost()">Post</button>
        </div>
      </div>

      <div class="delete-post-modal-overlay hidden" id="delete_post_modal">
        <div class="delete-post-modal">
          <div class="delete-post-modal-header">
            <h3>Delete Post</h3>
            <button class="delete-post-close-btn" onclick="closeDeletePostModal()">&times;</button>
          </div>
          <div class="delete-post-modal-content">
            <p>Are you sure you want to delete this post?</p>
            <div class="delete-post-button-holder">
            <button class="delete-post-cancel-btn" onclick="closeDeletePostModal()">Cancel</button>
            <button class="delete-post-confirm-btn" onclick="confirmDeletePost()">Delete</button>
          </div>
          </div>
        </div>
      </div>

     <!-- Comment Modal -->
    <div class="comment-modal-overlay" id="commentModalOverlay">
      <div class="comment-modal" id="commentModal">
        <div class="comment-modal-header">
           <h3 class="modal-title">Comments</h3>
          <button class="close-comment-modal" onclick="closeCommentModal()">×</button>
        </div>
        <div class="comment-modal-scrollable" id="commentModalScrollable">
          <div class="scroll-wrapper">
            <div class="comment-post-preview" id="commentPostPreview"></div>
            <div class="comment-list-container" id="commentListContainer"></div>
          </div>
        </div>
        <div class="comment-input-container">
          <img src="<?php echo $profilePic; ?>"
               alt="Your Avatar" class="comment-input-avatar" />
          <div class="comment-input-wrapper">
            <input type="text" class="comment-input"
                placeholder="Write a comment..." id="commentInput" />
            <button class="send-comment-btn" onclick="submitComment()">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Comment Modal -->
    <div class="custom-modal-overlay hidden" id="delete_comment_modal">
      <div class="custom-modal">
        <div class="custom-modal-header">
          <h3>Delete Comment</h3>
          <button class="custom-close-btn" onclick="closeMyNewModal()">×</button>
        </div>
        <div class="custom-content-area">
          <p>Are you sure you want to permanently remove this comment?</p>
          <div class="button-holder">
            <button class="comment-cancel-btn" onclick="closeMyNewModal()">Cancel</button>
            <button class="confirm-button">Confirm</button>
          </div>
        </div>
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>

<script src="/project-hershell/Hershive/script/profile.js?v=4"></script>
</body>
</html>