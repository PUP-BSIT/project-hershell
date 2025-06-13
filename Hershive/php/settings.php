<?php
session_set_cookie_params([
    'lifetime' => 0,
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();
require_once 'db_connection.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'update_personal_details') {
            $email = $_POST['email'] ?? '';
            $username = $_POST['username'] ?? '';
            $first_name = $_POST['first_name'] ?? '';
            $middle_name = $_POST['middle_name'] ?? '';
            $last_name = $_POST['last_name'] ?? '';
            $birthday = $_POST['birthday'] ?? '';
            $gender = $_POST['gender'] ?? '';

            $stmt = $conn->prepare("UPDATE `user` SET `email`=?, `username`=?, `first_name`=?, `middle_name`=?, `last_name`=?, `birthday`=?, `gender`=?, `updated_at`=NOW() WHERE `user_id`=? AND `deleted_account`=0");
            $stmt->bind_param("sssssssi", $email, $username, $first_name, $middle_name, $last_name, $birthday, $gender, $user_id);
            $stmt->execute();

            echo json_encode([
                'status' => $stmt->affected_rows > 0 ? 'success' : 'error',
                'message' => $stmt->affected_rows > 0 ? 'Updated successfully' : 'No changes made'
            ]);
            $stmt->close();
            exit;
        }

        if ($action === 'update_password') {
            $current = $_POST['current_password'] ?? '';
            $new = $_POST['new_password'] ?? '';

            $stmt = $conn->prepare("SELECT `password` FROM `user` WHERE `user_id`=? AND `deleted_account`=0");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $stmt->bind_result($hashed);
            $stmt->fetch();
            $stmt->close();

            if (!$hashed || !password_verify($current, $hashed)) {
                echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect']);
                exit;
            }

            $new_hash = password_hash($new, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE `user` SET `password`=?, `updated_at`=NOW() WHERE `user_id`=? AND `deleted_account`=0");
            $stmt->bind_param("si", $new_hash, $user_id);
            $stmt->execute();
            $stmt->close();

            echo json_encode(['status' => 'success', 'message' => 'Password updated']);
            exit;
        }

        if ($action === 'delete_account') {
            $conn->autocommit(FALSE);
            
            try {
                $checkStmt = $conn->prepare("SELECT `user_id`, `deleted_account`, `username` FROM `user` WHERE `user_id`=? FOR UPDATE");
                $checkStmt->bind_param("i", $user_id);
                
                if (!$checkStmt->execute()) {
                    throw new Exception('Failed to check user status: ' . $checkStmt->error);
                }
                
                $result = $checkStmt->get_result();
                $user = $result->fetch_assoc();
                $checkStmt->close();

                if (!$user) {
                    throw new Exception('User not found');
                }

                if ($user['deleted_account'] == 1) {
                    throw new Exception('Account is already deleted');
                }

                $deleteStmt = $conn->prepare("UPDATE `user` SET `deleted_account` = 1, `updated_at` = NOW() WHERE `user_id` = ? AND `deleted_account` = 0");
                $deleteStmt->bind_param("i", $user_id);
                
                if (!$deleteStmt->execute()) {
                    throw new Exception('Failed to delete account: ' . $deleteStmt->error);
                }
                
                $affected = $deleteStmt->affected_rows;
                $deleteStmt->close();
                
                if ($affected === 0) {
                    throw new Exception('No rows were updated. Account may already be deleted or user not found.');
                }

                $verifyStmt = $conn->prepare("SELECT `deleted_account` FROM `user` WHERE `user_id`=?");
                $verifyStmt->bind_param("i", $user_id);
                
                if (!$verifyStmt->execute()) {
                    throw new Exception('Failed to verify deletion: ' . $verifyStmt->error);
                }
                
                $verifyStmt->bind_result($deleted_status);
                $verifyStmt->fetch();
                $verifyStmt->close();
                
                if ($deleted_status != 1) {
                    throw new Exception('Account deletion verification failed - deleted_account is not set to 1');
                }

                $conn->commit();
                
                session_unset();
                session_destroy();
                
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'Account has been deleted successfully. You will be redirected to the login page.',
                    'deleted' => true,
                    'redirect' => '../html/login.html'
                ]);
                
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            } finally {
                $conn->autocommit(TRUE);
            }
            
            exit;
        }

        echo json_encode(['status' => 'error', 'message' => 'Invalid action: ' . $action]);
        exit;
        
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
        exit;
    }
}

?>

<?php if ($_SERVER['REQUEST_METHOD'] === 'GET'): ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hershive Settings</title>
  <link rel="stylesheet" href="../style/home.css" />
  <link rel="stylesheet" href="../style/settings.css" />
