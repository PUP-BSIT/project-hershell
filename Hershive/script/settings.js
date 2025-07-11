let currentUser = null;
let popupAction = null;
let originalValues = {};

const getElement = (id) => document.getElementById(id);
const getElements = (selector) => document.querySelectorAll(selector);

function togglePersonalDetails() {
  localStorage.setItem('settingsTab', 'personal');

  setElementVisibility({
    personal_details: false,
    password: true,
    delete_account: true
  });

  setActiveButton('personal_details_btn', [
    'password_btn',
    'delete_button'
  ]);

  const passwordForm = document.getElementById('password_form');
  if (passwordForm) passwordForm.reset();
}

function togglePasswordReset() {
  localStorage.setItem('settingsTab', 'password');

  setElementVisibility({
    personal_details: true,
    password: false,
    delete_account: true
  });

  setActiveButton('password_btn', [
    'personal_details_btn',
    'delete_button'
  ]);

  const passwordForm = document.getElementById('password_form');
  if (passwordForm) passwordForm.reset();
}

function setElementVisibility(elements) {
  Object.entries(elements).forEach(([id, hidden]) => {
    const element = getElement(id);
    if (element) {
      if (hidden) {
        element.hidden = true;
        element.classList.add('hidden');
      } else {
        element.hidden = false;
        element.classList.remove('hidden');
      }
    }
  });
}

function setActiveButton(activeId, inactiveIds) {
  const activeElement = getElement(activeId);
  if (activeElement) {
    activeElement.classList.add('active');
    activeElement.classList.remove('inactive');
  }
  
  inactiveIds.forEach(id => {
    const element = getElement(id);
    if (element) {
      element.classList.remove('active');
      element.classList.add('inactive');
    }
  });
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
        validatePassword();
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
  const activeTab = localStorage.getItem('settingsTab') || 'personal';

  if (activeTab === 'password') {
    togglePasswordReset();
  } else if (activeTab === 'delete') {
    confirmDelete();
  } else {
    togglePersonalDetails();
  }

  const fields = ['name', 'username', 'location'];
  fields.forEach(field => {
    updateCharacterCounts(field);
  });

  const popupOkBtn = getElement('popup_ok_btn');
  const popupCancelBtn = getElement('popup_cancel_btn');
  const popupConfirmBtn = getElement('popup_confirm_btn');

  if (popupOkBtn) {
    popupOkBtn.addEventListener('click', closePopup);
  }

  if (popupCancelBtn) {
    popupCancelBtn.addEventListener('click', closePopup);
  }

  if (popupConfirmBtn) {
    popupConfirmBtn.addEventListener('click', executePopupAction);
  }

  const newPasswordInput = getElement('new_password');
  const confirmPasswordInput = getElement('confirm_password');

  if (newPasswordInput) {
    newPasswordInput.addEventListener('focus', showRules);
    newPasswordInput.addEventListener('blur', hideRules);
  }
});

function enableSaveButton() {
  const saveBtn = document.getElementById('save_personal_btn');
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
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('../html/login.html');
}

function cancelDelete() {
  setElementVisibility({
    personal_details: true,
    password: true,
    delete_account: false
  });

  setActiveButton('delete_button', [
    'personal_details_btn',
    'password_btn'
  ]);

  closeDeletePasswordModal();
}

