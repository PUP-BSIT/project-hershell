let currentUser = null;
let currentUserId = null;
let allSearchedUsers = [];
let followStatusCache = {};
let currentUserProfilePic = null;
let clickedUserId = null;

document.addEventListener("DOMContentLoaded", function () {
  checkUserSession(() => {
    loadPosts();
    loadSuggestedUsers();
    initializeMediaUpload();
    syncPrivacyToModal();
    bindPrivacyEvents();
    loadNotifications();

    setTimeout(() => {
      initializeFollowStatus();
    }, 1000);
  });
});

function checkUserSession(callback) {
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

        document.getElementById("display_name").textContent = data.display_name;
        document.getElementById("username").textContent = "@" + data.username;

        const mainCreatePostPic = document.querySelector(".main-create-post .profile-pic");
        if (mainCreatePostPic) {
          mainCreatePostPic.src = data.profile_picture_url || "../assets/temporary_pfp.png";
          mainCreatePostPic.onerror = function () {
            this.src = "../assets/temporary_pfp.png";
          };
        }

        const sideProfileImg = document.querySelector(".side-panel .profile-img");
        if (sideProfileImg) {
          sideProfileImg.src = data.profile_picture_url || "../assets/temporary_pfp.png";
          sideProfileImg.onerror = function () {
            this.src = "../assets/temporary_pfp.png";
          };
        }

        const sideCoverImg = document.querySelector(".side-panel .cover-img");
        if (sideCoverImg) {
          sideCoverImg.src = data.background_picture_url || "../assets/cover_photo.png";
          sideCoverImg.onerror = function () {
            this.src = "../assets/cover_photo.png";
          };
        }

        const modalUsername = document.querySelector(".create-post-modal .username");
        if (modalUsername) {
          modalUsername.textContent = data.username;
        }

        const modalProfilePic = document.querySelector(".create-post-modal .modal-profile-pic");
        if (modalProfilePic) {
          modalProfilePic.src = data.profile_picture_url || "../assets/temporary_pfp.png";
          modalProfilePic.onerror = function () {
            this.src = "../assets/temporary_pfp.png";
          };
        }

        if (typeof callback === "function") {
          callback();
        }
      } else {
        window.location.href = "../html/login.html";
      }
    })
    .catch(() => {
      window.location.href = "../html/login.html";
    });
}

function loadPosts() {
  fetch('../php/get-posts.php?unlimited=true')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayPosts(data.posts);
        setTimeout(() => {
          initializeFollowStatus();
        }, 100);
      } else {
        console.error('Failed to load posts:', data.error);
      }
    })
    .catch(error => {
      console.error('Error loading posts:', error);
    });
}

function displayPosts(posts) {
  const leftContent = document.querySelector(".left-content");

  const existingPosts = leftContent.querySelectorAll(".sample-post");
  existingPosts.forEach(post => post.remove());

  posts.forEach(post => {
    const postElement = createPostElement(post);
    leftContent.appendChild(postElement);
  });

  setTimeout(() => {
    initializeFollowStatus();
  }, 100);
}


