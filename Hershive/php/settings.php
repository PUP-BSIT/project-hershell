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
    exit;
}

function handlePersonalDetailsUpdate($conn, $user_id, $data) {
    $fields = [
        'username', 'first_name', 'middle_name', 
        'last_name', 'birthday', 'country', 'city'
    ];
    
    $username = $data['username'] ?? '';
    
    if (!empty($username)) {
        $sql = "SELECT `user_id` FROM `user` 
                WHERE `username` = ? AND `user_id` != ? 
                AND `deleted_account` = 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $username, $user_id);
        $stmt->execute();
        
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Username already exists. ' . 
                           'Please choose a different username.',
                'field' => 'username'
            ]);
            $stmt->close();
            exit;
        }
        $stmt->close();
    }

    $updateFields = [];
    $params = [];
    $types = '';

    foreach ($fields as $field) {
        $value = $data[$field] ?? '';
        if (!empty($value)) {
            $updateFields[] = "`{$field}` = ?";
            $params[] = $value;
            $types .= 's';
        }
    }

    if (empty($updateFields)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'No fields to update'
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
    $checkStmt = $conn->prepare(
        "SELECT `user_id`, `deleted_account`, `username` 
         FROM `user` WHERE `user_id`=?"
    );
    $checkStmt->bind_param("i", $user_id);
    
    if (!$checkStmt->execute()) {
        throw new Exception('Failed to check user status: ' . 
                          $checkStmt->error);
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

    $deleteStmt = $conn->prepare(
        "UPDATE `user` SET `deleted_account` = 1, `updated_at` = NOW() 
         WHERE `user_id` = ? AND `deleted_account` = 0"
    );
    $deleteStmt->bind_param("i", $user_id);
    
    if (!$deleteStmt->execute()) {
        throw new Exception('Failed to delete account: ' . $deleteStmt->error);
    }
    
    $affected = $deleteStmt->affected_rows;
    $deleteStmt->close();
    
    if ($affected === 0) {
        throw new Exception(
            'No rows were updated. Account may already be deleted or ' .
            'user not found.'
        );
    }

    $verifyStmt = $conn->prepare(
        "SELECT `deleted_account` FROM `user` WHERE `user_id`=?"
    );
    $verifyStmt->bind_param("i", $user_id);
    
    if (!$verifyStmt->execute()) {
        throw new Exception('Failed to verify deletion: ' . 
                          $verifyStmt->error);
    }
    
    $verifyStmt->bind_result($deleted_status);
    $verifyStmt->fetch();
    $verifyStmt->close();
    
    if ($deleted_status != 1) {
        throw new Exception(
            'Account deletion verification failed - ' .
            'deleted_account is not set to 1'
        );
    }

    session_unset();
    session_destroy();
}

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
    <link rel="stylesheet" href="../style/home.css" />
    <link rel="stylesheet" href="../style/settings.css" />
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
            
            <div class="notification-panel" id="notification_panel">
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
            <div id="personal_details">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="new_username" placeholder="@example" 
                           value="<?php echo htmlspecialchars(
                               $userData['username'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>First Name</label>
                    <input type="text" id="new_first_name" 
                           placeholder="First name" 
                           value="<?php echo htmlspecialchars(
                               $userData['first_name'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>Middle Name</label>
                    <input type="text" id="new_middle_name" 
                           placeholder="Middle name" 
                           value="<?php echo htmlspecialchars(
                               $userData['middle_name'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" id="new_last_name" 
                           placeholder="Last name" 
                           value="<?php echo htmlspecialchars(
                               $userData['last_name'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>Birthday</label>
                    <input type="date" id="new_birthday" 
                           value="<?php echo htmlspecialchars(
                               $userData['birthday'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="new_country" placeholder="Country" 
                           value="<?php echo htmlspecialchars(
                               $userData['country'] ?? ''
                           ); ?>">
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="new_city" placeholder="City" 
                           value="<?php echo htmlspecialchars(
                               $userData['city'] ?? ''
                           ); ?>">
                </div>

                <button type="button" class="save-btn" 
                            disabled>
                        Save
                </button>
            </div>

            <div id="password" hidden>
                <form id="password_form" onsubmit="updatePassword(event)">
                    <div class="form-group">
                        <label>Current Password</label>
                        <input type="password" id="current_password" required>
                        <button type="button" class="toggle-btn" 
                                onclick="togglePassword('current_password', this)">
                            Show
                        </button>
                    </div>

                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="new_password" 
                               oninput="validatePassword()" 
                               onfocus="showRules()" required>
                        <button type="button" class="toggle-btn" 
                                onclick="togglePassword('new_password', this)">
                            Show
                        </button>
                    </div>

                    <ul id="rules" class="rules" style="display:none;">
                        <li id="length" class="invalid">Minimum 8 characters</li>
                        <li id="number" class="invalid">At least one number</li>
                        <li id="uppercase" class="invalid">
                            At least one uppercase letter
                        </li>
                        <li id="lowercase" class="invalid">
                            At least one lowercase letter
                        </li>
                    </ul>

                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirm_password" 
                               oninput="validatePassword()" required>
                        <button type="button" class="toggle-btn" 
                                onclick="togglePassword('confirm_password', this)">
                            Show
                        </button>
                    </div>

                    <button type="submit" id="reset_btn" class="save-btn" 
                            disabled>
                        Save
                    </button>
                </form>
            </div>

            <div id="delete_account" hidden>
                <h3>Delete account?</h3>
                <p>
                    If you delete your account, all data will be deleted 
                    and you will be logged out immediately.
                </p>
                <div class="button-holder">
                    <button class="cancel-btn" onclick="cancelDelete()">
                        Cancel
                    </button>
                    <button class="delete-btn" id="confirm_delete_btn" 
                            onclick="confirmDelete()">
                        Delete
                    </button>
                </div>
            </div>

            <div id="popup_overlay" class="popup-overlay" 
                 onclick="closePopup()">
                <div class="popup-content" onclick="event.stopPropagation()">
                    <span class="close-btn" onclick="closePopup()">&times;</span>
                    <h3 id="popup_title">Message</h3>
                    <p id="popup_message">Your message here</p>
                    <div class="popup-buttons">
                        <button id="popup_ok_btn" onclick="closePopup()">
                            OK
                        </button>
                        <button id="popup_cancel_btn" onclick="closePopup()" 
                                style="display:none;">
                            Cancel
                        </button>
                        <button id="popup_confirm_btn" 
                                onclick="executePopupAction()" 
                                style="display:none;">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="../script/settings.js"></script>
</body>
</html>
<?php } ?>

<?php
if (isset($conn)) {
    $conn->close();
}
?>