</head>
<body>
 <div class="top-bar">
    <img src="../assets/logo.png" alt="hershive logo" class="logo">
    
    <div class="search-bar">
      <input type="text" id="search_input" placeholder="Search"/>
      <button class="search-button" onclick="performSearch()">
        <img src="../assets/search_icon.png" alt="search_icon"/>
      </button>
    </div>
    
    <div class="navigation-icons">
      <button id="home_btn" onclick="goHome()">
        <img src="../assets/home_icon.png" alt="home" />
      </button>
      
      <button onclick="toggleNotificationPanel()">
        <img src="../assets/notification_icon.png" alt="notification"/>
      </button>
      
      <div class="notification-panel" id="notification_panel">
        <h4>Notification</h4>
        <div class="notification">
          <img src="../assets/temporary_pfp.png" alt="user" class="notif-pfp"/>
          <p>
            <strong>John Doe</strong> Started following you.
            <span class="time">1m</span>
          </p>
          <a href="#">Follow</a>
        </div>
        <div class="notification">
          <img src="../assets/temporary_pfp.png" alt="user" class="notif-pfp"/>
          <p>
            <strong>John Doe</strong> Liked your photo.
            <span class="time">30m</span>
          </p>
          <img src="../assets/sample-post.png" alt="thumbnail" class="notif-thumbnail"/>
        </div>
        <h4>Yesterday</h4>
        <div class="notification">
          <img src="../assets/temporary_pfp.png" alt="user" class="notif-pfp"/>
          <p>
            <strong>John Dy</strong> Liked your photo.
            <span class="time">1d</span>
          </p>
          <img src="../assets/sample-post.png" alt="thumbnail" class="notif-thumbnail"/>
        </div>
      </div>
      
      <button class="menu-button" onclick="menuToggleDropdown()">☰</button>
    </div>
  </div>

  <div id="menu_dropdown" class="hidden">
    <a href="../php/settings.php" class="menu-dropdown-item">
      <img src="../assets/settings_icon.png" alt="settings"/>
      Settings
    </a>
    <div onclick="toggleLogout()" class="menu-dropdown-item">
      <img src="../assets/logout_icon.png" alt="logout"/>
      <p>Log out</p>
    </div>
  </div>

  <div id="logout" hidden>
    <p><strong>Log out of your account?</strong></p>
    <div class="button-holder">
      <button class="cancel-btn" onclick="hideLogout()">Cancel</button>
      <button class="logout-btn" onclick="logout()">Log out</button>
    </div>
  </div>

  <div class="settings-container">
    <div class="sidebar">
      <h2>Settings</h2>
      <button id="personal_details_btn" class="active" onclick="togglePersonalDetails()">Personal details</button>
      <button id="password_btn" class="inactive" onclick="togglePasswordReset()">Password</button>
      <button id="delete_button" class="delete-btn" onclick="deleteAccount()">Delete account</button>
    </div>

    <div id="personal_details">
      <div class="form-group"><label>Email</label><input type="email" id="new_email" placeholder="example@example.com"></div>
      <div class="form-group"><label>Username</label><input type="text" id="new_username" placeholder="@example"></div>
      <div class="form-group"><label>First Name</label><input type="text" id="new_first_name" placeholder="First name"></div>
      <div class="form-group"><label>Middle Name</label><input type="text" id="new_middle_name" placeholder="Middle name"></div>
      <div class="form-group"><label>Last Name</label><input type="text" id="new_last_name" placeholder="Last name"></div>
      <div class="form-group"><label>Birthday</label><input type="date" id="new_birthday"></div>
      <div class="form-group"><label>Gender</label>
        <select id="gender">
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <button type="button" class="save-btn" onclick="savePersonalDetails()">Save</button>
    </div>

    <div id="password" hidden>
      <form id="password_form" onsubmit="updatePassword(event)">
        <div class="form-group">
          <label>Current Password</label>
          <input type="password" id="current_password" required>
          <button type="button" class="toggle-btn" onclick="togglePassword('current_password', this)">Show</button>
        </div>

        <div class="form-group">
          <label>New Password</label>
          <input type="password" id="new_password" oninput="validatePassword()" onfocus="showRules()" required>
          <button type="button" class="toggle-btn" onclick="togglePassword('new_password', this)">Show</button>
        </div>

        <ul id="rules" class="rules" style="display:none;">
          <li id="length" class="invalid">Minimum 8 characters</li>
          <li id="number" class="invalid">At least one number</li>
          <li id="uppercase" class="invalid">At least one uppercase letter</li>
          <li id="lowercase" class="invalid">At least one lowercase letter</li>
        </ul>

        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="confirm_password" oninput="validatePassword()" required>
          <button type="button" class="toggle-btn" onclick="togglePassword('confirm_password', this)">Show</button>
        </div>

        <button type="submit" id="reset_btn" class="save-btn" disabled>Save</button>
      </form>
    </div>

    <div id="delete_account" hidden>
      <h3>Delete account?</h3>
      <p>If you delete your account, all data will be deleted and you will be logged out immediately.</p>
      <div class="button-holder">
        <button class="cancel-btn" onclick="cancelDelete()">Cancel</button>
        <button class="delete-btn" id="confirm_delete_btn" onclick="confirmDelete()">Delete</button>
      </div>
    </div>
  </div>

  <script src="../script/create_new_password.js"></script>
  <script src="../script/settings.js"></script>
</body>
</html>
<?php endif; ?>

<?php
if (isset($conn)) {
    $conn->close();
}
?>