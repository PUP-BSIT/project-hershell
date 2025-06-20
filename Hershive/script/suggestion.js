loadSuggestedUsers();

function loadSuggestedUsers(limit = 100, page = 1) {
  fetch(`../php/get_suggestion.php?limit=${limit}&page=${page}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then((users) => {
      const container = document.getElementById("suggested_users_container");
      container.innerHTML = "";

      if (users.length === 0) {
        container.innerHTML = "<p>No suggestions available.</p>";
        return;
      }

      users.forEach((user) => {
        const div = document.createElement("div");
        div.className = "suggested-user";
        const fullName = `${user.first_name ?? ""} 
                          ${user.middle_name ?? ""} 
                          ${user.last_name ?? ""}`.trim();
        const profileImg = user.profile_picture_url 
                        ? user.profile_picture_url 
                        : "../assets/temporary_pfp.png";

        div.innerHTML = `
          <img src="${profileImg}" alt="${user.username}">
          <div class="user-info">
            <p><strong>${fullName}</strong></p>
            <p>@${user.username}</p>
          </div>
          <button onclick="toggleFollow(this)">Follow</button>
        `;

        container.appendChild(div);
      });
    })
    .catch((error) => {
      console.error("Error loading suggested users:", error);
    });
}

function toggleFollow(button) {
  const isFollowing = button.classList.contains("following");
  const action = isFollowing ? 'unfollow' : 'follow';

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Loading...';

  fetch('../php/follow.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: action,
      username: username
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      if (data.action === 'followed') {
        button.textContent = "Following";
        button.classList.add("following");
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
      }
      console.log(`${data.action} ${username}`);
    } else {
      alert(data.error || 'Failed to update follow status');
      button.textContent = originalText;
    }
  })
  .catch(error => {
    console.error('Error updating follow status:', error);
    alert('Network error occurred');
    button.textContent = originalText;
  })
  .finally(() => {
    button.disabled = false;
  });
}

function menuToggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  if (dropdown) dropdown.classList.toggle("hidden");
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  if (panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function hideLogout() {
  const logoutSection = document.getElementById("logout");
  if (logoutSection) logoutSection.hidden = true;
}

function toggleLogout() {
  const logoutSection = document.getElementById("logout");
  if (logoutSection) logoutSection.hidden = false;
}

function logout() {
  window.location.href = "../php/logout.php";
}