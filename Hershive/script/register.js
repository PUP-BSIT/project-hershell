function toggleVisibility(id, btn) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
}

function showResponse(message, type) {
  const responseDiv = document.getElementById("response");
  responseDiv.className = `message ${type}`;
  responseDiv.innerHTML = message;
};