let currentUser = null;
let popupAction = null;

const getElement = (id) => document.getElementById(id);
const getElements = (selector) => document.querySelectorAll(selector);

function togglePersonalDetails() {
  setElementVisibility({
    personal_details: false,
    password: true,
    delete_account: true
  });
  
  setActiveButton('personal_details_btn', [
    'password_btn',
    'delete_button'
  ]);
}

function togglePasswordReset() {
  setElementVisibility({
    personal_details: true,
    password: false,
    delete_account: true
  });
  
  setActiveButton('password_btn', [
    'personal_details_btn',
    'delete_button'
  ]);
}

function setElementVisibility(elements) {
  Object.entries(elements).forEach(([id, hidden]) => {
    const element = getElement(id);
    if (element) element.hidden = hidden;
  });
}

function setActiveButton(activeId, inactiveIds) {
  const activeElement = getElement(activeId);
  if (activeElement) activeElement.classList.add('active');
  
  inactiveIds.forEach(id => {
    const element = getElement(id);
    if (element) element.classList.remove('active');
  });
}

function savePersonalDetails() {
  const data = {
    action: 'update_personal_details',
    username: getElement('new_username')?.value || '',
    first_name: getElement('new_first_name')?.value || '',
    middle_name: getElement('new_middle_name')?.value || '',
    last_name: getElement('new_last_name')?.value || '',
    birthday: getElement('new_birthday')?.value || '',
    country: getElement('new_country')?.value || '',
    city: getElement('new_city')?.value || ''
  };

  makeApiRequest('settings.php', data)
    .then(res => {
      const isUsernameError = res.field === 'username' && 
                              res.status === 'error';
      const title = isUsernameError ? 'Username Error' : 'Personal Details';
      showPopup(title, res.message, res.status);
    })
    .catch(err => showPopup('Error', 
           `An error occurred: ${err.message}`, 'error'));
}

function updatePassword(e) {
  e.preventDefault();

  const passwords = {
    current: getElement('current_password')?.value || '',
    new: getElement('new_password')?.value || '',
    confirm: getElement('confirm_password')?.value || ''
  };

  if (passwords.new !== passwords.confirm) {
    showPopup('Password Error', 'New passwords do not match.', 'error');
    return;
  }

  const data = {
    action: 'update_password',
    current_password: passwords.current,
    new_password: passwords.new
  };

  makeApiRequest('settings.php', data)
    .then(res => {
      showPopup('Password Update', res.message, res.status);
      if (res.status === 'success') {
        const form = getElement('password_form');
        if (form) form.reset();
      }
    })
    .catch(err => showPopup('Error', 
           `An error occurred: ${err.message}`, 'error'));
}

document.addEventListener('click', function(event) {
  const menuDropdown = getElement('menu_dropdown');
  const menuButton = document.querySelector('.menu-button');
  
  if (menuDropdown && menuButton && 
      !menuDropdown.contains(event.target) && 
      !menuButton.contains(event.target)) {
    menuDropdown.classList.add('hidden');
  }
  
  const notificationPanel = getElement('notification_panel');
  const notificationButton = document.querySelector(
    '.navigation-icons button[onclick="toggleNotificationPanel()"]'
  );
  
  const panelVisible = notificationPanel && 
                       notificationPanel.style.display === 'block';
  const clickedOutside = !notificationPanel.contains(event.target) && 
                         (!notificationButton || 
                          !notificationButton.contains(event.target));
  
  if (panelVisible && clickedOutside) {
    notificationPanel.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const saveBtn = getElement('personal_details')?.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.addEventListener('click', savePersonalDetails);
  }
  
  const personalDetailsInputs = [
    'new_username', 'new_first_name', 'new_middle_name', 
    'new_last_name', 'new_birthday', 'new_country', 'new_city'
  ];
  
  personalDetailsInputs.forEach(inputId => {
    const input = getElement(inputId);
    if (input) {
      input.addEventListener('input', enableSaveButton);
      input.addEventListener('change', enableSaveButton);
    }
  });
});

function enableSaveButton() {
  const saveBtn = getElement('personal_details')?.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
  }
}

async function makeApiRequest(url, data) {
  const formData = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData,
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server did not return JSON response');
  }

  return response.json();
}

function confirmDelete() {
  const message = 'Are you sure you want to delete your account? ' +
                  'This action cannot be undone. ';

  showPopup('Delete Account', message, 'confirm', executeAccountDeletion);
}

function executeAccountDeletion() {
  const deleteBtn = getElement('confirm_delete_btn');
  if (!deleteBtn) return;

  const originalText = deleteBtn.textContent;
  setButtonLoadingState(deleteBtn, 'Deleting...', true);

  const formData = new URLSearchParams();
  formData.append('action', 'delete_account');

  fetch('settings.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData,
    credentials: 'same-origin'
  })
  .then(response => validateResponse(response))
  .then(data => handleDeleteResponse(data, deleteBtn, originalText))
  .catch(error => handleDeleteError(error, deleteBtn, originalText));
}

function validateResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return response.text().then(() => {
      throw new Error('Server did not return JSON response');
    });
  }
  
  return response.json();
}

