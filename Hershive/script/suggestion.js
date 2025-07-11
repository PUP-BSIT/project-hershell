let currentUser = null;
let clickedUserId = null;
let currentUserId = null;
let currentPage = 1;
const limitPerPage = 15;
let isLoading = false;
let allSearchedUsers = [];
let followStatusCache = {};
let noMoreData = false;
let postToDelete = null;
let currentPostIdForComments = null;
let commentToDeleteId = null;
let isCommentModalActive = false;
let isEditingComment = false;

loadSuggestedUsers();
initializeTabs();
checkUserSession();

setTimeout(() => {
  initializeFollowStatus();
}, 1000);

function checkUserSession() {
  fetch("../php/home.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.username;
        currentUserId = data.user_id;
        currentUserProfilePic = data.profile_picture_url || '../assets/temporary_pfp.png';

        const inputAvatar = document.querySelector('.comment-input-avatar');
        if (inputAvatar) {
          inputAvatar.src = currentUserProfilePic;
          inputAvatar.onerror = function () {
            this.src = '../assets/temporary_pfp.png';
          };
        }
      }
    })
    .catch(() => {
      window.location.href = "../html/login.html";
    });
}

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

function createPostElement(post, forModal = false) {
  const postDiv = document.createElement("div");
  postDiv.className = forModal ? "sample-post modal-post" : "sample-post";
  postDiv.dataset.postId = post.post_id;

  const isOwner = (post.sharer_username || post.username) === currentUser;
  const isShared = post.shared && post.original_post;

  const profilePicUrl = post.sharer_profile_pic || "../assets/temporary_pfp.png";

  // Select correct visibility icon
  const visibilityIcon = {
    public: "../assets/public_icon.png",
    followers: "../assets/followers_icon.png",
    private: "../assets/private_icon.png",
  }[post.visibility] || "../assets/public_icon.png";

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="${profilePicUrl}" alt="user profile"
             class="profile-pic" onerror="this.src='../assets/temporary_pfp.png'">
        <div class="post-info">
          <div class="username-container">
            <span class="username">${post.sharer_username || post.username}</span>
            ${!isOwner ? `
              <button class="post-follow-btn" onclick="togglePostFollow(this,
                  '${post.sharer_username || post.username}')">
                Follow
              </button>
            ` : ''}
          </div>
          <span class="timestamp">
            ${post.formatted_time}
            <img src="${visibilityIcon}" class="visibility-icon" alt="${post.visibility}">
            ${post.source_platform && post.source_platform !== "hershive" ? `
            <div class="external-share-indicator">
              Shared from ${capitalize(post.source_platform)}
            </div>
          ` : ''}
            </span>
        </div>
      </div>
      ${isOwner ? `
        <div class="more-option">
          <img src="../assets/more_icon.png" alt="more" onclick="toggleDropdown(this)">
          <div class="dropdown-menu" onclick="event.stopPropagation()">
            <button onclick="editPost(this)">Edit</button>
            <button onclick="deletePost(this)">Delete</button>
            <button onclick="cancelDropdown(this)">Cancel</button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="post-content">
      <div class="content">
        ${post.content ? `<div class="post-text">${post.content}</div>` : ""}

        ${isShared ? `
          <div class="shared-card">
            <p class="shared-username">Originally posted by
              <strong>${post.original_post.username}</strong>
            </p>
            <div class="shared-content">${post.original_post.content}</div>
            ${post.original_post.media_url ? (
              post.original_post.media_type === "video"
                ? `<video controls class="preview-video">
                     <source src="${post.original_post.media_url}" type="video/mp4">
                   </video>`
                : `<img src="${post.original_post.media_url}" class="preview-image"
                    alt="Shared Image">`
            ) : ""}
          </div>
        ` : `
          ${post.media_url ? (
            post.media_type === "video"
              ? `<video controls class="preview-video">
                   <source src="${post.media_url}" type="video/mp4">
                 </video>`
              : `<img src="${post.media_url}" class="preview-image" alt="Post Image">`
          ) : ""}
        `}
      </div>

      <div class="post-actions">
        <div class="action-button">
          <button class="like-btn" onclick="toggleLike(this, ${post.post_id})">
            <img class="heart-icon outline ${post.user_liked ? 'hidden' : ''}"
                 src="../assets/heart_icon.png" alt="Like">
            <img class="heart-icon filled ${post.user_liked ? '' : 'hidden'}"
                 src="../assets/red_heart_icon.png" alt="Liked">
          </button>
          <span class="like-count">${post.likes_count}</span>
        </div>

        <div class="action-button">
          <button class="comment-btn" onclick="toggleCommentModal(this)">
            <img src="../assets/comment_icon.png" alt="Comment">
          </button>
          <span class="comment-count">${post.comments_count}</span>
        </div>

        <div class="comment-modal hidden">
          <div class="modal-content">
            <span class="close-comment-modal" onclick="closeCommentModal(this)">&times;</span>
            <div class="comment-list-container"></div>
            <div class="comment-input">
              <input type="text" placeholder="Write a comment...">
              <button class="send-comment" onclick="submitComment(this)">Send</button>
            </div>
          </div>
        </div>

        <div class="action-button">
          <button class="share-btn" onclick="toggleShareModal(this.closest('.sample-post'))">
            <img src="../assets/share_icon.png" alt="Share">
          </button>
          <span class="share-count">${post.shares_count}</span>
        </div>

        <div class="share-modal hidden">
          <div class="modal-content">
            <span class="close-share-modal"
                onclick="toggleShareModal(this.closest('.sample-post'))">&times;</span>
            <input class="share-link" type="text"
                value="https://example.com/post/${post.post_id}" readonly>
            <button onclick="copyLink(this)">
              <img src="../assets/copy_icon.png" alt="Copy">
            </button>
          </div>
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
        sendNotification('follow', userId, 'started following you.');
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
    const handleClose = () => {
      dropdown.classList.add("hidden");
      document.removeEventListener("click", handleClose);
      scrollableContainer.removeEventListener("scroll", handleClose);
    };

    setTimeout(() => {
      document.addEventListener("click", handleClose);
      scrollableContainer.addEventListener("scroll", handleClose);
    }, 0);
  }
}

let allNotifications = [];
let notificationsShown = 0;
const INITIAL_SHOW = 6;
const PREVIEW_COUNT = 5;

setInterval(() => {
  fetch('../php/get_notifications.php')
    .then(res => res.json())
    .then(data => {
      const badge = document.getElementById('notification_count');
      const unread = data.unread_count || 0;

      badge.textContent = unread;
      badge.classList.toggle("hidden", unread === 0);
    });
}, 3000);

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  const badge = document.getElementById("notification_count");

  if (panel) {
    panel.classList.toggle("hidden");

    if (!panel.classList.contains("hidden")) {
      try {
        fetch('../php/mark_notifications_read.php', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (!data.success) {
              showError("Failed to mark notifications as read: " + (data.error || "Unknown error"));
            }
          })
          .catch(error => {
            showError("Network error while marking notifications as read: " + error.message);
          });
      } catch (err) {
        showError("Unexpected error: " + err.message);
      }

      if (badge) badge.classList.add("hidden");
    }

    loadNotifications();
  }
}

document.addEventListener('click', function(event) {
  const panel = document.getElementById("notification_panel");
  const button = document.querySelector(".notification-wrapper");

  if (!panel || !button) return;

  const clickedInsidePanel = panel.contains(event.target);
  const clickedButton = button.contains(event.target);

  if (!clickedInsidePanel && !clickedButton && !panel.classList.contains("hidden")) {
    panel.classList.add("hidden");
  }
});


function sendNotification(type, postId, message) {
  fetch('../php/insert_notification.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: type,
      post_id: postId,
      message: message
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Notification sent successfully.');
    } else {
      if (!data.success) {
        console.error('Failed to send notification:', data.error);
      }
    }
  })
  .catch(error => {
    showError("Network error while sending notification: " + error.message);
  });
}

function loadNotifications() {
  fetch('../php/get_notifications.php')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const container = document.getElementById('notification_container');
        const badge = document.getElementById('notification_count');
        const notifications = data.notifications || [];
        const unread = data.unread_count || 0;

        container.innerHTML = "";

        if (notifications.length === 0) {
          container.innerHTML = "<p>No notifications available.</p>";
          return;
        }

        allNotifications = data.notifications;
        notificationsShown = 0;
        appendNotifications(INITIAL_SHOW);

        if (badge) {
          badge.textContent = unread;
          if (unread > 0) {
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
          }
        }
      }
    })
    .catch(err => showError("Failed to load notifications: " + err.message));
}

function appendNotifications(count) {
  const container = document.getElementById('notification_container');
  const start = notificationsShown;
  const end = Math.min(notificationsShown + count, allNotifications.length);

  for (let i = start; i < end; i++) {
    const notif = allNotifications[i];
    const div = document.createElement('div');
    div.className = "notification";
    if (notif.follow_id) {
      div.onclick = () => {
        window.location.href = `../php/profile.php?user_id=${notif.actor_user_id}`;
      };
    }else if (notif.post_id) {
      div.onclick = () => {
        openPostModalFromNotification(notif.post_id);
      };
    }

    let html = `
      <img src="${notif.profile_picture_url || '../assets/temporary_pfp.png'}" class="notif-pfp" />
      <div class="notif-content">
        <div class="notif-middle-content">
          <p><strong>${notif.username}</strong><span> ${notif.message}</span></p>
          <p class="time">${formatTimeN(notif.created_at)}</p>
        </div>
        ${notif.media_url ? `<img src="${notif.media_url}" class="notif-thumbnail"/>` : ''}
      </div>
    `;
    div.innerHTML = html;
    container.appendChild(div);
  }

  notificationsShown = end;

  const oldPreview = document.querySelector('.notification-preview');
  if (oldPreview) oldPreview.remove();

  if (notificationsShown < allNotifications.length) {
    const previewDiv = document.createElement('div');
    previewDiv.className = "notification-preview";
    previewDiv.innerHTML = `<button id="showPreviewBtn">Show previous</button>`;
    container.appendChild(previewDiv);

    document.getElementById('showPreviewBtn').onclick = function(e) {
      e.stopPropagation();
      appendNotifications(PREVIEW_COUNT);
    };
  }
}

function formatTimeN(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function openPostModalFromNotification(postId) {
  fetch(`../php/get_single_post.php?post_id=${postId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        showError("Failed to load post");
        return;
      }

      const post = data.post;
      currentPostIdForComments = postId;

      const header = document.getElementById('preview_header')
      const overlayEl = document.getElementById('commentModalOverlay');
      const previewEl = document.getElementById('commentPostPreview');
      const inputEl = document.getElementById('commentInput');
      const commentListEl = document.getElementById('commentListContainer');

      if (!overlayEl || !previewEl || !inputEl || !commentListEl) return;

      // Clear and inject the full post layout
      header.innerHTML = "";
      previewEl.innerHTML = "";
      header.innerHTML = `${post.sharer_username || post.username}'s post`;
      const postElement = createPostElement(post, true);
      previewEl.appendChild(postElement);

      // Reapply modal styling
      overlayEl.classList.add("active");
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";

      loadComments(postId, commentListEl);
      setTimeout(() => inputEl.focus(), 300);

      if (window.commentPollingInterval) clearInterval(window.commentPollingInterval);
      window.commentPollingInterval = setInterval(() => {
        if (!isEditingComment) {
          loadComments(postId, commentListEl);
        }
      }, 5000);
      clearFollowCache();
    })
    .catch(err => showError("Network error while loading post: " + err.message));
}

