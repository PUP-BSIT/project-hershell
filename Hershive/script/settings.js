const personalDetailsButton = document.getElementById('personal_details_btn');
const passwordResetSectionButton = document.getElementById('password_btn');
const passwordResetSection = document.getElementById('password');
const personalDetailsSection = document.getElementById('personal_details');
const deleteAccountSection = document.getElementById('delete_account');

function saveChanges() {
    alert("Changes saved!");
}

function togglePasswordReset() {
  passwordResetSectionButton.classList.replace('inactive', 'active');
  personalDetailsButton.classList.replace('active', 'inactive');
  passwordResetSection.hidden = false;
  personalDetailsSection.hidden = true;
}

function togglePersonalDetails() {
  personalDetailsButton.classList.replace('inactive', 'active');
  passwordResetSectionButton.classList.replace('active', 'inactive');
  personalDetailsSection.hidden = false;
  passwordResetSection.hidden = true;
}

function updatePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("current_password").value;
  const newPassword = document.getElementById("new_password").value;
  const confirmPassword = document.getElementById("confirm_password").value;

  const storedPassword = "DemoPassword1"; // Simulated backend password

  if (currentPassword !== storedPassword) {
    alert("Current password is incorrect.");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("New password and confirmation do not match.");
    return;
  }

  alert("Password updated successfully!");
  document.getElementById("password_form").reset();
  document.getElementById("reset_btn").disabled = true;
  // Proceed to send update to backend
}

function deleteAccount() {
  deleteAccountSection.hidden = false;
}

function cancelDelete() {
  deleteAccountSection.hidden = true;
}

function confirmDelete() {
  alert("Account deleted successfully.");
  deleteAccountSection.hidden = true;
}