function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "sample-post";
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
        ${post.content ? `<p>${post.content}</p>` : ""}

        ${isShared ? `
          <div class="shared-card">
            <p class="shared-username">Originally posted by
              <strong>${post.original_post.username}</strong>
            </p>
            <p>${post.original_post.content}</p>
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

function togglePostFollow(button, username) {
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
        followStatusCache[username] = true;
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
        followStatusCache[username] = false;
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

function submitPost() {
  const editor = document.getElementById("editor");
  const content = editor.innerHTML.trim();

  const imageInput = document.getElementById("media_input");
  const videoInput = document.getElementById("media_input_video");

  const hasImage = imageInput.files.length > 0;
  const hasVideo = videoInput.files.length > 0;

  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  const hasText = textOnly !== "" && textOnly !== "&nbsp;";

  if (!hasText && !hasImage && !hasVideo) {
    alert("Please write something or upload media.");
    return;
  }

  const formData = new FormData();

  if (hasText) formData.append("content", content);
  if (hasImage && hasVideo) {
    alert("You can only upload one media at a time.");
    return;
  }

  if (hasImage) {
   formData.append("media", imageInput.files[0]);
   formData.append("media_type", "image");
  } else if (hasVideo) {
    formData.append("media", videoInput.files[0]);
    formData.append("media_type", "video");
  }

  // Get visibility from modal or fallback to mini post privacy
  const privacy = document.getElementById("privacy_setting")?.value ||
      document.getElementById("privacy").value;
  formData.append("visibility", privacy);

  fetch("../php/create-post.php", {
    method: "POST",
    body: formData,
    headers: {
    "X-Requested-With": "XMLHttpRequest"
    }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        closePostModal();
        editor.innerHTML = "";
        imageInput.value = "";
        videoInput.value = "";

        const previewContainer = document.getElementById("preview_container");
        if (previewContainer) previewContainer.innerHTML = "";

        loadPosts();
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch((err) => {
      alert("Post failed.");
      console.error(err);
    });
}

function editPost(button) {
  const post = button.closest('.sample-post');
  const postId = post.dataset.postId;
  const contentDiv = post.querySelector('.content');
  const paragraph = contentDiv.querySelector('p:not(.shared-card p)');
  const sharedCard = contentDiv.querySelector('.shared-card');
  const existingImage = contentDiv.querySelector('img:not(.shared-card img)');
  const existingVideo = contentDiv.querySelector('video:not(.shared-card video)');
  const postActions = post.querySelector('.post-actions');
  const visibilityIcon = post.querySelector('.visibility-icon');

  if (contentDiv.querySelector('.edit-editor')) return;

  const editor = createEditor(paragraph?.innerHTML || '');
  const formatting = createFormatting(editor);
  const { uploadControls, fileInputImage, fileInputVideo, visibilitySelect } = createUploadControls();
  const saveBtn = createSaveButton();
  const cancelBtn = createCancelButton(() => {
    [editor, formatting, uploadControls, buttonWrapper].forEach(el => el.remove());
    if (paragraph) paragraph.classList.remove('hidden');
    if (postActions) postActions.classList.remove('hidden');
  });

  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'edit-button-wrapper';
  buttonWrapper.append(cancelBtn, saveBtn);

  if (paragraph) paragraph.classList.add('hidden');
  if (postActions) postActions.classList.add('hidden');

  saveBtn.onclick = () => {
    const content = editor.innerHTML.trim();
    const hasText = content.replace(/<[^>]*>/g, '').trim() !== '';
    const hasNewImage = fileInputImage.files.length > 0;
    const hasNewVideo = fileInputVideo.files.length > 0;
    const hasExistingMedia = existingImage || existingVideo;
    const hasShared = !!sharedCard;

    if (!hasText && !hasNewImage && !hasNewVideo && !hasExistingMedia && !hasShared) {
      alert('Post must contain text or media.');
      return;
    }

    if (hasNewImage && hasNewVideo) {
      alert('You can only upload one media type.');
      return;
    }

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('content', hasText ? content : '');
    formData.append('visibility', visibilitySelect.value);

    if (hasNewImage) {
      formData.append('media', fileInputImage.files[0]);
      formData.append('media_type', 'image');
    } else if (hasNewVideo) {
      formData.append('media', fileInputVideo.files[0]);
      formData.append('media_type', 'video');
    }

    fetch('../php/edit_post.php', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        console.log('Edit response:', data);
        if (!data.success) {
          alert(data.error || 'Failed to update post');
          return;
        }

        updatePostContent(contentDiv, content, sharedCard, paragraph, fileInputImage, fileInputVideo, existingImage, existingVideo);
        [editor, formatting, uploadControls, buttonWrapper].forEach(el => el.remove());
        if (postActions) postActions.classList.remove('hidden');

        const iconMap = {
          public: '../assets/public_icon.png',
          followers: '../assets/followers_icon.png',
          private: '../assets/private_icon.png'
        };
        if (visibilityIcon) {
          visibilityIcon.src = iconMap[visibilitySelect.value] || iconMap.public;
          visibilityIcon.alt = visibilitySelect.value;
        }
      })
      .catch(err => {
        console.error('Edit error:', err);
        alert('Error updating post');
      });
  };

  [editor, formatting, uploadControls, buttonWrapper].reverse().forEach(el => {
    contentDiv.insertBefore(el, contentDiv.firstChild);
  });
}

function createEditor(initialHTML) {
  const div = document.createElement('div');
  div.className = 'edit-editor';
  div.contentEditable = true;
  div.innerHTML = initialHTML;
  return div;
}

function createFormatting(editor) {
  const container = document.createElement('div');
  container.className = 'formatting-options';
  ['bold', 'italic', 'underline'].forEach(cmd => {
    const btn = document.createElement('button');
    btn.textContent = cmd[0].toUpperCase();
    btn.onclick = () => {
      editor.focus();
      document.execCommand(cmd, false, null);
    };
    container.appendChild(btn);
  });
  return container;
}

function createUploadControls() {
  const container = document.createElement('div');
  container.className = 'upload-controls';

  // Image input
  const fileInputImage = document.createElement('input');
  fileInputImage.type = 'file';
  fileInputImage.accept = 'image/*';
  fileInputImage.hidden = true;

  const imageLabel = document.createElement('label');
  imageLabel.className = 'icon-button';
  imageLabel.innerHTML = `
    <img src="../assets/camera_icon.png" alt="Image Icon" />
    <span>Image</span>
  `;
  imageLabel.appendChild(fileInputImage);

  // Video input
  const fileInputVideo = document.createElement('input');
  fileInputVideo.type = 'file';
  fileInputVideo.accept = 'video/*';
  fileInputVideo.hidden = true;

  const videoLabel = document.createElement('label');
  videoLabel.className = 'icon-button';
  videoLabel.innerHTML = `
    <img src="../assets/video_icon.png" alt="Video Icon" />
    <span>Video</span>
  `;
  videoLabel.appendChild(fileInputVideo);

  // Privacy selector
  const visibility = document.createElement('div');
  visibility.className = 'privacy-select';
  visibility.innerHTML = `
    <img class="edit-privacy-icon" src="../assets/public_icon.png" alt="Privacy Icon" />
    <select class="edit-privacy-select">
      <option value="public">Public</option>
      <option value="followers">Followers</option>
      <option value="private">Private</option>
    </select>
  `;

  const visibilitySelect = visibility.querySelector('select');
  const visibilityIcon = visibility.querySelector('img');

  // Sync icon on change
  visibilitySelect.addEventListener('change', () => {
    const value = visibilitySelect.value;
    const iconMap = {
      public: '../assets/public_icon.png',
      followers: '../assets/followers_icon.png',
      private: '../assets/private_icon.png'
    };
    visibilityIcon.src = iconMap[value] || iconMap.public;
  });

  const miniPrivacy = document.getElementById('privacy');
  if (miniPrivacy) {
    visibilitySelect.value = miniPrivacy.value;
    const iconMap = {
      public: '../assets/public_icon.png',
      followers: '../assets/followers_icon.png',
      private: '../assets/private_icon.png'
    };
    visibilityIcon.src = iconMap[miniPrivacy.value] || iconMap.public;
  }

  container.append(imageLabel, videoLabel, visibility);
  return {
    uploadControls: container,
    fileInputImage,
    fileInputVideo,
    visibilitySelect
  };
}

function createSaveButton() {
  const btn = document.createElement('button');
  btn.className = 'save-edit-button';
  btn.textContent = 'Save';
  return btn;
}

function createCancelButton(onClick) {
  const btn = document.createElement('button');
  btn.className = 'cancel-edit-button';
  btn.textContent = 'Cancel';
  btn.onclick = onClick;
  return btn;
}

function updatePostContent(container, newContent, sharedCard, paragraph, fileInputImage, fileInputVideo, oldImg, oldVid) {
  const hasText = newContent.replace(/<[^>]*>/g, '').trim() !== '';
  if (paragraph && hasText) {
    paragraph.innerHTML = newContent;
    paragraph.classList.remove('hidden');
  } else if (paragraph && !hasText) {
    paragraph.remove();
  } else if (!paragraph && hasText) {
    const p = document.createElement('p');
    p.innerHTML = newContent;
    sharedCard
      ? container.insertBefore(p, sharedCard)
      : container.insertBefore(p, container.firstChild);
  }

  const file = fileInputImage.files[0] || fileInputVideo.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const isVideo = file.type.startsWith('video');
    const media = document.createElement(isVideo ? 'video' : 'img');
    if (isVideo) media.controls = true;
    media.src = e.target.result;
    media.className = isVideo ? 'preview-video' : 'preview-image';

    if (oldImg) oldImg.remove();
    if (oldVid) oldVid.remove();

    sharedCard
      ? container.insertBefore(media, sharedCard)
      : container.appendChild(media);
  };
  reader.readAsDataURL(file);
}

let postToDelete = null;

function deletePost(button) {
  console.log('Delete button clicked');
  postToDelete = button.closest('.sample-post');
  const modal = document.getElementById('delete_post_modal');
  if (modal) modal.classList.remove('hidden');
}

function closeDeletePostModal() {
  const modal = document.getElementById('delete_post_modal');
  if (modal) modal.classList.add('hidden');
  postToDelete = null;
}

function confirmDeletePost() {
  if (!postToDelete) return;

  const postId = postToDelete.dataset.postId;

  fetch('../php/delete_post.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        postToDelete.remove();
      } else {
        alert(data.error || 'Failed to delete post');
      }
    })
    .catch(error => {
      console.error('Error deleting post:', error);
    })
    .finally(() => {
      closeDeletePostModal();
    });
}

function closeDeletePostModal() {
  const modal = document.getElementById('delete_post_modal');
  if (modal) modal.classList.add('hidden');
  postToDelete = null;
}

function confirmDeletePost() {
  if (!postToDelete) return;

  const postId = postToDelete.dataset.postId;

  fetch('../php/delete_post.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        postToDelete.remove();
      } else {
        alert(data.error || 'Failed to delete post');
      }
    })
    .catch(error => {
      console.error('Error deleting post:', error);
    })
    .finally(() => {
      closeDeletePostModal();
    });
}

// Updated toggleLike function to work with database
function toggleLike(button, postId) {
  const outlineIcon = button.querySelector(".heart-icon.outline");
  const filledIcon = button.querySelector(".heart-icon.filled");
  const likeCountSpan = button.nextElementSibling;

  if (!outlineIcon || !filledIcon) {
    console.error("Heart icons missing!");
    return;
  }

  const isLiked = filledIcon && !filledIcon.classList.contains("hidden");

  // Send to backend
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
      // Update UI
      if (isLiked) {
        outlineIcon.classList.remove("hidden");
        filledIcon.classList.add("hidden");
        likeCountSpan.textContent = Math.max(0, parseInt(likeCountSpan.textContent) - 1);
      } else {
        outlineIcon.classList.add("hidden");
        filledIcon.classList.remove("hidden");
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;

        sendNotification('like', postId, 'liked your post.');
      }
    }
  })
  .catch(error => {
    console.error('Error toggling like:', error);
  });
}

function updatePrivacyIcons(value) {
  const iconMap = {
    public: "../assets/public_icon.png",
    followers: "../assets/followers_icon.png",
    private: "../assets/private_icon.png"
  };

  const selectedIcon = iconMap[value];

  const modalIcon = document.getElementById("modal_privacy_icon");
  const miniIcon = document.getElementById("mini_privacy_icon");

  if (modalIcon) modalIcon.src = selectedIcon;
  if (miniIcon) miniIcon.src = selectedIcon;
}

function syncPrivacyToModal() {
  const miniSelect = document.getElementById("privacy");
  const modalSelect = document.getElementById("privacy_setting");

  if (miniSelect && modalSelect) {
    modalSelect.value = miniSelect.value;
    updatePrivacyIcons(miniSelect.value);
  }
}

function syncPrivacyToMini() {
  const miniSelect = document.getElementById("privacy");
  const modalSelect = document.getElementById("privacy_setting");

  if (miniSelect && modalSelect) {
    miniSelect.value = modalSelect.value;
    updatePrivacyIcons(modalSelect.value);
  }
}

 function bindPrivacyEvents() {
    const miniSelect = document.getElementById("privacy");
    const modalSelect = document.getElementById("privacy_setting");

    if (miniSelect) {
      miniSelect.addEventListener("change", () => {
        syncPrivacyToModal();
      });
    }

    if (modalSelect) {
      modalSelect.addEventListener("change", () => {
        syncPrivacyToMini();
      });
    }
  }

// Rest of your existing functions
function openPostModal(event) {
  if (event && event.target.closest("#privacy")) {
    return;
  }

  const postModal = document.getElementById("post_modal");
  postModal.classList.remove("hidden");
  postModal.classList.add("flex-center");

  document.body.classList.add("no-scroll");

  syncPrivacyToModal();
}

function closePostModal() {
  const postModal = document.getElementById("post_modal");
  postModal.classList.add("hidden");
  postModal.classList.remove("flex-center");

  document.body.classList.remove("no-scroll");
}

window.addEventListener("click", function (e) {
  const postModal = document.getElementById("post_modal");
  const shareModal = document.getElementById("share_modal");
  const logoutModal = document.getElementById("logout_modal");
  if (e.target === postModal) {
    closePostModal();
  } else if (e.target === shareModal) {
    closeShareModal();
  } else if (e.target === logoutModal) {
    hideLogout();
  }
});


function cancelDropdown(button) {
  const parent = button.closest(".more-option");
  parent.classList.remove("active");

  const post = button.closest('.sample-post');
  const contentDiv = post.querySelector('.content');

  const elementsToRemove = [
    '.edit-editor',
    '.formatting-options',
    '.upload-controls',
    '.save-edit-button',
    '.cancel-edit-button'
  ];

  elementsToRemove.forEach(selector => {
    const el = contentDiv.querySelector(selector);
    if (el) el.remove();
  });

  const paragraph = contentDiv.querySelector('p:not(.shared-card p)');
  if (paragraph) paragraph.classList.remove('hidden');
}

function toggleDropdown(icon) {
  const parent = icon.parentElement;

  document.querySelectorAll('.more-option.active').forEach(dropdown => {
    if (dropdown !== parent) {
      dropdown.classList.remove('active');
      const post = dropdown.closest('.sample-post');
      const contentDiv = post?.querySelector('.content');

      if (contentDiv) {
        const editorDiv = contentDiv.querySelector('.edit-editor');
        const formatting = contentDiv.querySelector('.formatting-options');
        const uploadControls = contentDiv.querySelector('.upload-controls');
        const saveBtn = contentDiv.querySelector('.save-edit-button');
        const cancelBtn = contentDiv.querySelector('.cancel-edit-button');
        const paragraph = contentDiv.querySelector('p:not(.shared-card p)');

        [editorDiv, formatting, uploadControls, saveBtn, cancelBtn].forEach(el => {
          if (el) el.remove();
        });

        if (paragraph) paragraph.classList.remove('hidden');
      }
    }
  });

  parent.classList.toggle("active");

  if (parent.classList.contains("active")) {
    document.body.onclick = handleOutsideClick;
  } else {
    document.body.onclick = null;
  }
}

function formatText(command) {
  const editor = document.getElementById("editor");
  editor.focus();
  document.execCommand(command, false, null);
  updateFormattingButtonStates();
}

function updateFormattingButtonStates() {
  const commands = {
    bold: "B",
    italic: "I",
    underline: "U"
  };

  Object.entries(commands).forEach(([cmd, text]) => {
    const button = [...document.querySelectorAll(".formatting-options button")]
      .find(btn => btn.textContent.trim() === text);
    if (!button) return;

    const isActive = document.queryCommandState(cmd);
    button.classList.toggle("active", isActive);
  });
}

document.addEventListener("selectionchange", () => {
  const editor = document.getElementById("editor");
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    updateFormattingButtonStates();
  }
});

// Listen for keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const editor = document.getElementById("editor");
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        setTimeout(updateFormattingButtonStates, 10);
      } else if (e.key === 'i' || e.key === 'I') {
        setTimeout(updateFormattingButtonStates, 10);
      } else if (e.key === 'u' || e.key === 'U') {
        setTimeout(updateFormattingButtonStates, 10);
      }
    }
  }
});

const imageInput = document.getElementById("media_input");
const videoInput = document.getElementById("media_input_video");
const previewContainer = document.getElementById("preview_container");

function handleFileInput(input, isVideo = false) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    previewContainer.innerHTML = "";

    const media = document.createElement(isVideo ? "video" : "img");
    if (isVideo) media.controls = true;
    media.src = e.target.result;

    const wrapper = document.createElement("div");
    wrapper.classList.add("preview-item");

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => {
      previewContainer.innerHTML = "";
      if (input) input.value = "";
    };

    wrapper.appendChild(media);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  };
  reader.readAsDataURL(file);
}

if (imageInput) imageInput.addEventListener("change", () => handleFileInput(imageInput));
if (videoInput) videoInput.addEventListener("change", () => handleFileInput(videoInput, true));

function addMediaToPost(file, isVideo = false, targetContentDiv) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const media = document.createElement(isVideo ? "video" : "img");
    if (isVideo) media.controls = true;
    media.src = e.target.result;
    media.classList.add(isVideo ? "preview-video" : "preview-image");
    targetContentDiv.appendChild(media);
  };
  reader.readAsDataURL(file);
}

function initializeMediaUpload() {
  const triggerImageInput = document.getElementById("trigger_media_image");
  const triggerVideoInput = document.getElementById("trigger_media_video");

  const modalImageInput = document.getElementById("media_input");
  const modalVideoInput = document.getElementById("media_input_video");
  const previewContainer = document.getElementById("preview_container");

  function handleFilePreview(input, isVideo = false) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      previewContainer.innerHTML = "";

      const media = document.createElement(isVideo ? "video" : "img");
      if (isVideo) media.controls = true;
      media.src = e.target.result;
      media.classList.add("preview-media");

      const wrapper = document.createElement("div");
      wrapper.classList.add("preview-item");

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.onclick = () => {
        previewContainer.innerHTML = "";
        input.value = "";
      };

      wrapper.appendChild(media);
      wrapper.appendChild(removeBtn);
      previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  }

  if (triggerImageInput && modalImageInput) {
    triggerImageInput.onchange = () => {
      const file = triggerImageInput.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        modalImageInput.files = dt.files;
        modalImageInput.dispatchEvent(new Event("change"));
        handleFilePreview(modalImageInput, false);
      }
    };
  }

  if (triggerVideoInput && modalVideoInput) {
    triggerVideoInput.onchange = () => {
      const file = triggerVideoInput.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        modalVideoInput.files = dt.files;
        modalVideoInput.dispatchEvent(new Event("change"));
        handleFilePreview(modalVideoInput, true);
      }
    };
  }
}

function loadSuggestedUsers(limit = 4, page = 1) {
  fetch(`../php/get_suggestion.php?limit=${limit}&page=${page}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      const container = document.getElementById("suggested_users_container");
      container.innerHTML = "";
      users = data.users;

      if (users.length === 0) {
        container.innerHTML = "<p>No suggestions available.</p>";
        return;
      }

      users.forEach((user) => {
        const div = document.createElement("div");
        div.className = "suggested-user";
        div.setAttribute("data-user-id", user.user_id);
        div.addEventListener("click", (e) => {
          const userId = e.currentTarget.dataset.userId;
          redirectToSuggestedPage(userId);
        });

        const fullName = `${user.first_name ?? ""} ${user.middle_name ?? ""} ${user.last_name ?? ""}`.trim();
        const profileImg = user.profile_picture_url ? user.profile_picture_url : "../assets/temporary_pfp.png";

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

      setTimeout(() => {
        initializeFollowStatus();
      }, 100);
    })
    .catch((error) => {
      console.error("Error loading suggested users:", error);
    });
}