function toggleCommentModal(button) {
  const postElement = button.closest('.sample-post');
  if (!postElement || !postElement.dataset.postId) {
    console.warn('Post element or post ID missing.');
    alert('Cannot identify which post to comment on.');
    return;
  }

  const header = document.getElementById('preview_header');
  const overlayEl = document.getElementById('commentModalOverlay');
  const previewEl = document.getElementById('commentPostPreview');
  const inputEl = document.getElementById('commentInput');
  const commentListEl = document.getElementById('commentListContainer');

  if (!overlayEl || !previewEl || !inputEl || !commentListEl) {
    console.warn('Modal elements missing:', {
      overlay: overlayEl,
      preview: previewEl,
      commentInput: inputEl,
      commentListContainer: commentListEl
    });
    return;
  }

  currentPostIdForComments = postElement.dataset.postId;
  header.innerHTML = '';
  previewEl.innerHTML = '';

  header.innerHTML = "Comments";

  isCommentModalActive = true;

  const profilePic = postElement.querySelector('.post-header-left .profile-pic')?.src || '../assets/temporary_pfp.png';
  const username = postElement.querySelector('.post-info .username')?.textContent || 'User';
  const timestamp = postElement.querySelector('.timestamp')?.firstChild?.textContent?.trim() || '';

  const contentEl = postElement.querySelector('.post-content');
  const visibilityIconEl = postElement.querySelector('.visibility-icon');
  const sharedIndicatorEl = postElement.querySelector('.external-share-indicator');

  const visibilityCopy = visibilityIconEl ? visibilityIconEl.cloneNode(true) : null;
  const sharedCopy = sharedIndicatorEl ? sharedIndicatorEl.cloneNode(true) : null;

  const isNotSelf = username !== currentUser;
  const isFollowing = followStatusCache[username];
  const followBtnHTML = isNotSelf ? `
    <button class="post-follow-btn ${isFollowing ? 'following' : ''}"
            onclick="togglePostFollow(this, '${username}')">
      ${isFollowing ? 'Following' : 'Follow'}
    </button>` : '';

  previewEl.insertAdjacentHTML(
    'beforeend',
    `
    <div class="comment-post-header">
      <div class="post-header-left">
        <img src="${profilePic}" alt="${username}" class="profile-pic" />
        <div class="post-info">
          <div class="username-container">
            <span class="username">${username}</span>
            ${followBtnHTML}
          </div>
          <span class="timestamp">
            ${timestamp}
            ${visibilityCopy ? visibilityCopy.outerHTML : ''}
            ${sharedCopy ? sharedCopy.outerHTML : ''}
          </span>

        </div>
      </div>
    </div>
    `
  );

  const clonedContent = contentEl?.cloneNode(true);
  clonedContent?.querySelector('.post-actions')?.remove();

  if (clonedContent) {
    previewEl.appendChild(clonedContent);
    previewEl.querySelectorAll('img').forEach(img => {
      img.classList.add('preview-image');
    });
    previewEl.querySelectorAll('video').forEach(video => {
      video.classList.add('preview-video');
    });
  }

  previewEl.scrollTop = 0;
  const scrollable = document.getElementById('commentModalScrollable');
  if (scrollable) scrollable.scrollTop = 0;

  overlayEl.classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';

  loadComments(currentPostIdForComments, commentListEl);
  setTimeout(() => inputEl.focus(), 300);

  if (window.commentPollingInterval) clearInterval(window.commentPollingInterval);
window.commentPollingInterval = setInterval(() => {
  if (!isEditingComment) {
    loadComments(currentPostIdForComments, document.getElementById('commentListContainer'));
  }
}, 5000);
}

