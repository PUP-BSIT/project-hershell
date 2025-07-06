let currentUser = null;
let clickedUserId = null;
let currentUserId = null;
let currentPage = 1;
const limitPerPage = 15;
let isLoading = false;
let noMoreData = false;

loadSuggestedUsers();
initializeTabs();

function loadSuggestedUsers() {
  if (isLoading || noMoreData) return;
  isLoading = true;

  fetch(`../php/get_suggestion.php?limit=${limitPerPage}&page=${currentPage}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      const container = document.getElementById("suggested_users_container");
      if (currentPage === 1) container.innerHTML = "";

      const users = data.users || [];

      if (users.length === 0) {
        if (currentPage === 1) {
          container.innerHTML = "<p>No suggestions available.</p>";
        }
        noMoreData = true;
        return;
      } else if (users.length < limitPerPage) {
        noMoreData = true;
      }

      users.forEach((user) => {
        const div = document.createElement("div");
        div.className = "suggested-user";
        div.setAttribute("data-user-id", user.user_id);
        div.addEventListener("click", handleUserClick);

        const fullName = `${user.first_name ?? ""} ${user.middle_name ?? ""} ${user.last_name ?? ""}`.trim();
        const profileImg = user.profile_picture_url 
            ? user.profile_picture_url 
            : "../assets/temporary_pfp.png";

        div.innerHTML = `
          <img src="${profileImg}" alt="${user.username}">
          <div class="user-info">
            <p><strong>${fullName}</strong></p>
            <p>@${user.username}</p>
          </div>
          <button class="follow-btn" data-user-id="${user.user_id}">Follow</button>
        `;

        const button = div.querySelector(".follow-btn");
        button.addEventListener("click", handleFollowClick);

        container.appendChild(div);
      });

      currentPage++;
      checkUrlParams();
    })
    .catch((error) => {
      console.error("Error loading suggested users:", error);
    })
    .finally(() => {
      isLoading = false;
    });
}

const suggestionContainer = document.querySelector(".left-contents");
suggestionContainer.addEventListener("scroll", () => {
  const { scrollTop, scrollHeight, clientHeight } = suggestionContainer;

  if (scrollTop + clientHeight >= scrollHeight - 300) {
    loadSuggestedUsers(limitPerPage, currentPage);
  }
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (userId) {
      const userElement = document.querySelector(`[data-user-id="${userId}"]`);
      if (userElement) {
        const syntheticEvent = {
            currentTarget: userElement
        };
        handleUserClick(syntheticEvent);
      } else {
        console.warn(`No user found with ID: ${userId}`);
      }

    }
}

function handleUserClick(event) {
  const div = event.currentTarget;
  const userId = div.getAttribute("data-user-id");
  clickedUserId = userId;

  fetch('../php/other_user_profile.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.error("Error from server:", data.error);
      return;
    }

    document.querySelector(".cover-img").src = data.background_picture_url;
    document.querySelector(".profile-img").src = data.profile_picture_url;
    document.querySelector(".profile-fullname").textContent = data.full_name;
    document.querySelector(".profile-username").textContent = "@" + data.username;
    document.querySelector(".profile-bio").textContent = data.bio;

    getClickedUserStats();

    currentUser = data.current_session_username;
    currentUserId = data.current_session_user_id;

    document.querySelector(".profile-card").classList.remove("hidden");
    document.querySelector(".right-contents h2").classList.add("hidden");

    clearTabContent();
    loadProfilePosts();
    loadFollowers();
    loadFollowing();
  })
  .catch(error => {
    console.error("Fetch error:", error);
  });
}

function clearTabContent() {
  document.querySelector("#post-container").innerHTML = "";
  document.querySelector("#followers-list").innerHTML = "";
  document.querySelector("#following-list").innerHTML = "";
}

function getClickedUserStats() {
  fetch(`../php/get_user_stats.php?user_id=${clickedUserId}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error(data.error);
        return;
      }
      document.getElementById('postCount').textContent = data.posts;
      document.getElementById('followerCount').textContent = data.followers;
      document.getElementById('followingCount').textContent = data.following;
    })
    .catch(error => {
      console.error("Failed to load user stats:", error);
    });
}

function closeUserProfile() {
  document.querySelector(".profile-card").classList.add("hidden");
  document.querySelector(".right-contents h2").classList.remove("hidden");
}

function handleFollowClick(event) {
  event.stopPropagation();
  const button = event.currentTarget;
  const userId = button.getAttribute("data-user-id");
  toggleFollow(button, userId);
}

