function handleForgot() {
  const email = document.getElementById('email').value;
  if (!email) {
    alert('Please enter your email address.');
  } else {
    window.location.href = "../html/email_sent.html";
    // API call.
  }
}