function redirectToSuggestedPage(userId) {
  console.log("Redirecting to suggested page for user ID:", userId);
  window.location.href = `../html/suggestion.html?userId=${userId}`;
}

function handleFollowClick(event) {
  event.stopPropagation();
  toggleFollow(event.target);
}

function toggleFollow(button) {
  const userCard = button.closest('.suggested-user');
  const username = userCard.querySelector('.user-info p:last-child').textContent.replace('@', '');
  const userId = button.dataset.userId;

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
        // followStatusCache[username] = true;
        sendNotification('follow', userId, 'Started following you.');
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
        // followStatusCache[username] = false;
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

function menuToggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  if (!dropdown) return;

  dropdown.classList.toggle("hidden");

  if (!dropdown.classList.contains("hidden")) {
    const handleClose = () => {
      dropdown.classList.add("hidden");
      document.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose);
    };

    setTimeout(() => {
      document.addEventListener("click", handleClose);
      window.addEventListener("scroll", handleClose);
    }, 0);
  }
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  if (panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
  loadNotifications();
}

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
      console.error('Failed to send notification:', data.error);
    }
  })
  .catch(error => {
    console.error('Network error while sending notification:', error);
  });
}

function loadNotifications() {
  fetch('../php/get_notifications.php')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const container = document.getElementById('notification_container');
        container.innerHTML = "";

        if (data.length === 0) {
          container.innerHTML = "<p>No notifications available.</p>";
          return;
        }

        data.notifications.forEach(notif => {
          const div = document.createElement('div');
          div.className = "notification";

          let html = `
            <img src="${notif.profile_picture_url || '../assets/temporary_pfp.png'}" class="notif-pfp" />
            <div class="notif-content">
              <div class="notif-middle-content">
                <p><strong>${notif.username}</strong><span> ${notif.message}</span></p>
                <p class="time">${formatTime(notif.created_at)}</p>
              </div>
              ${notif.media_url ? `<img src="${notif.media_url}" class="notif-thumbnail"/>` : ''}
            </div>
          `;

          div.innerHTML = html;
          container.appendChild(div);
        });
      }
    });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