function closeCommentModal() {
  const overlay = document.getElementById('commentModalOverlay');
  if (overlay) overlay.classList.remove('active');

  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';

  const commentInput = document.getElementById('commentInput');
  if (commentInput) commentInput.value = '';

  isCommentModalActive = false;

  updateCommentTimes();

  if (window.commentPollingInterval) {
    clearInterval(window.commentPollingInterval);
    window.commentPollingInterval = null;
  }
}

const usernames = [];

function loadComments(postId, commentListContainer) {
  usernames.length = 0;
  fetch(`../php/comment_crud.php?action=get&post_id=${postId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let username = data.comments[0].username;
        usernames.push(username);
        displayComments(data.comments, commentListContainer);
        initializeFollowStatus();
        updateCommentCount(postId);

        if (!isEditingComment && !isCommentModalActive) {
          updateCommentTimes();
        }
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error("Error loading comments:", error);
    });
}

function displayComments(comments, container) {
  container.innerHTML = '';

  if (!comments || comments.length === 0) {
    container.innerHTML = `<p class="no-comments-text">No comments yet.</p>`;
    return;
  }

  comments.forEach(c => {
    const entry = document.createElement('div');
    entry.className = 'comment-entry';
    entry.dataset.id = c.comment_id;

    const avatar = document.createElement('img');
    avatar.className = 'comment-avatar';
    avatar.src = c.profile_picture_url || '../assets/temporary_pfp.png';
    avatar.alt = 'Avatar';
    avatar.onclick = () => {
      window.location.href = `../php/profile.php?user_id=${c.user_id}`;
    };

    const bubble = document.createElement('div');
    bubble.className = 'comment-bubble';

    const header = document.createElement('div');
    header.className = 'comment-header';

    const metaLine = document.createElement('div');
    metaLine.className = 'comment-meta-inline';

    const name = document.createElement('a');
    name.className = 'comment-username-link';
    name.href = `../php/profile.php?user_id=${c.user_id}`;
    name.textContent = c.username;

    const ts = document.createElement('span');
    ts.className = 'comment-timestamp';
    ts.dataset.timestamp = c.timestamp;
    ts.textContent = formatTime(c.timestamp);

    const isNotSelf = String(c.user_id) !== String(currentUserId);
    const isFollowing = followStatusCache[c.username];

    metaLine.appendChild(name);
    metaLine.appendChild(ts);

    if (isNotSelf) {
      const followBtn = document.createElement('button');
      followBtn.className = `comment-follow-btn ${isFollowing ? 'following' : ''}`;
      followBtn.textContent = isFollowing ? 'Following' : 'Follow';
      followBtn.onclick = () => togglePostFollow(followBtn, c.username);
      metaLine.appendChild(followBtn);
    }

    header.appendChild(metaLine);
    bubble.appendChild(header);

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = c.comment_content;
    bubble.appendChild(text);

    if (String(c.user_id) === String(currentUserId)) {
      const opts = document.createElement('button');
      opts.className = 'comment-options';
      opts.innerHTML = '&#8942;';
      opts.onclick = e => {
        e.stopPropagation();
        showCommentOptionsMenu(e, c.comment_id, c.user_id);
      };
      bubble.appendChild(opts);
    }

    entry.appendChild(avatar);
    entry.appendChild(bubble);
    container.appendChild(entry);
  });

  updateCommentTimes();
  container.scrollTop = container.scrollHeight;
}

function cancelCommentMenu(button) {
  const menu = button.closest('.comment-context-menu');
  if (menu) menu.remove();
}

function showCommentOptionsMenu(e, commentId, commentUserId) {
  e.stopPropagation();

  document.querySelectorAll('.comment-context-menu').forEach(menu => menu.remove());

  const button = e.currentTarget;
  const rect = button.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.className = 'comment-context-menu';
  menu.style.position = 'absolute';
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.zIndex = '9999';

  menu.innerHTML = `
    <button onclick="editComment(${commentId})">Edit</button>
    <button onclick="deleteComment(${commentId})">Delete</button>
    <button onclick="this.closest('.comment-context-menu')?.remove()">Cancel</button>
  `;

  document.body.appendChild(menu);

  document.removeEventListener('mousedown', window._commentOutsideClickHandler);

  window._commentOutsideClickHandler = function(event) {
    const isClickInsideMenu = menu.contains(event.target);
    const isClickOnButton = button.contains(event.target);
    const isClickOnCommentInput = event.target.closest('.comment-input-container');

    if (!isClickInsideMenu && !isClickOnButton && !isClickOnCommentInput) {
      menu.remove();
      document.removeEventListener('mousedown', window._commentOutsideClickHandler);
    }
  };

  setTimeout(() => {
    document.addEventListener('mousedown', window._commentOutsideClickHandler);
  }, 0);
}


function submitComment() {
  const inp = document.getElementById('commentInput');
  const content = inp.value.trim();
  if (!content || !currentPostIdForComments) return;

  fetch('../php/comment_crud.php?action=add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      post_id: currentPostIdForComments,
      content
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      return alert('Error: ' + (data.error || 'Unknown'));
    }

    inp.value = '';

    loadComments(currentPostIdForComments, document.getElementById('commentListContainer'));
    updateCommentCount(currentPostIdForComments);

    sendNotification('comment', currentPostIdForComments, 'commented on your post.');

    setTimeout(() => {
      inp.focus();
    }, 300);
  })
  .catch(err => console.error('Comment error:', err));
}

document.getElementById("commentInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitComment();
  }
});

function initializeCommentTimeUpdates() {
  updateCommentTimes();
  setInterval(updateCommentTimes, 60000);
}

function updateCommentCount(postId) {
  fetch(`../php/comment_crud.php?action=get&post_id=${postId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const post = document.querySelector(`.sample-post[data-post-id='${postId}']`);
        if (!post) return;

        const countElem = post.querySelector('.comment-count');
        if (countElem) {
          countElem.textContent = data.count;
        }
      }
    });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

