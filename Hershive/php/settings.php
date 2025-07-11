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
        echo json_encode([
            'status' => 'error', 
            'message' => 'Unauthorized'
        ]);
        if (isset($conn)) {
            $conn->close();
        }
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'update_personal_details') {
            handlePersonalDetailsUpdate($conn, $user_id, $_POST);
        } elseif ($action === 'update_password') {
            handlePasswordUpdate($conn, $user_id, $_POST);
        } elseif ($action === 'delete_account') {
            handleAccountDeletion($conn, $user_id);
        } else {
            echo json_encode([
                'status' => 'error', 
                'message' => 'Invalid action: ' . $action
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Server error: ' . $e->getMessage()
        ]);
    }
    
    if (isset($conn)) {
        $conn->close();
    }
    exit;
}

function handlePersonalDetailsUpdate($conn, $user_id, $data) {
    $allowedFields = [
        'username', 'first_name', 'middle_name', 
        'last_name', 'birthday', 'country', 'city'
    ];

    $updateFields = [];
    $params = [];
    $types = '';

    // Check if username is being updated
    if (isset($data['username'])) {
        $username = trim($data['username']);
        if ($username === '') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Username cannot be empty.',
                'field' => 'username'
            ]);
            exit;
        }

        $sql = "SELECT `user_id` FROM `user` 
                WHERE `username` = ? AND `user_id` != ? 
                AND `deleted_account` = 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $username, $user_id);
        $stmt->execute();

        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Username already exists. Please choose a different username.',
                'field' => 'username'
            ]);
            $stmt->close();
            exit;
        }
        $stmt->close();

        $updateFields[] = "`username` = ?";
        $params[] = $username;
        $types .= 's';
    }

    // Loop through other fields and prepare update
    foreach ($allowedFields as $field) {
        if ($field === 'username') continue; // already handled

        if (isset($data[$field])) {
            $value = trim($data[$field]);

            // Validate required fields if they're being updated
            if (in_array($field, ['first_name', 'last_name']) && 
                $value === '') {
                echo json_encode([
                    'status' => 'error',
                    'message' => ucfirst(str_replace('_', ' ', $field)) . 
                                ' is required.',
                    'field' => $field
                ]);
                exit;
            }

            $updateFields[] = "`$field` = ?";
            $params[] = $value;
            $types .= 's';
        }
    }

    if (empty($updateFields)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'No fields to update.'
        ]);
        exit;
    }

    $updateFields[] = "`updated_at` = NOW()";
    $params[] = $user_id;
    $types .= 'i';

    $sql = "UPDATE `user` SET " . implode(', ', $updateFields) . 
           " WHERE `user_id` = ? AND `deleted_account` = 0";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    $success = $stmt->affected_rows > 0;
    echo json_encode([
        'status' => $success ? 'success' : 'error',
        'message' => $success ? 'Updated successfully' : 'No changes made'
    ]);
    $stmt->close();
}

function handlePasswordUpdate($conn, $user_id, $data) {
    $currentPassword = $data['current_password'] ?? '';
    $newPassword = $data['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Current password and new password are required'
        ]);
        exit;
    }

    $stmt = $conn->prepare(
        "SELECT `password` FROM `user` 
         WHERE `user_id` = ? AND `deleted_account` = 0"
    );
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($currentPassword, $user['password'])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Current password is incorrect'
        ]);
        exit;
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare(
        "UPDATE `user` SET `password` = ?, `updated_at` = NOW() 
         WHERE `user_id` = ? AND `deleted_account` = 0"
    );
    $stmt->bind_param("si", $hashedPassword, $user_id);
    $stmt->execute();

    $success = $stmt->affected_rows > 0;
    echo json_encode([
        'status' => $success ? 'success' : 'error',
        'message' => $success ? 'Password updated successfully' : 
                               'Failed to update password'
    ]);
    $stmt->close();
}