function loadProfilePosts() {
  const profileUserId = clickedUserId;

  if (!profileUserId) {
    console.error("No user ID found in <span>.");
    return;
  }

  fetch(`../php/get-posts.php?user_id=${encodeURIComponent(profileUserId)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayPostsInContainer(data.posts);
      } else {
        console.error("Error loading posts:", data.error);
      }
    })
    .catch(error => console.error("Fetch error:", error));
}

function displayPostsInContainer(posts) {
  const container = document.getElementById("post-container");
  if (!container) {
    console.error("No #post-container found.");
    return;
  }
  posts.forEach(post => {
    const postElement = createPostElement(post);
    container.appendChild(postElement);
  });
}

function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "user-post";
  postDiv.dataset.postId = post.post_id;

  const isOwner = post.sharer_username === currentUser;
  const isShared = post.shared && post.original_post;

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
      <img src="${post.sharer_profile_pic || '../assets/temporary_pfp.png'}" class="profile-pic" alt="User" />
      <div class="post-info">
          <span class="username">${post.sharer_username}</span>
          <span class="timestamp">${post.formatted_time}</span>
        </div>
      </div>
      ${isOwner ? `
        <div class="more-option">
          <img src="../assets/more_icon.png"
              alt="more" onclick="toggleDropdown(this)">
          <div class="dropdown-menu">
            <button onclick="editPost(this)">Edit</button>
            <button onclick="deletePost(this)">Delete</button>
            <button onclick="cancelDropdown(this)">Cancel</button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="post-content">
      <div class="content">
        ${post.content ? `<p>${post.content}</p>` : ""}

        ${isShared ? `
          <div class="shared-post">
            <p class="shared-post-username">Originally posted by
                <strong>${post.original_post.username}</strong></p>
            <p>${post.original_post.content}</p>
            ${post.original_post.media_url ? 
              (post.original_post.media_type === 'video'
                ? `<video controls class="post-media"><source src="
                    ${post.original_post.media_url}" type="video/mp4"></video>`
                : `<img src="${post.original_post.media_url}"
                    class="post-media" alt="Shared Image">`): ""}
          </div>
        ` : `
          ${post.media_url ? 
            (post.media_type === 'video'
              ? `<video controls class="post-media"><source
                  src="${post.media_url}" type="video/mp4"></video>`
              : `<img src="${post.media_url}"
                  class="post-media" alt="Post Image">`)
            : ""}
        `}
      </div>

      <div class="post-actions">
        <div class="action-button">
          <button class="like-btn" onclick="toggleLike(this, ${post.post_id})">
            <img class="heart-icon outline ${post.user_liked ? 'hidden' : ''}"
                src="../assets/heart_icon.png">
            <img class="heart-icon filled ${post.user_liked ? '' : 'hidden'}"
                src="../assets/red_heart_icon.png">
          </button>
          <span class="like-count">${post.likes_count}</span>
        </div>

        <div class="action-button">
          <button class="comment-btn" onclick="toggleCommentModal
              (this.closest('.user-post'))">
            <img src="../assets/comment_icon.png" alt="Comment">
          </button>
          <span class="comment-count">${post.comments_count}</span>
        </div>

        <div class="action-button">
          <button class="share-btn" onclick="toggleShareModal
              (this.closest('.user-post'))">
            <img src="../assets/share_icon.png" alt="Share">
          </button>
          <span class="share-count">${post.shares_count}</span>
        </div>
      </div>
    </div>
  `;

  return postDiv;
}

function toggleLike(button, postId) {
  const outlineIcon = button.querySelector(".heart-icon.outline");
  const filledIcon = button.querySelector(".heart-icon.filled");
  const likeCountSpan = button.nextElementSibling;

  if (!outlineIcon || !filledIcon) {
    console.error("Heart icons missing!");
    return;
  }

  const isLiked = filledIcon && !filledIcon.classList.contains("hidden");

  fetch('../php/toggle-like.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_id: postId,
      action: isLiked ? 'unlike' : 'like'
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      if (isLiked) {
        outlineIcon.classList.remove("hidden");
        filledIcon.classList.add("hidden");
        likeCountSpan.textContent = 
            Math.max(0, parseInt(likeCountSpan.textContent) - 1);
      } else {
        outlineIcon.classList.add("hidden");
        filledIcon.classList.remove("hidden");
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
      }
    }
  })
  .catch(error => {
    console.error('Error toggling like:', error);
  });
}