function handleDeleteResponse(data, deleteBtn, originalText) {
  if (data.status === 'success') {
    const message = 'Your account has been successfully deleted. ' +
                    'You will now be redirected to the login page.';
    showPopup('Account Deleted', message, 'success', () => {
      clearStorageAndRedirect();
    });
  } else {
    const errorMsg = data.message || 'Unknown error';
    showPopup('Delete Error', `Failed to delete account: ${errorMsg}`, 
              'error');
    setButtonLoadingState(deleteBtn, originalText, false);
  }
}

function handleDeleteError(error, deleteBtn, originalText) {
  const message = 'An error occurred while deleting your account. ' +
                  'Please try again or contact support.';
  showPopup('Error', message, 'error');
  setButtonLoadingState(deleteBtn, originalText, false);
}

function setButtonLoadingState(button, text, loading) {
  if (!button) return;
  
  button.disabled = loading;
  button.textContent = text;
  button.style.opacity = loading ? '0.6' : '1';
}

function clearStorageAndRedirect() {
  if (typeof(Storage) !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
  }
  window.location.replace('../html/login.html');
}

function cancelDelete() {
  getElement("delete_account").hidden = true;
  togglePersonalDetails();
}

function toggleDropdown() {
  const dropdown = getElement('menu_dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

function toggleLogout() {
  const logoutElement = getElement('logout');
  if (logoutElement) logoutElement.hidden = false;
}

function hideLogout() {
  const logoutElement = getElement('logout');
  if (logoutElement) logoutElement.hidden = true;
}

function logout() {
  fetch('../php/logout.php', { method: 'POST' })
    .then(() => redirectToLogin())
    .catch(() => redirectToLogin());
}

function redirectToLogin() {
  window.location.href = '../html/login.html';
}

function goHome() {
  window.location.href = '../html/home.html';
}

function togglePassword(inputId, btn) {
  const input = getElement(inputId);
  if (!input || !btn) return;
  
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? 'Hide' : 'Show';
}

function showRules() {
  const rules = getElement("rules");
  if (rules) rules.style.display = "block";
}

function hideRules() {
  setTimeout(() => {
    const rules = getElement("rules");
    if (rules) rules.style.display = "none";
  }, 300);
}

function validatePassword() {
  const newPass = getElement("new_password")?.value || '';
  const confirmPass = getElement("confirm_password")?.value || '';
  
  const rules = {
    length: newPass.length >= 8,
    number: /\d/.test(newPass),
    uppercase: /[A-Z]/.test(newPass),
    lowercase: /[a-z]/.test(newPass),
  };

  let valid = true;
  Object.entries(rules).forEach(([rule, isValid]) => {
    const element = getElement(rule);
    if (element) {
      element.className = isValid ? "valid" : "invalid";
    }
    if (!isValid) valid = false;
  });

  const match = newPass === confirmPass;
  const resetBtn = getElement("reset_btn");
  if (resetBtn) resetBtn.disabled = !(valid && match);
}

function checkUserSession() {
  fetch("../php/home.php")
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.username;
      } else {
        redirectToLogin();
      }
    })
    .catch(() => redirectToLogin());
}

function toggleNotificationPanel() {
  const panel = getElement("notification_panel");
  if (panel) {
    const isVisible = panel.style.display === "block";
    panel.style.display = isVisible ? "none" : "block";
  }
}

function menuToggleDropdown() {
  const dropdown = getElement("menu_dropdown");
  if (dropdown) dropdown.classList.toggle("hidden");
}

function showPopup(title, message, type = 'info', callback = null) {
  const titleElement = getElement('popup_title');
  const messageElement = getElement('popup_message');
  
  if (titleElement) titleElement.textContent = title;
  if (messageElement) messageElement.textContent = message;
  
  const buttons = {
    ok: getElement('popup_ok_btn'),
    cancel: getElement('popup_cancel_btn'),
    confirm: getElement('popup_confirm_btn')
  };
  
  if (buttons.ok) buttons.ok.style.display = 'inline-block';
  if (buttons.cancel) buttons.cancel.style.display = 'none';
  if (buttons.confirm) buttons.confirm.style.display = 'none';
  
  if (type === 'confirm') {
    if (buttons.ok) buttons.ok.style.display = 'none';
    if (buttons.cancel) buttons.cancel.style.display = 'inline-block';
    if (buttons.confirm) buttons.confirm.style.display = 'inline-block';
  }
  
  popupAction = callback;
  
  const overlay = getElement('popup_overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closePopup() {
  const overlay = getElement('popup_overlay');
  if (overlay) overlay.style.display = 'none';
  popupAction = null;
}

function executePopupAction() {
  if (popupAction) {
    popupAction();
  }
  closePopup();
}

document.addEventListener('click', function(event) {
  const menuDropdown = getElement('menu_dropdown');
  const menuButton = document.querySelector('.menu-button');
  
  if (menuDropdown && menuButton && 
      !menuDropdown.contains(event.target) && 
      !menuButton.contains(event.target)) {
    menuDropdown.classList.add('hidden');
  }
  
  const notificationPanel = getElement('notification_panel');
  const notificationButton = document.querySelector(
    '.navigation-icons button[onclick="toggleNotificationPanel()"]'
  );
  
  const panelVisible = notificationPanel && 
                       notificationPanel.style.display === 'block';
  const clickedOutside = !notificationPanel.contains(event.target) && 
                         (!notificationButton || 
                          !notificationButton.contains(event.target));
  
  if (panelVisible && clickedOutside) {
    notificationPanel.style.display = 'none';
  }
});