function handleAccountDeletion($conn, $user_id) {
    $password = $_POST['confirm_password'] ?? '';

    if (empty($password)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Password confirmation is required.'
        ]);
        exit;
    }

    // Verify password
    $stmt = $conn->prepare(
        "SELECT password, deleted_account FROM user WHERE user_id = ?"
    );
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode([
            'status' => 'error',
            'message' => 'User not found.'
        ]);
        exit;
    }

    if (!password_verify($password, $user['password'])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Incorrect password.'
        ]);
        exit;
    }

    if ($user['deleted_account'] == 1) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Account is already deleted.'
        ]);
        exit;
    }

    // Delete the account
    $deleteStmt = $conn->prepare(
        "UPDATE `user` SET `deleted_account` = 1, `updated_at` = NOW() 
         WHERE `user_id` = ? AND `deleted_account` = 0"
    );
    $deleteStmt->bind_param("i", $user_id);
    
    if (!$deleteStmt->execute()) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to delete account: ' . $deleteStmt->error
        ]);
        $deleteStmt->close();
        exit;
    }
    
    $affected = $deleteStmt->affected_rows;
    $deleteStmt->close();
    
    if ($affected === 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'No rows were updated. Account may already be deleted.'
        ]);
        exit;
    }

    // Verify deletion
    $verifyStmt = $conn->prepare(
        "SELECT `deleted_account` FROM `user` WHERE `user_id` = ?"
    );
    $verifyStmt->bind_param("i", $user_id);
    
    if (!$verifyStmt->execute()) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to verify deletion: ' . $verifyStmt->error
        ]);
        $verifyStmt->close();
        exit;
    }
    
    $verifyStmt->bind_result($deleted_status);
    $verifyStmt->fetch();
    $verifyStmt->close();
    
    if ($deleted_status != 1) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Account deletion verification failed.'
        ]);
        exit;
    }

    // Clear session
    session_unset();
    session_destroy();

    echo json_encode([
        'status' => 'success',
        'message' => 'Account deleted successfully.'
    ]);
}