let currentPostIdForComments = null;

function toggleCommentModal(button) {
  const postElement = button.closest('.sample-post');
  if (!postElement || !postElement.dataset.postId) {
    console.warn('Post element or post ID missing.');
    alert('Cannot identify which post to comment on.');
    return;
  }

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
  previewEl.innerHTML = '';

  const profilePic = postElement.querySelector('.post-header-left .profile-pic')?.src || '../assets/temporary_pfp.png';
  const username = postElement.querySelector('.post-info .username')?.textContent || 'User';
  const timestamp = postElement.querySelector('.timestamp')?.textContent || '';
  const contentEl = postElement.querySelector('.post-content');

  const clonedContent = contentEl?.cloneNode(true);
  clonedContent?.querySelector('.post-actions')?.remove();

  previewEl.insertAdjacentHTML(
    'beforeend',
    `
    <div class="comment-post-header">
      <img
        src="${profilePic}"
        alt="${username}"
        class="comment-preview-avatar"
        onerror="this.src='../assets/temporary_pfp.png'"
      >
      <div class="comment-preview-user-meta">
        <span class="comment-preview-username">${username}</span>
        <span class="comment-preview-timestamp">${timestamp}</span>
      </div>
    </div>
    `
  );

  if (clonedContent) {
    previewEl.appendChild(clonedContent);
    previewEl.querySelectorAll('img').forEach(img => {
    img.classList.add('preview-image');
    });
    previewEl.querySelectorAll('video').forEach(video => {
      video.classList.add('preview-video');
    });

  }

  // Reset scroll positions
  previewEl.scrollTop = 0;
  const scrollable = document.getElementById('commentModalScrollable');
  if (scrollable) scrollable.scrollTop = 0;

  // Show modal
  overlayEl.classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';

  loadComments(currentPostIdForComments, commentListEl);
  setTimeout(() => inputEl.focus(), 300);

  if (window.commentPollingInterval) clearInterval(window.commentPollingInterval);
    window.commentPollingInterval = setInterval(() => {
      loadComments(currentPostIdForComments, document.getElementById('commentListContainer'));
    }, 5000);

}