function parseDateSafe(ts) {
  return new Date(ts);
}

function formatTime(ts) {
  const commentTime = parseDateSafe(ts);
  const now = new Date();

  // Convert both times to UTC for consistent difference
  const commentUTC = new Date(commentTime.getTime() - commentTime.getTimezoneOffset() * 60000);
  const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  const diffInMs = nowUTC - commentUTC;
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return 'just now';

  if (diffInSeconds < 10) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w`;

  const isThisYear = commentTime.getFullYear() === now.getFullYear();
  return commentTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' })
  });
}

function updateCommentTimes() {
  if (isCommentModalActive || isEditingComment) return;

  document.querySelectorAll('.comment-timestamp[data-timestamp]').forEach(el => {
    const bubble = el.closest('.comment-bubble');
    if (bubble && bubble.querySelector('.edit-comment-wrapper')) return;

    const rawTimestamp = el.dataset.timestamp;
    if (rawTimestamp) {
      try {
        const newTimeText = formatTime(rawTimestamp);
        if (el.textContent !== newTimeText) {
          el.textContent = newTimeText;
        }
      } catch (err) {
        console.error('Invalid timestamp:', rawTimestamp, err);
        el.textContent = 'just now';
      }
    }
  });
}

function editComment(commentId) {
  document.querySelectorAll('.comment-context-menu').forEach(menu => menu.remove());

  const commentDiv = document.querySelector(`.comment-entry[data-id='${commentId}']`);
  if (!commentDiv) return;

  const bubble = commentDiv.querySelector('.comment-bubble');
  const textEl = bubble.querySelector('.comment-text');
  const originalText = textEl.textContent;

  isEditingComment = true;

  const formWrapper = document.createElement('div');
  formWrapper.className = 'edit-comment-wrapper';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-comment-input';
  input.value = originalText;

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'edit-comment-save-btn';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'edit-comment-cancel-btn';

  formWrapper.appendChild(input);
  formWrapper.appendChild(saveBtn);
  formWrapper.appendChild(cancelBtn);
  bubble.appendChild(formWrapper);

  saveBtn.onclick = () => {
    const newContent = input.value.trim();
    if (!newContent) return;

    fetch('../php/comment_crud.php?action=edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        comment_id: commentId,
        content: newContent
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        textEl.textContent = newContent;
        textEl.style.display = '';
        formWrapper.remove();

        isEditingComment = false;
      } else {
        alert('Failed to update comment');
        isEditingComment = false;
      }
    })
    .catch(err => {
      console.error('Error editing comment:', err);
      isEditingComment = false;
    });
  };

  cancelBtn.onclick = () => {
    textEl.style.display = '';
    formWrapper.remove();

    isEditingComment = false;
  };
}

function deleteComment(commentId) {
  document.querySelectorAll('.comment-context-menu').forEach(menu => menu.remove());

  commentToDeleteId = commentId;

  const modal = document.getElementById('delete_comment_modal');
  if (!modal) {
    console.warn("Modal not found: #delete_comment_modal");
    return;
  }

  modal.classList.remove('hidden');
  modal.classList.add('active');

  const confirmButton = modal.querySelector('.confirm-button');
  const cancelButton = modal.querySelector('.comment-cancel-btn');

  if (!confirmButton || !cancelButton) {
    console.warn("Confirm or cancel button not found inside the modal.");
    return;
  }

  confirmButton.onclick = null;
  cancelButton.onclick = null;

  confirmButton.onclick = function () {
    fetch('../php/comment_crud.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ comment_id: commentToDeleteId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const list = document.getElementById('commentListContainer');
          loadComments(currentPostIdForComments, list);
          updateCommentCount(currentPostIdForComments);
        } else {
          alert(data.error || 'Failed to delete comment');
        }
      })
      .catch(() => {
        alert('Error deleting comment');
      })
      .finally(() => {
        closeMyNewModal();
        commentToDeleteId = null;
      });
  };

  cancelButton.onclick = function () {
    closeMyNewModal();
  };
}

function closeMyNewModal() {
  const modal = document.getElementById('delete_comment_modal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.add('hidden');
  }
}

function confirmMyAction() {
  if (!commentToDeleteId) return;

  fetch('../php/comment_crud.php?action=delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ comment_id: commentToDeleteId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadComments(currentPostIdForComments, document.getElementById('commentListContainer'));
        updateCommentCount(currentPostIdForComments);
      } else {
        alert(data.error || 'Failed to delete comment');
      }
    })
    .catch(() => alert('Error deleting comment'))
    .finally(() => {
      closeMyNewModal();
      commentToDeleteId = null;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const deleteOverlay = document.getElementById('delete_comment_modal');
  const deleteModal = deleteOverlay?.querySelector('.custom-modal');

  if (deleteOverlay && deleteModal) {
    deleteOverlay.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) {
        closeMyNewModal();
      }
    });

    deleteModal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
});

function getCurrentUserId() {
  if (typeof currentUserId === 'undefined' || currentUserId === null) {
    console.warn("Current user ID not set - user is not logged in");
    return -1;
  }
  return currentUserId;
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('commentModalOverlay');
  const modal = document.getElementById('commentModal');

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeCommentModal();
      }
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay && overlay.classList.contains('active')) {
        closeCommentModal();
      }
    }
  });

  initializeCommentTimeUpdates();
  setInterval(updateCommentTimes, 60000);
});

function toggleShareModal(postElement) {
  const modal = document.getElementById("share_modal");
  const preview = document.getElementById("shared_post_preview");
  const postIdInput = document.getElementById("shared_post_id");
  const linkInput = document.getElementById("share_link");

  const content = postElement.querySelector(".content")?.innerHTML || "No content";
  const postId = postElement.dataset.postId;

  preview.innerHTML = content;
  postIdInput.value = postId;
  linkInput.value = `https://www.hershive.com/project-hershell/Hershive/php/post.php?id=${postId}`;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeShareModal() {
  const shareModal = document.getElementById("share_modal");
  if (shareModal) {
    shareModal.classList.add("hidden");
  }
  document.body.classList.remove("modal-open");
}