// Handle GET request for displaying the form
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userData = [];
    if (isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare(
            "SELECT username, first_name, middle_name, last_name, 
                    birthday, country, city 
             FROM user WHERE user_id = ? AND deleted_account = 0"
        );
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $userData = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hershive Settings</title>
    <link rel="stylesheet" href="../style/home.css"/>
    <link rel="stylesheet" href="../style/settings.css"/>
    <link rel="icon" href="../assets/logo.png"/>
</head>
<body>
    <div class="top-bar">
        <img src="../assets/logo.png" alt="hershive logo" class="logo">
        
        <div class="navigation-icons">
            <button id="home_btn" onclick="goHome()">
                <img src="../assets/home_icon.png" alt="home" />
            </button>
            
            <button onclick="toggleNotificationPanel()">
                <img src="../assets/notification_icon.png" alt="notification"/>
            </button>
            
            <div class="notification-panel hidden" id="notification_panel">
                <h4>Notification</h4>
                <div class="notification">
                    <img src="../assets/temporary_pfp.png" alt="user" 
                         class="notif-pfp"/>
                    <p>
                        <strong>John Doe</strong> Started following you.
                        <span class="time">1m</span>
                    </p>
                    <a href="#">Follow</a>
                </div>
                <div class="notification">
                    <img src="../assets/temporary_pfp.png" alt="user" 
                         class="notif-pfp"/>
                    <p>
                        <strong>John Doe</strong> Liked your photo.
                        <span class="time">30m</span>
                    </p>
                    <img src="../assets/sample-post.png" alt="thumbnail" 
                         class="notif-thumbnail"/>
                </div>
                <h4>Yesterday</h4>
                <div class="notification">
                    <img src="../assets/temporary_pfp.png" alt="user" 
                         class="notif-pfp"/>
                    <p>
                        <strong>John Dy</strong> Liked your photo.
                        <span class="time">1d</span>
                    </p>
                    <img src="../assets/sample-post.png" alt="thumbnail" 
                         class="notif-thumbnail"/>
                </div>
            </div>
            
            <button class="menu-button" onclick="menuToggleDropdown()">
                ☰
            </button>
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

    <div id="logout_overlay" class="logout-modal-overlay hidden" 
         onclick="hideLogout()">
        <div id="logout" onclick="event.stopPropagation()">
            <p><strong>Log out of your account?</strong></p>
            <div class="button-holder">
                <button class="cancel-btn" onclick="hideLogout()">Cancel</button>
                <button class="logout-btn" onclick="logout()">Log out</button>
            </div>
        </div>
    </div>

    <div class="settings-container">
        <div class="sidebar">
            <h2>Settings</h2>
            <button id="personal_details_btn" class="active" 
                    onclick="togglePersonalDetails()">
                Personal details
            </button>
            <button id="password_btn" class="inactive" 
                    onclick="togglePasswordReset()">
                Password
            </button>
            <button id="delete_button" class="delete-btn" 
                    onclick="confirmDelete()">
                Delete account
            </button>
        </div>

        <div class="content-area">
            <div id="personal_details" class="hidden">
                <!-- Default view showing current information -->
                <div id="personal_details_view">
                    <div class="settings-section" onclick="showEditForm('name')">
                        <h4>Name</h4>
                        <p id="name_display">
                            <?php
                                $first = $userData['first_name'] ?? '';
                                $middle = $userData['middle_name'] ?? '';
                                $last = $userData['last_name'] ?? '';
                        
                                echo htmlspecialchars(trim(
                                    $first . ' ' . ($middle ? $middle . ' ' : '') . $last
                                ));
                            ?>
                        </p>
                        <span class="edit-arrow">›</span>
                    </div>
                    
                    <div class="settings-section" 
                         onclick="showEditForm('username')">
                        <h4>Username</h4>
                        <p id="username_display">
                            @<?php echo htmlspecialchars(
                                $userData['username'] ?? ''
                            ); ?>
                        </p>
                        <span class="edit-arrow">›</span>
                    </div>
                    
                    <div class="settings-section" 
                         onclick="showEditForm('birth')">
                        <h4>Birth Date</h4>
                        <p id="birth_display">
                            <?php
                                if (!empty($userData['birthday'])) {
                                    $formatted = date('d-m-Y', strtotime($userData['birthday']));
                                    echo htmlspecialchars($formatted);
                                }
                            ?>
                        </p>
                        <span class="edit-arrow">›</span>
                    </div>
                    
                    <div class="settings-section" 
                         onclick="showEditForm('location')">
                        <h4>Country & City</h4>
                        <p id="location_display">
                            <?php echo htmlspecialchars(
                                ($userData['country'] ?? '') . ', ' . 
                                ($userData['city'] ?? '')
                            ); ?>
                        </p>
                        <span class="edit-arrow">›</span>
                    </div>
                </div>

                <!-- Edit Name -->
                <div id="edit_name" class="edit-form hidden">
                    <div class="edit-header">
                        <div class="edit-header-left">
                            <button class="back-btn" 
                                    onclick="hideEditForm('name')">‹</button>
                            <h3>Change name</h3>
                        </div>
                    </div>
                    <div class="edit-content">
                        <div class="form-group">
                            <label>First Name</label>
                            <input type="text" id="edit_first_name" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['first_name'] ?? ''
                                   ); ?>" 
                                   required maxlength="50" 
                                   oninput="validateField('name')" />
                        </div>
                        <div class="form-group">
                            <label>Middle Name</label>
                            <input type="text" id="edit_middle_name" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['middle_name'] ?? ''
                                   ); ?>" 
                                   maxlength="50" 
                                   oninput="validateField('name')" />
                        </div>
                        <div class="form-group">
                            <label>Last Name</label>
                            <input type="text" id="edit_last_name" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['last_name'] ?? ''
                                   ); ?>" 
                                   required maxlength="50" 
                                   oninput="validateField('name')" />
                        </div>
                    </div>
                    <div class="edit-content">
                        <button class="save-btn-header" 
                                onclick="saveField('name')" disabled>
                            Save
                        </button>
                    </div>
                </div>

                <!-- Edit Username -->
                <div id="edit_username" class="edit-form hidden">
                    <div class="edit-header">
                        <div class="edit-header-left">
                            <button class="back-btn" 
                                    onclick="hideEditForm('username')">‹</button>
                            <h3>Change username</h3>
                        </div>
                    </div>
                    <div class="edit-content">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="edit_username_input" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['username'] ?? ''
                                   ); ?>" 
                                   maxlength="30" 
                                   oninput="validateField('username')" />
                            <span class="char-count" id="username_count">
                                0/30
                            </span>
                        </div>
                    </div>
                    <div class="edit-content">
                        <button class="save-btn-header" 
                                onclick="saveField('username')" disabled>
                            Save
                        </button>
                    </div>
                </div>

                <!-- Edit Birth -->
                <div id="edit_birth" class="edit-form hidden">
                    <div class="edit-header">
                        <div class="edit-header-left">
                            <button class="back-btn" 
                                    onclick="hideEditForm('birth')">‹</button>
                            <h3>Change birth date</h3>
                        </div>
                    </div>
                    <div class="edit-content">
                        <div class="form-group">
                            <label>Birth Date</label>
                            <input type="date" id="edit_birthday" 
                               value="<?php 
                                 if (!empty($userData['birthday'])) {
                                   echo htmlspecialchars(
                                     date('d-m-Y', strtotime($userData['birthday']))
                                   );
                                 }
                               ?>" 
                               oninput="validateField('birth')" />
                            <small class="help-text">
                                Your birth date is used to calculate your age.
                            </small>
                        </div>
                    </div>
                    <div class="edit-content">
                        <button class="save-btn-header" 
                                onclick="saveField('birth')" disabled>
                            Save
                        </button>
                    </div>
                </div>

                <!-- Edit Location -->
                <div id="edit_location" class="edit-form hidden">
                    <div class="edit-header">
                        <div class="edit-header-left">
                            <button class="back-btn" 
                                    onclick="hideEditForm('location')">‹</button>
                            <h3>Change location</h3>
                        </div>
                    </div>
                    <div class="edit-content">
                        <div class="form-group">
                            <label>Country</label>
                            <input type="text" id="edit_country" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['country'] ?? ''
                                   ); ?>" 
                                   maxlength="50" 
                                   oninput="validateField('location')" />
                        </div>
                        <div class="form-group">
                            <label>City</label>
                            <input type="text" id="edit_city" 
                                   value="<?php echo htmlspecialchars(
                                       $userData['city'] ?? ''
                                   ); ?>" 
                                   maxlength="50" 
                                   oninput="validateField('location')" />
                        </div>
                    </div>
                    <div class="edit-content">
                        <button class="save-btn-header" 
                                onclick="saveField('location')" disabled>
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <div id="password" class="hidden settings-panel">
                <form id="password_form" onsubmit="updatePassword(event)">
                    <div class="form-group">
                        <label>Current Password</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="current_password" required />
                            <button type="button" class="toggle-btn" 
                                  onclick="togglePassword('current_password', this)">
                                <img src="../assets/eye_closed.png" 
                                    alt="Toggle visibility" />
                            </button>
                        </div>
                    </div>
                
                    <div class="form-group">
                      <label>New Password</label>
                      <div class="password-input-wrapper">
                        <input type="password" id="new_password" 
                            oninput="validatePassword()" 
                            onfocus="showRules()" required />
                        <button type="button" class="toggle-btn" 
                            onclick="togglePassword('new_password', this)">
                          <img src="../assets/eye_closed.png" 
                              alt="Toggle visibility" />
                        </button>
                      </div>
                            <ul id="settings_rules" class="rules">
                                 <li id="settings_length" 
                                    class="invalid">Minimum 8 characters
                                </li>
                                 <li id="settings_number" 
                                    class="invalid">At least one number
                                </li>
                                 <li id="settings_uppercase" 
                                    class="invalid">At least one uppercase letter
                                </li>
                                 <li id="settings_lowercase" 
                                    class="invalid">At least one lowercase letter
                                </li>
                            </ul>
                    </div>

                    <div class="form-group">
                        <label>Confirm Password</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="confirm_password" 
                               oninput="validatePassword()" required />
                            <button type="button" class="toggle-btn" 
                                onclick="togglePassword('confirm_password', this)">
                                <img src="../assets/eye_closed.png" 
                                 alt="Toggle visibility" />
                            </button>
                        </div>
                    </div>
                    <p id="settings_match_warning" class="warning-text hidden">
                      Passwords do not match.
                    </p>
                    <button type="submit" id="reset_btn" class="save-btn" 
                            disabled>
                        Save
                    </button>
                </form>
            </div>

            <div id="delete_account" class="hidden settings-panel">
                <h3>Delete account</h3>
                <p>
                    Deleting your account will permanently remove all your data 
                    and cannot be undone. You will be logged out immediately.
                </p>
                <div class="button-holder">
                    <button class="delete-btn" 
                            onclick="showDeletePasswordModal()">
                        Delete Account
                    </button>
                </div>
            </div>

            <div id="delete_acount_modal" class="popup-overlay hidden" 
                 onclick="closeDeletePasswordModal()">
                <div class="popup-content delete-modal" 
                     onclick="event.stopPropagation()">
                    <h3>Confirm Account Deletion</h3>
                    <p>Please enter your password to confirm account deletion:</p>
                    <div class="form-group">
                        <input type="password" id="delete_confirm_password" 
                               placeholder="Enter your password" />
                        <button type="button" class="toggle-btn" 
                                onclick="togglePassword('delete_confirm_password', this)">
                            <img src="../assets/eye_closed.png" 
                                 alt="Toggle visibility" />
                        </button>
                    </div>
                    <div class="popup-buttons">
                        <button class="cancel-btn" onclick="cancelDelete()">
                            Cancel
                        </button>
                        <button class="delete-btn" 
                                onclick="confirmAccountDeletion()">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="popup_overlay" class="popup-overlay hidden" 
         onclick="closePopup()">
        <div class="popup-content" onclick="event.stopPropagation()">
            <h3 id="popup_title">Message</h3>
            <p id="popup_message">Your message here</p>
            <div class="popup-buttons">
                <button id="popup_ok_btn">OK</button>
                <button id="popup_cancel_btn" class="hidden">Cancel</button>
                <button id="popup_confirm_btn" class="hidden">Confirm</button>
            </div>
        </div>
    </div>

    <script src="../script/settings.js"></script>
</body>
</html>
<?php
}

if (isset($conn)) {
    $conn->close();
}
?>