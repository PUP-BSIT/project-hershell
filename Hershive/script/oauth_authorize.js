const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
let isPasswordVisible = false;

togglePassword.addEventListener('click', function () {
  isPasswordVisible = !isPasswordVisible;
  passwordInput.type = isPasswordVisible ? 'text' : 'password';
  togglePassword.src = isPasswordVisible ? '../assets/eye_open.png' : '../assets/eye_closed.png';
  togglePassword.alt = isPasswordVisible ? 'Hide Password' : 'Show Password';
});