function submitShare() {
  const message = document.getElementById("share_message").value.trim();
  const postId = document.getElementById("shared_post_id").value;

  fetch("../php/share-post.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_id: postId,
      content: message
    })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const postWrapperId = data.post_id;
        alert("Post shared successfully!");
        closeShareModal();
        loadPosts();
        sendNotification('share', postWrapperId, 'shared your post.');
      } else {
        alert(data.error || "Error sharing post");
      }
    })
    .catch((err) => {
      showError("Error sharing post: " + err.message);
    });
}

function copyLink(button) {
  const input = button.previousElementSibling;
  if (!input) return;

  navigator.clipboard
    .writeText(input.value)
    .then(() => alert("Link copied!"))
    .catch(() => alert("Copy failed"));
}

window.addEventListener("click", function (e) {
  const logoutModal = document.getElementById("logout_modal");
  if (e.target === logoutModal) {
    hideLogout();
  }
});

function hideLogout() {
  document.getElementById("logout_modal").classList.add("hidden");
   document.body.classList.remove("modal-open");
}

function toggleLogout() {
  document.getElementById("logout_modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
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

function syncAllFollowButtons(username, isFollowing) {
  const allButtons = document.querySelectorAll(`
    button[onclick*="'${username}'"],
    button[onclick*='"${username}"'],
    button[data-username="${username}"],
    .post-follow-btn,
    .follow-button,
    .more-people-follow-btn,
    .follow-btn
  `);

  allButtons.forEach(btn => {
    if (btn.disabled) return;

    // Check if this button is for the specific username
    let buttonUsername = null;

    const onclick = btn.getAttribute('onclick');
    if (onclick) {
      const match = onclick.match(/'([^']+)'|"([^"]+)"/);
      if (match) {
        buttonUsername = match[1] || match[2];
      }
    }

    const dataUsername = btn.getAttribute('data-username');
    if (dataUsername) {
      buttonUsername = dataUsername;
    }

    // For post follow buttons, check the closest user info
    if (!buttonUsername) {
      const postHeader = btn.closest('.post-header');
      if (postHeader) {
        const userInfo = postHeader.querySelector('.username');
        if (userInfo) {
          buttonUsername = userInfo.textContent.trim();
        }
      }
    }

    // For suggested user cards
    if (!buttonUsername) {
      const userCard = btn.closest('.suggested-user');
      if (userCard) {
        const userInfo = userCard.querySelector('.user-info p:last-child');
        if (userInfo) {
          buttonUsername = userInfo.textContent.replace('@', '');
        }
      }
    }

    if (buttonUsername === username) {
      if (isFollowing) {
        btn.textContent = "Following";
        btn.classList.add("following");
      } else {
        btn.textContent = "Follow";
        btn.classList.remove("following");
      }
    }
  });
}

function updateFollowingCount(count) {
  const followingElement = document.getElementById('following_count');
  if (followingElement) {
    followingElement.textContent = count;
  }
}

function initializeFollowStatus() {
  // const usernames = [];

  const followButtons = document.querySelectorAll('.post-follow-btn, .follow-button, .more-people-follow-btn, .follow-btn');
  followButtons.forEach(button => {
    let username = null;

    const onclick = button.getAttribute('onclick');
    if (onclick) {
      const match = onclick.match(/'([^']+)'|"([^"]+)"/);
      if (match) {
        username = match[1] || match[2];
      }
    }

    const dataUsername = button.getAttribute('data-username');
    if (dataUsername) {
      username = dataUsername;
    }

    // For post follow buttons, get username from post header
    if (!username) {
      const postHeader = button.closest('.post-header');
      if (postHeader) {
        const userInfo = postHeader.querySelector('.username');
        if (userInfo) {
          username = userInfo.textContent.trim();
        }
      }
    }

    // For suggested user cards
    if (!username) {
      const userCard = button.closest('.suggested-user');
      if (userCard) {
        const userInfo = userCard.querySelector('.user-info p:last-child');
        if (userInfo) {
          username = userInfo.textContent.replace('@', '');
        }
      }
    }

    if (username && !usernames.includes(username)) {
      usernames.push(username);
    }
  });

  if (usernames.length === 0) return;

  // Apply cached status immediately for better UX
  followButtons.forEach(button => {
    let username = null;

    const onclick = button.getAttribute('onclick');
    if (onclick) {
      const match = onclick.match(/'([^']+)'|"([^"]+)"/);
      if (match) {
        username = match[1] || match[2];
      }
    }

    const dataUsername = button.getAttribute('data-username');
    if (dataUsername) {
      username = dataUsername;
    }

    if (!username) {
      const postHeader = button.closest('.post-header');
      if (postHeader) {
        const userInfo = postHeader.querySelector('.username');
        if (userInfo) {
          username = userInfo.textContent.trim();
        }
      }
    }

    if (!username) {
      const userCard = button.closest('.suggested-user');
      if (userCard) {
        const userInfo = userCard.querySelector('.user-info p:last-child');
        if (userInfo) {
          username = userInfo.textContent.replace('@', '');
        }
      }
    }

    if (username && followStatusCache.hasOwnProperty(username)) {
      if (followStatusCache[username]) {
        button.textContent = "Following";
        button.classList.add("following");
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
      }
    }
  });

  fetch(`../php/check_follow_status.php?usernames=${usernames.join(',')}&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let hasChanges = false;

        // Update cache with database data
        Object.keys(data.follow_status).forEach(username => {
          const dbStatus = data.follow_status[username];
          if (followStatusCache[username] !== dbStatus) {
            followStatusCache[username] = dbStatus;
            hasChanges = true;

            // Broadcast changes to other pages
            broadcastFollowUpdate(username, dbStatus);
          }
        });

        // Update buttons with database data
        followButtons.forEach(button => {
          let username = null;

          const onclick = button.getAttribute('onclick');
          if (onclick) {
            const match = onclick.match(/'([^']+)'|"([^"]+)"/);
            if (match) {
              username = match[1] || match[2];
            }
          }

          const dataUsername = button.getAttribute('data-username');
          if (dataUsername) {
            username = dataUsername;
          }

          if (!username) {
            const postHeader = button.closest('.post-header');
            if (postHeader) {
              const userInfo = postHeader.querySelector('.username');
              if (userInfo) {
                username = userInfo.textContent.trim();
              }
            }
          }

          if (!username) {
            const userCard = button.closest('.suggested-user');
            if (userCard) {
              const userInfo = userCard.querySelector('.user-info p:last-child');
              if (userInfo) {
                username = userInfo.textContent.replace('@', '');
              }
            }
          }

          if (username && data.follow_status.hasOwnProperty(username)) {
            if (data.follow_status[username]) {
              button.textContent = "Following";
              button.classList.add("following");
            } else {
              button.textContent = "Follow";
              button.classList.remove("following");
            }
          }
        });
      }
    })
    .catch(error => {
      console.error('Error checking follow status:', error);
    });
}

const followChannel = new BroadcastChannel('follow-status-sync');

// Listen for follow status updates from other pages
followChannel.addEventListener('message', (event) => {
  if (event.data.type === 'follow-status-update') {
    const { username, isFollowing } = event.data;
    followStatusCache[username] = isFollowing;
    syncAllFollowButtons(username, isFollowing);
  } else if (event.data.type === 'following-count-update') {
    updateFollowingCount(event.data.count);
  }
});

function broadcastFollowUpdate(username, isFollowing) {
  followChannel.postMessage({
    type: 'follow-status-update',
    username: username,
    isFollowing: isFollowing
  });
}

// Broadcast following count update to other pages
function broadcastFollowingCountUpdate(count) {
  followChannel.postMessage({
    type: 'following-count-update',
    count: count
  });
}

function getFollowStatus(username) {
  return followStatusCache[username] || false;
}

function refreshFollowStatus(usernames = []) {
  if (usernames.length === 0) {
    // If no usernames provided, refresh all visible users
    initializeFollowStatus();
    return;
  }

  fetch(`../php/check_follow_status.php?usernames=${usernames.join(',')}&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        Object.keys(data.follow_status).forEach(username => {
          const dbStatus = data.follow_status[username];
          if (followStatusCache[username] !== dbStatus) {
            followStatusCache[username] = dbStatus;
            syncAllFollowButtons(username, dbStatus);
            broadcastFollowUpdate(username, dbStatus);
          }
        });
      }
    })
    .catch(error => {
      console.error('Error refreshing follow status:', error);
    });
}

function clearFollowCache() {
  followStatusCache = {};
  initializeFollowStatus();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page is now visible, refresh follow status
    refreshFollowStatus();
  }
});

window.addEventListener('beforeunload', () => {
  followChannel.close();
});

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

function showError(message) {
  const popup = document.getElementById("error_popup");
  if (!popup) return;

  popup.textContent = message;
  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 4000);
}