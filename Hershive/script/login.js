if (body.success) {
  console.log("Login success — redirecting to home.html");
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("username", username);
  window.location.href = "../html/home.html";
}

function validateForm() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("error");

  if (!username || !password) {
    errorBox.textContent = "Please enter both fields.";
    return false;
  }

  fetch("../php/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(body => {
      if (body.success) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", username);
        window.location.href = "../html/home.html";
      } else {
        errorBox.textContent = body.error || "Login failed.";
      }
    })
    .catch(err => {
      errorBox.textContent = "Something went wrong.";
      console.error(err);
    });

  return false;
}