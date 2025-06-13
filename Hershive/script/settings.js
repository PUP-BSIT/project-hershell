function togglePersonalDetails() {
  document.getElementById("personal_details").hidden = false;
  document.getElementById("password").hidden = true;
  document.getElementById("delete_account").hidden = true;

  document.getElementById("personal_details_btn").classList.add("active");
  document.getElementById("password_btn").classList.remove("active");
}

function togglePasswordReset() {
  document.getElementById("personal_details").hidden = true;
  document.getElementById("password").hidden = false;
  document.getElementById("delete_account").hidden = true;

  document.getElementById("personal_details_btn").classList.remove("active");
  document.getElementById("password_btn").classList.add("active");
}

function savePersonalDetails() {
  const data = {
    action: 'update_personal_details',
    email: document.getElementById('new_email').value,
    username: document.getElementById('new_username').value,
    first_name: document.getElementById('new_first_name').value,
    middle_name: document.getElementById('new_middle_name').value,
    last_name: document.getElementById('new_last_name').value,
    birthday: document.getElementById('new_birthday').value,
    gender: document.getElementById('gender').value
  };

  fetch('settings.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams(data)
  })
  .then(res => res.json())
  .then(res => alert(res.message))
  .catch(err => alert('Error: ' + err.message));
}

function updatePassword(e) {
  e.preventDefault();

  const current = document.getElementById('current_password').value;
  const newPass = document.getElementById('new_password').value;
  const confirm = document.getElementById('confirm_password').value;

  if (newPass !== confirm) {
    alert("New passwords do not match.");
    return;
  }

  const data = {
    action: 'update_password',
    current_password: current,
    new_password: newPass
  };

  fetch('settings.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams(data)
  })
  .then(res => res.json())
  .then(res => {
    alert(res.message);
    if (res.status === 'success') {
      document.getElementById('password_form').reset();
    }
  })
  .catch(err => alert('An error occurred: ' + err.message));
}

function deleteAccount() {
  document.getElementById("delete_account").hidden = false;
  document.getElementById("personal_details").hidden = true;
  document.getElementById("password").hidden = true;

  document.getElementById("personal_details_btn").classList.remove("active");
  document.getElementById("password_btn").classList.remove("active");
}

function confirmDelete() {
  if (!confirm("Are you sure you want to delete your account? This action cannot be undone and you will be logged out immediately.")) {
    return;
  }

  const deleteBtn = document.getElementById('confirm_delete_btn');
  const originalText = deleteBtn.textContent;
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';
  deleteBtn.style.opacity = '0.6';

  console.log('Starting account deletion process...');

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
  .then(response => {
    console.log('HTTP Response Status:', response.status);
    console.log('Response Headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return response.text().then(text => {
        console.log('Non-JSON Response:', text);
        throw new Error('Server did not return JSON response');
      });
    }

    return response.json();
  })
  .then(data => {
    console.log('Server Response Data:', data);

    if (data.status === 'success') {
      alert('Your account has been successfully deleted. You will now be redirected to the login page.');

      if (typeof(Storage) !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      window.location.replace('../html/login.html');

    } else {
      alert('Failed to delete account: ' + (data.message || 'Unknown error'));
      console.error('Account deletion failed:', data);

      deleteBtn.disabled = false;
      deleteBtn.textContent = originalText;
      deleteBtn.style.opacity = '1';
    }
  })
  .catch(error => {
    console.error('Error during account deletion:', error);
    alert('An error occurred while deleting your account. Please try again or contact support.');

    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
    deleteBtn.style.opacity = '1';
  });
}

function cancelDelete() {
  document.getElementById("delete_account").hidden = true;
  togglePersonalDetails();
}

function toggleDropdown() {
  const dropdown = document.getElementById('menu_dropdown');
  dropdown.classList.toggle('hidden');
}

function toggleLogout() {
  document.getElementById('logout').hidden = false;
}

function hideLogout() {
  document.getElementById('logout').hidden = true;
}

function logout() {
  fetch('../php/logout.php', {
    method: 'POST'
  })
  .then(() => {
    window.location.href = '../html/login.html';
  })
  .catch(() => {
    window.location.href = '../html/login.html';
  });
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? 'Hide' : 'Show';
}

function showRules() {
  document.getElementById("rules").style.display = "block";
}

function hideRules() {
  setTimeout(() => {
    document.getElementById("rules").style.display = "none";
  }, 300);
}

function validatePassword() {
  const newPass = document.getElementById("new_password").value;
  const confirmPass = document.getElementById("confirm_password").value;
  let valid = true;

  const rules = {
    length: newPass.length >= 8,
    number: /\d/.test(newPass),
    uppercase: /[A-Z]/.test(newPass),
    lowercase: /[a-z]/.test(newPass),
  };

  for (const rule in rules) {
    document.getElementById(rule).className = rules[rule] ? "valid" : "invalid";
    if (!rules[rule]) valid = false;
  }

  const match = newPass === confirmPass;
  document.getElementById("reset_btn").disabled = !(valid && match);
}

function goHome() {
  window.location.href = '../html/home.html';
}

let currentUser = null;
let allSearchedUsers = [];

function checkUserSession() {
  fetch("../php/home.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.username;
      } else {
        window.location.href = "../html/login.html";
      }
    })
    .catch(() => {
      window.location.href = "../html/login.html";
    });
}

document.addEventListener("DOMContentLoaded", function() {
  checkUserSession();
});

function performSearch() {
  const query = document.getElementById("search_input").value.trim();
  if (!query) return;

  fetch(`../php/search.php?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert(data.error || "Search failed");
        return;
      }

      sessionStorage.setItem('searchQuery', query);
      window.location.href = '../html/home.html';
    })
    .catch(err => {
      console.error("Search error:", err);
      alert("Search failed. See console for details.");
    });
}

document.addEventListener("DOMContentLoaded", function() {
  const searchInput = document.getElementById("search_input");
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        performSearch();
      }
    });
  }
});

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  if (panel) {
    panel.style.display = panel.style.display === "block" ? "none" : "block";
  }
}

function menuToggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  if (dropdown) dropdown.classList.toggle("hidden");
}