function toggleDropdown() {
  const dropdown = getElement('menu_dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

function toggleLogout() {
  const overlay = document.getElementById('logout_overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideLogout() {
  const overlay = document.getElementById('logout_overlay');
  if (overlay) overlay.classList.add('hidden');
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
  const input = document.getElementById(inputId);
  if (!input || !btn) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btn.querySelector('img');
  if (icon) {
    icon.src = isPassword 
      ? '../assets/eye_open.png' 
      : '../assets/eye_closed.png';
  }
}

function showRules() {
  const rules = document.getElementById("settings_rules");
  if (rules) rules.classList.add("active");
}

function hideRules() {
  setTimeout(() => {
    const rules = document.getElementById("settings_rules");
    const active = document.activeElement;
    const newPasswordInput = document.getElementById("new_password");

    if (rules && newPasswordInput && active !== newPasswordInput) {
      rules.classList.remove("active");
    }
  }, 50);
}

function validatePassword() {
  const newPass = document.getElementById("new_password")?.value || '';
  const confirmPassInput = document.getElementById("confirm_password");
  const confirmPass = confirmPassInput?.value || '';

  const rules = {
    length: newPass.length >= 8,
    number: /\d/.test(newPass),
    uppercase: /[A-Z]/.test(newPass),
    lowercase: /[a-z]/.test(newPass),
  };

  const ruleMap = {
    length: "settings_length",
    number: "settings_number",
    uppercase: "settings_uppercase",
    lowercase: "settings_lowercase"
  };

  let allValid = true;

  Object.entries(rules).forEach(([rule, isValid]) => {
    const element = document.getElementById(ruleMap[rule]);
    if (element) {
      element.className = isValid ? "valid" : "invalid";
    }
    if (!isValid) allValid = false;
  });

  const matchWarning = document.getElementById("settings_match_warning");
  const hasTypedConfirm = confirmPass.length > 0;
  const match = newPass === confirmPass;

  if (matchWarning) {
    matchWarning.classList.toggle("hidden", match || !hasTypedConfirm);
  }

  const resetBtn = document.getElementById("reset_btn");
  if (resetBtn) {
    resetBtn.disabled = !(allValid && match);
  }
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
    panel.classList.toggle("hidden");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const panel = getElement("notification_panel");
  if (panel && !panel.classList.contains("hidden")) {
    panel.classList.add("hidden");
  }
});

function menuToggleDropdown() {
  const dropdown = getElement("menu_dropdown");
  if (dropdown) dropdown.classList.toggle("hidden");
}

function showPopup(title, message, type = 'info', callback = null) {
  getElement('popup_title').textContent = title;
  getElement('popup_message').textContent = message;

  const buttons = {
    ok: getElement('popup_ok_btn'),
    cancel: getElement('popup_cancel_btn'),
    confirm: getElement('popup_confirm_btn')
  };

  buttons.ok.classList.remove('hidden');
  buttons.cancel.classList.add('hidden');
  buttons.confirm.classList.add('hidden');

  if (type === 'confirm') {
    buttons.ok.classList.add('hidden');
    buttons.cancel.classList.remove('hidden');
    buttons.confirm.classList.remove('hidden');
  }

  popupAction = callback;
  getElement('popup_overlay').classList.remove('hidden');
}

function closePopup() {
  getElement('popup_overlay').classList.add('hidden');
  popupAction = null;
}

function executePopupAction() {
  if (popupAction) {
    popupAction();
  }
  closePopup();
}

function showEditForm(field) {
  document.getElementById('personal_details_view').classList.add('hidden');
  document.getElementById(`edit_${field}`).classList.remove('hidden');

  storeOriginalValues(field);
  updateCharacterCounts(field);
  validateField(field);
}

function hideEditForm(field) {
  document.getElementById(`edit_${field}`).classList.add('hidden');
  document.getElementById('personal_details_view').classList.remove('hidden');

  resetFormValues(field);
}

function storeOriginalValues(field) {
  switch(field) {
    case 'name':
      originalValues.name = {
        first_name: document.getElementById('edit_first_name').value,
        middle_name: document.getElementById('edit_middle_name').value,
        last_name: document.getElementById('edit_last_name').value
      };
      break;
    case 'username':
      originalValues.username = document.getElementById(
        'edit_username_input'
      ).value;
      break;
    case 'birth':
      originalValues.birth = document.getElementById('edit_birthday').value;
      break;
    case 'location':
      originalValues.location = {
        country: document.getElementById('edit_country').value,
        city: document.getElementById('edit_city').value
      };
      break;
  }
}

function resetFormValues(field) {
  switch(field) {
    case 'name':
      if (originalValues.name) {
        document.getElementById('edit_first_name').value =
          originalValues.name.first_name;
        document.getElementById('edit_middle_name').value =
          originalValues.name.middle_name;
        document.getElementById('edit_last_name').value =
          originalValues.name.last_name;
      }
      break;
    case 'username':
      if (originalValues.username !== undefined) {
        document.getElementById('edit_username_input').value =
          originalValues.username;
      }
      break;
    case 'birth':
      if (originalValues.birth !== undefined) {
        document.getElementById('edit_birthday').value =
          originalValues.birth;
      }
      break;
    case 'location':
      if (originalValues.location) {
        document.getElementById('edit_country').value =
          originalValues.location.country;
        document.getElementById('edit_city').value =
          originalValues.location.city;
      }
      break;
  }
  updateCharacterCounts(field);
}

function validateField(field) {
  let isValid = false;
  let hasChanges = false;

  switch(field) {
    case 'name':
      const firstName = document.getElementById('edit_first_name')
        .value.trim();
      const middleName = document.getElementById('edit_middle_name')
        .value.trim();
      const lastName = document.getElementById('edit_last_name')
        .value.trim();

      isValid = firstName.length > 0 && lastName.length > 0;

      if (originalValues.name) {
        hasChanges = firstName !== originalValues.name.first_name.trim() ||
                    middleName !== originalValues.name.middle_name.trim() ||
                    lastName !== originalValues.name.last_name.trim();
      }
      break;

    case 'username':
      const username = document.getElementById('edit_username_input')
        .value.trim();
      isValid = username.length > 0;

      if (originalValues.username !== undefined) {
        hasChanges = username !== originalValues.username.trim();
      }
      break;

    case 'birth':
      const birthday = document.getElementById('edit_birthday').value;
      isValid = true;

      if (originalValues.birth !== undefined) {
        hasChanges = birthday !== originalValues.birth;
      }
      break;

    case 'location':
      const country = document.getElementById('edit_country').value.trim();
      const city = document.getElementById('edit_city').value.trim();
      isValid = true;

      if (originalValues.location) {
        hasChanges = country !== originalValues.location.country.trim() ||
                    city !== originalValues.location.city.trim();
      }
      break;
  }

  const saveBtn = document.querySelector(`#edit_${field} .save-btn-header`);
  if (saveBtn) {
    saveBtn.disabled = !(isValid && hasChanges);
  }

  updateCharacterCounts(field);
}

function updateCharacterCounts(field) {
  const updateCount = (inputId, countId, max) => {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(countId);
    if (input && counter) {
      const length = input.value.length;
      counter.textContent = `${length}/${max}`;
      counter.style.color = length > max * 0.9 ? '#ff6b6b' : '#666';
    }
  };
  
  switch(field) {
    case 'username':
      updateCount('edit_username_input', 'username_count', 30);
      break;
  }
}

function saveField(field) {
  const saveBtn = document.querySelector(`#edit_${field} .save-btn-header`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  const data = { action: 'update_personal_details' };

  switch (field) {
    case 'name':
      data.first_name = document.getElementById('edit_first_name')?.value.trim() || '';
      data.middle_name = document.getElementById('edit_middle_name')?.value.trim() || '';
      data.last_name = document.getElementById('edit_last_name')?.value.trim() || '';
      break;
    case 'username':
      data.username = document.getElementById('edit_username_input')?.value.trim() || '';
      break;
    case 'birth':
      data.birthday = document.getElementById('edit_birthday')?.value || '';
      break;
    case 'location':
      data.country = document.getElementById('edit_country')?.value.trim() || '';
      data.city = document.getElementById('edit_city')?.value.trim() || '';
      break;
  }

  makeApiRequest('settings.php', data)
    .then(res => {
      if (res.status === 'success') {
        updateDisplay(field);
        storeOriginalValues(field);
        hideEditForm(field);
        showPopup('Success', 'Information updated successfully', 'success');
      } else {
        showPopup('Error', res.message, 'error');
      }
    })
    .catch(err => {
      showPopup('Error', `An error occurred: ${err.message}`, 'error');
    })
    .finally(() => {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
}


function updateDisplay(field) {
  switch(field) {
    case 'name':
      const firstName = document.getElementById('edit_first_name').value;
      const lastName = document.getElementById('edit_last_name').value;
      const middleName = document.getElementById('edit_middle_name').value.trim();
      document.getElementById('name_display').textContent =
        middleName
          ? `${firstName} ${middleName} ${lastName}`
          : `${firstName} ${lastName}`;
      break;
    case 'username':
      const username = document.getElementById('edit_username_input').value;
      document.getElementById('username_display').textContent = 
        `@${username}`;
      break;
    case 'birth':
      const birthday = document.getElementById('edit_birthday').value;
      document.getElementById('birth_display').textContent = birthday;
      break;
    case 'location':
      const country = document.getElementById('edit_country').value;
      const city = document.getElementById('edit_city').value;
      document.getElementById('location_display').textContent = 
        `${country}, ${city}`;
      break;
  }
}

function confirmDelete() {
  localStorage.setItem('settingsTab', 'delete');

  setElementVisibility({
    personal_details: true,
    password: true,
    delete_account: false
  });

  setActiveButton('delete_button', [
    'personal_details_btn',
    'password_btn'
  ]);
}

function showDeletePasswordModal() {
  document.getElementById('delete_acount_modal').classList.remove('hidden');
  document.getElementById('delete_confirm_password').focus();
}

function closeDeletePasswordModal() {
  document.getElementById('delete_acount_modal').classList.add('hidden');
  document.getElementById('delete_confirm_password').value = '';
}

function confirmAccountDeletion() {
  const password = document.getElementById('delete_confirm_password')
    .value.trim();
  
  if (!password) {
    showPopup('Password Required', 
      'Please enter your password to confirm deletion.', 'error');
    return;
  }

  const confirmMessage = 'Are you absolutely sure you want to delete your ' +
    'account? This action cannot be undone and all your data will be ' +
    'permanently lost.';
  
  showPopup(
    'Final Confirmation',
    confirmMessage,
    'confirm',
    () => executeAccountDeletion(password)
  );
}

function executeAccountDeletion(password) {
  const deleteBtn = document.querySelector('.delete-modal .delete-btn');
  const originalText = deleteBtn.textContent;

  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  const formData = new URLSearchParams();
  formData.append('action', 'delete_account');
  formData.append('confirm_password', password);

  fetch('settings.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData,
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  })
  .then(data => {
    closeDeletePasswordModal();

    if (data.status === 'success') {
      showPopup(
        'Account Deleted',
        'Your account has been successfully deleted. You will now be redirected to the login page.',
        'success',
        () => {
          clearStorageAndRedirect();
        }
      );

      setTimeout(() => {
        clearStorageAndRedirect();
      }, 3000);
    } else {
      showPopup('Error', data.message || 'Failed to delete account.', 'error');
    }
  })
  .catch(error => {
    console.error('Delete account error:', error);
    showPopup(
      'Error',
      'An error occurred while deleting your account. Please try again.',
      'error'
    );
  })
  .finally(() => {
    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
  });
}