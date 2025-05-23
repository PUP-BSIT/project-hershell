function validateForm() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Validation credentials with database
  // Temporary validation
  if (!username || !password) {
    alert("Please fill in both fields.");
    return false;
  }

  window.location.href = "../html/home.html";
  return false;
}
