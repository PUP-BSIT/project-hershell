const passwordInput = document.getElementById('new_password');
const confirmPassword = document.getElementById('confirm_password');
const resetBtn = document.getElementById('reset_btn');
const rulesList = document.getElementById('rules');

const rules = {
  length: document.getElementById('length'),
  number: document.getElementById('number'),
  uppercase: document.getElementById('uppercase'),
  lowercase: document.getElementById('lowercase')
};

function validatePassword() {
  const password = passwordInput.value;
  rulesList.classList.add('active');

  const validations = {
    length: password.length >= 8,
    number: /\d/.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password)
  };

  let allValid = true;
  for (const rule in validations) {
    if (validations[rule]) {
      rules[rule].classList.remove('invalid');
      rules[rule].classList.add('valid');
    } else {
      rules[rule].classList.add('invalid');
      rules[rule].classList.remove('valid');
      allValid = false;
    }
  }

  resetBtn.disabled = !allValid;
}

function hideRules() {
  rulesList.classList.remove('active');
}

function togglePassword(fieldId, btnId) {
  const field = document.getElementById(fieldId);
  const button = document.getElementById(btnId);

  if (field.type === 'password') {
    field.type = 'text';
    button.textContent = 'Hide';
  } else {
    field.type = 'password';
    button.textContent = 'Show';
  }
}

function resetPassword() {
  const password = passwordInput.value;
  const confirm = confirmPassword.value;

  if (password !== confirm) {
    alert("Passwords do not match. Please re-enter.");
    return;
  }

  window.location.href = "../html/login.html";
}