function toggleFollow(button, userId) {
  const userCard = button.closest('.suggested-user, .user-item');
  const lastChild = userCard.querySelector('.user-info > *:last-child');
  const username = lastChild?.textContent?.replace('@', '');

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
        // sendNotification('follow', userId, 'Started following you.');
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
      }

      updateFollowingCount(data.current_user_following);

      syncAllFollowButtons(username, data.action === 'followed');

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

function syncAllFollowButtons(username, isFollowing) {
  const allButtons = document.querySelectorAll(`
    button[onclick*="'${username}'"],
    button[onclick*='"${username}"']
  `);

  allButtons.forEach(btn => {
    if (btn.disabled) return;

    if (isFollowing) {
      btn.textContent = "Following";
      btn.classList.add("following");
    } else {
      btn.textContent = "Follow";
      btn.classList.remove("following");
    }
  });
}

function updateFollowingCount(count) {
  const followingElement = document.getElementById('following_count');
  if (followingElement) {
    followingElement.textContent = count;
  }
}

function menuToggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  const scrollableContainer = document.querySelector('.right-contents');
  if (!dropdown || !scrollableContainer) return;

  dropdown.classList.toggle("hidden");

  if (!dropdown.classList.contains("hidden")) {
    const handleScrollClose = () => {
      dropdown.classList.add("hidden");
    };

    const handleClickOutside = (event) => {
      const isClickInside = dropdown.contains(event.target);
      const isToggleButton = event.target.closest('[onclick*="menuToggleDropdown"]');

      if (!isClickInside && !isToggleButton) {
        dropdown.classList.add("hidden");
      }
    };

    document.addEventListener("click", handleClickOutside);
    scrollableContainer.addEventListener("scroll", handleScrollClose);
  }
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

// Tab functionality
let followersLoaded = false;
let followingLoaded = false;

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
      tab.addEventListener('click', function() {
          const tabType = this.getAttribute('data-tab');
          switchTab(tabType);
      });
  });
}

function switchTab(tabType) {
  document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
  });

  document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
  });

  document.getElementById(`${tabType}-tab`).classList.add('active');

  if (tabType === 'followers' && !followersLoaded) {
      loadFollowers();
  } else if (tabType === 'following' && !followingLoaded) {
      loadFollowing();
  }
}

function loadFollowers() {
  if (!clickedUserId) return;

  const loadingElement = document.getElementById('followers-loading');
  const listElement = document.getElementById('followers-list');

  loadingElement.style.display = 'block';

  fetch(`../php/get_followers.php?user_id=${clickedUserId}`)
      .then(response => response.json())
      .then(data => {
          loadingElement.style.display = 'none';
          followersLoaded = true;

          if (data.success && data.followers.length > 0) {
              listElement.innerHTML = data.followers.map(user => createUserItem(user)).join('');
          } else {
              listElement.innerHTML = '<div class="empty-state">No followers yet</div>';
          }
      })
      .catch(error => {
          console.error('Error loading followers:', error);
          loadingElement.style.display = 'none';
          listElement.innerHTML = '<div class="error-message">Error loading followers</div>';
      });
}

function loadFollowing() {
  if (!clickedUserId) return;

  const loadingElement = document.getElementById('following-loading');
  const listElement = document.getElementById('following-list');

  loadingElement.style.display = 'block';

  fetch(`../php/get_following.php?user_id=${clickedUserId}`)
      .then(response => response.json())
      .then(data => {
          loadingElement.style.display = 'none';
          followingLoaded = true;

          if (data.success && data.following.length > 0) {
              listElement.innerHTML = data.following.map(user => createUserItem(user)).join('');
          } else {
              listElement.innerHTML = '<div class="empty-state">Not following anyone yet</div>';
          }
      })
      .catch(error => {
          console.error('Error loading following:', error);
          loadingElement.style.display = 'none';
          listElement.innerHTML = '<div class="error-message">Error loading following</div>';
      });
}

function createUserItem(user) {
  const isCurrentUser = currentUserId === user.user_id;
  const followButton = isCurrentUser ? '' : `
      <button class="follow-button ${user.is_following ? 'following' : ''}"
              onclick="toggleFollow(this, ${user.user_id})">
          ${user.is_following ? 'Following' : 'Follow'}
      </button>
  `;

  return `
      <div class="user-item">
          <img src="${user.profile_picture_url || '../assets/temporary_pfp.png'}"
               alt="${user.username}" class="user-avatar"
               onerror="this.src='../assets/temporary_pfp.png'">
          <div class="user-info">
              <div class="user-name">${user.display_name || user.username}</div>
              <div class="user-username">@${user.username}</div>
          </div>
          ${followButton}
      </div>
  `;
}