function closeCommentModal() {
    const overlay = document.getElementById('commentModalOverlay');
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.value = '';
    }

    if (window.commentPollingInterval) {
      clearInterval(window.commentPollingInterval);
      window.commentPollingInterval = null;
    }
}

function loadComments(postId, commentListContainer) {
  fetch(`../php/comment_crud.php?action=get&post_id=${postId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayComments(data.comments, commentListContainer);
        updateCommentCount(postId);
      } else {
        console.error(data.error);
      }
    });
    updateCommentTimes();

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
    avatar.src = c.profile_picture_url || currentUserProfilePic || '../assets/temporary_pfp.png';
    avatar.alt = 'Avatar';
    avatar.onclick = () => {
      window.location.href = `../php/profile.php?user_id=${c.user_id}`;
    };

    const bubble = document.createElement('div');
    bubble.className = 'comment-bubble';

    const header = document.createElement('div');
    header.className = 'comment-header';

    const name = document.createElement('span');
    name.className = 'comment-username';
    name.innerHTML = `<a href="../php/profile.php?user_id=${c.user_id}" class="comment-username-link">${c.username}</a>`;

    const ts = document.createElement('span');
    ts.className = 'comment-timestamp';
    ts.dataset.timestamp = c.timestamp;
    ts.textContent = formatTime(c.timestamp);

    header.appendChild(name);
    header.appendChild(ts);
    bubble.appendChild(header);

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = c.comment_content;
    bubble.appendChild(text);

    entry.appendChild(avatar);
    entry.appendChild(bubble);

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
  document.querySelectorAll('.comment-timestamp[data-timestamp]').forEach(el => {
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

  textEl.style.display = 'none';

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
      } else {
        alert('Failed to update comment');
      }
    });
  };

  cancelBtn.onclick = () => {
    textEl.style.display = '';
    formWrapper.remove();
  };
}

let commentToDeleteId = null;

function deleteComment(commentId) {
  document.querySelectorAll('.comment-context-menu').forEach(menu => menu.remove());

  commentToDeleteId = commentId;

  const modal = document.getElementById('delete_comment_modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');

    const confirmBtn = modal.querySelector('.submit-button');
    const cancelBtn = modal.querySelector('.cancel-btn');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
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
    });

    cancelBtn.onclick = () => {
      closeMyNewModal();
    };
  }
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
  linkInput.value = `https://www.hershive.com/post/${postId}`;

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
        alert("Post shared successfully!");
        closeShareModal();
        loadPosts();
      } else {
        alert(data.error || "Error sharing post");
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      alert("Error sharing post");
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

function hideLogout() {
  document.getElementById("logout_modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function toggleLogout() {
  document.getElementById("logout_modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

document.addEventListener('DOMContentLoaded', function() {
  const settingsLink = document.querySelector('a[href*="settings"]');
  if (settingsLink) {
    settingsLink.addEventListener('click', function(e) {
      console.log('Settings link clicked');
      console.log('Href:', this.href);
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
    fetch('../php/get_user_stats.php')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            document.getElementById('post_count').textContent = data.posts;
            document.getElementById('follower_count').textContent = data.followers;
            document.getElementById('following_count').textContent = data.following;
        })
        .catch(error => {
            console.error("Failed to load user stats:", error);
        });
});

document.getElementById("search_input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    performSearch();
  }
});

function performSearch() {
  const query = document.getElementById("search_input").value.trim();
  if (!query) return;
  const createBox = document.querySelector(".create-post");
  if (createBox) createBox.classList.add("hidden");
  fetch(`../php/search.php?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert(data.error || "Search failed");
        return;
      }
      const noResultsMessage = document.getElementById("no_results_message");
    const noUsers = (!data.user && (!data.users || data.users.length === 0));
    const noPosts = !data.posts || data.posts.length === 0;
    if (noUsers && noPosts) {
      if (noResultsMessage) noResultsMessage.classList.remove("hidden");
    } else {
      if (noResultsMessage) noResultsMessage.classList.add("hidden");
    }
      const oldPreviewContainer = document.querySelector(".user-preview-container");
      if (oldPreviewContainer) oldPreviewContainer.innerHTML = "";
      const searchResultsContainer = document.getElementById("search_results_container");
      if (searchResultsContainer) {
        searchResultsContainer.classList.remove("hidden");
      }
      const postElements = document.querySelectorAll(".sample-post");
      postElements.forEach(post => post.remove());
      if (data.type === "exact_user") {
        renderTopUserResult(data.user);
        renderMorePeople([]);
        const visiblePosts = data.posts.filter(post => {
          if (post.visibility === 'public') return true;
          if (post.sharer_username === currentUser) return true;
          if (post.visibility === 'followers') {
            return true;
          }
          return false;
        });
        displayPosts(visiblePosts);
      }
      else if (data.type === "user_post_mix") {
        if (data.users && data.users.length > 0) {
          renderTopUserResult(data.users[0]);
          renderMorePeople(data.users.slice(1));
        }
        // Posts are already filtered by visibility in the backend
        displayPosts(data.posts);
      }
    })
    .catch(err => {
      console.error("Search error:", err);
      alert("Search failed. See console for details.");
    });
}

function renderTopUserResult(user) {
  const topUserResult = document.getElementById("top_user_result");
  if (!topUserResult) return;

  topUserResult.innerHTML = `
    <div class="top-user-card">
      <img src="${user.profile_picture_url || '../assets/temporary_pfp.png'}"
           class="top-user-avatar" alt="${user.first_name} ${user.last_name}">
      <div class="top-user-info">
        <h3 class="top-user-name">${user.first_name} ${user.last_name}</h3>
        <p class="top-user-handle">@${user.username}</p>
        <div class="top-user-stats">
          <div class="stat-item">
            <span class="icon-people"></span>
            <span>${user.following_count || 0} following</span>
          </div>
          <div class="stat-item">
            <span class="icon-followers"></span>
            <span>${user.followers_count || 0} followers</span>
          </div>
        </div>
        ${user.username !== currentUser
          ? `<button class="follow-button" onclick="toggleTopUserFollow(this,
          '${user.username}')">Follow</button>`: ""}
      </div>
    </div>
  `;

  setTimeout(() => {
    initializeFollowStatus();
  }, 100);
}

function renderMorePeople(users) {
  const morePeopleList = document.getElementById("more_people_list");
  const seeMoreBtn = document.getElementById("see_more_users_button");
  const morePeopleSection = document.getElementById("more_people_section");

  allSearchedUsers = users;

  if (!morePeopleList || !seeMoreBtn || !morePeopleSection) return;

  if (users.length === 0) {
    morePeopleSection.classList.add("hidden");
    return;
  } else {
    morePeopleSection.classList.remove("hidden");
  }

  morePeopleList.innerHTML = "";

  const displayUsers = users.slice(0, 3);
  displayUsers.forEach(user => {
    morePeopleList.appendChild(createMoreUserElement(user));
  });

  if (users.length > 3) {
    seeMoreBtn.classList.remove("hidden");
    seeMoreBtn.onclick = showAllUsers;
  } else {
    seeMoreBtn.classList.add("hidden");
  }

  setTimeout(() => {
    initializeFollowStatus();
  }, 100);
}

function toggleTopUserFollow(button, username) {
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
        followStatusCache[username] = true;
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
        followStatusCache[username] = false;
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

function toggleMorePeopleFollow(button, username) {
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
        followStatusCache[username] = true;
      } else {
        button.textContent = "Follow";
        button.classList.remove("following");
        followStatusCache[username] = false;
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

function initializeFollowStatus() {
  const usernames = [];

  const followButtons = document.querySelectorAll('.post-follow-btn, .follow-button, .more-people-follow-btn');
  followButtons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    if (onclick) {
      const match = onclick.match(/'([^']+)'|"([^"]+)"/);
      if (match) {
        const username = match[1] || match[2];
        if (username && !usernames.includes(username)) {
          usernames.push(username);
        }
      }
    }
  });

  if (usernames.length === 0) return;

  fetch(`../php/check_follow_status.php?usernames=${usernames.join(',')}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        followStatusCache = data.follow_status;

        followButtons.forEach(button => {
          const onclick = button.getAttribute('onclick');
          if (onclick) {
            const match = onclick.match(/'([^']+)'|"([^"]+)"/);
            if (match) {
              const username = match[1] || match[2];
              if (followStatusCache[username]) {
                button.textContent = "Following";
                button.classList.add("following");
              } else {
                button.textContent = "Follow";
                button.classList.remove("following");
              }
            }
          }
        });
      }
    })
    .catch(error => {
      console.error('Error checking follow status:', error);
    });
}


function showAllUsers() {
  const morePeopleList = document.getElementById("more_people_list");
  const seeMoreBtn = document.getElementById("see_more_users_button");

  if (!morePeopleList || !allSearchedUsers.length) return;

  morePeopleList.innerHTML = "";

  allSearchedUsers.forEach(user => {
    morePeopleList.appendChild(createMoreUserElement(user));
  });

  morePeopleList.classList.add("expanded");

  if (seeMoreBtn) seeMoreBtn.classList.add("hidden");
}

function createMoreUserElement(user) {
  const userItem = document.createElement("div");
  userItem.className = "more-people-item";
  userItem.innerHTML = `
    <img src="${user.profile_picture_url || '../assets/temporary_pfp.png'}"
         class="more-people-avatar" alt="${user.first_name} ${user.last_name}">
    <div class="more-people-info">
      <p class="more-people-name">${user.first_name} ${user.last_name}</p>
      <p class="more-people-handle">@${user.username}</p>
    </div>
    ${user.username !== currentUser
      ? `<button class="more-people-follow-btn"
      onclick="toggleMorePeopleFollow(this, '${user.username}')">
           Follow</button>` : ""}`;
  return userItem;
}

function resetWall() {
  document.getElementById("search_input").value = "";

  const noResultsMessage = document.getElementById("no_results_message");
  if (noResultsMessage) noResultsMessage.classList.add("hidden");

  const createBox = document.querySelector(".create-post");
  if (createBox) createBox.classList.remove("hidden");

  const searchResultsContainer =
      document.getElementById("search_results_container");
  if (searchResultsContainer) {
    searchResultsContainer.classList.add("hidden");
  }

  const previewContainer = document.querySelector(".user-preview-container");
  const postElements = document.querySelectorAll(".sample-post");

  if (previewContainer) previewContainer.innerHTML = "";
  postElements.forEach(post => post.remove());

  loadPosts();
}

function handleOutsideClick(event) {
  const dropdowns = document.querySelectorAll('.more-option.active');
  dropdowns.forEach(dropdown => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function logout() {
  window.location.href = "../php/logout.php";
}