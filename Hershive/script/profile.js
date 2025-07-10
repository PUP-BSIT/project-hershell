document.addEventListener("DOMContentLoaded", function () {
  loadProfilePosts();
  initializeTabs();
  loadInitialData();
  initializeMediaUpload();

  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const userId = urlParams.get('user_id');

  if (tabParam) {
    switchTab(tabParam);

    setTimeout(() => {
      const tabsSection = document.querySelector('.post-section-toggle');
      if (tabsSection) {
        const offsetTop = tabsSection.getBoundingClientRect().top + window.pageYOffset;

        window.scrollTo({
          top: offsetTop - 20,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  window.addEventListener("click", function (e) {
    const logoutModal = document.getElementById("logout_modal");
    if (e.target === logoutModal) {
      hideLogout();
    }
  });

  document.getElementById("privacy")?.addEventListener("change", syncPrivacyToModal);
  document.getElementById("privacy_setting")?.addEventListener("change", syncPrivacyToMini);

  window.addEventListener("click", function (e) {
    const modal = document.getElementById("post_modal");
    if (
      modal &&
      !modal.classList.contains("hidden") &&
      !modal.querySelector(".create-post-modal").contains(e.target) &&
      e.target !== document.getElementById("share_trigger")
    ) {
      closePostModal();
    }
  });

  document.getElementById('profile_media_input')?.addEventListener('change', function() {
    handleFileInput(this, document.getElementById("profile_img_preview"));
  });
  document.getElementById('cover_media_input')?.addEventListener('change', function() {
    handleFileInput(this, document.getElementById("cover_img_preview"));
  });

  const statsUrl = userId ? `../php/get_user_stats.php?user_id=${userId}` :
      '../php/get_user_stats.php';

  fetch(statsUrl)
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
  
  // Initialize paste handling for text editor
  const editor = document.getElementById("editor");
  if (editor) {
    handlePaste(editor);
  }
  
  // Add formatting button state updates
  document.addEventListener("selectionchange", () => {
    const editor = document.getElementById("editor");
    if (document.activeElement === editor || editor.contains(document.activeElement)) {
      updateFormattingButtonStates();
    }
  });
  
  // Add keyboard shortcuts for text formatting
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
});

function openPostModal(event) {
  // Prevent opening when clicking privacy dropdown
  if (event && event.target.closest("#privacy")) {
    return;
  }
  
  // Prevent event bubbling
  event?.stopPropagation?.();
  
  const modal = document.getElementById("post_modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex-center");
    
    // Clear all form data
    document.getElementById("editor").innerHTML = "";
    document.getElementById("preview_container").innerHTML = "";
    document.getElementById("media_input").value = "";
    document.getElementById("media_input_video").value = "";
    
    // Prevent body scrolling
    document.body.classList.add("no-scroll");
    
    // Sync privacy settings
    syncPrivacyToModal();
  }
}

function closePostModal() {
  const postModal = document.getElementById("post_modal");
  if (postModal) {
    postModal.classList.add("hidden");
    postModal.classList.remove("flex-center");
    
    // Restore body scrolling
    document.body.classList.remove("no-scroll");
  }
}

function formatText(command) {
  document.execCommand(command, false, null);
}

function scrollToProfile() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.scrollToProfile = scrollToProfile;

function handleCreatePostFileInput(input, isVideo = false) { //dupliiiii
  const previewContainer = document.getElementById("preview_container");
  previewContainer.innerHTML = "";
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    if (isVideo) {
      const video = document.createElement("video");
      video.src = e.target.result;
      video.controls = true;
      video.className = "preview-video";
      previewContainer.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "preview-image";
      previewContainer.appendChild(img);
    }
  };
  reader.readAsDataURL(file);
}

function updatePrivacyIcons(value) {
  const iconMap = {
    public: "../assets/public_icon.png",
    followers: "../assets/followers_icon.png",
    private: "../assets/private_icon.png",
  };
  document.getElementById("mini_privacy_icon").src = iconMap[value] || iconMap.public;
  document.getElementById("modal_privacy_icon").src = iconMap[value] || iconMap.public;
}

function syncPrivacyToModal() {
  const mini = document.getElementById("privacy");
  const modal = document.getElementById("privacy_setting");
  if (mini && modal) {
    modal.value = mini.value;
    updatePrivacyIcons(mini.value);
  }
}
function syncPrivacyToMini() {
  const mini = document.getElementById("privacy");
  const modal = document.getElementById("privacy_setting");
  if (mini && modal) {
    mini.value = modal.value;
    updatePrivacyIcons(modal.value);
  }
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
    alert("Please add text, image, or video to your post.");
    return;
  }

  const formData = new FormData();
  if (hasText) formData.append("content", content);
  if (hasImage) formData.append("media", imageInput.files[0]);
  if (hasVideo) formData.append("media", videoInput.files[0]);

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
        loadProfilePosts();
      } else {
        alert(data.error || "Failed to create post.");
      }
    })
    .catch((err) => {
      alert("An error occurred while creating the post.");
    });
}

function loadProfilePosts() {
  const profileUserId = getProfileUserId();

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

function toggleDropdown(icon) {
  const parent = icon.parentElement;
  parent.classList.toggle("active");
}

function cancelDropdown(button) {
  if (!button) return;
  const parent = button.closest(".more-option");
  parent.classList.remove("active");
}

function openEditModal(button) {
  const modal = document.getElementById("edit_modal");
  modal.classList.remove("hidden");
  if (button) cancelDropdown(button);
}

function closeEditModal() {
  const modal = document.getElementById("edit_modal");
  modal.classList.add("hidden");
}

document.addEventListener('click', function (e) {
  document.querySelectorAll('.more-option.active').forEach(function(dropdown) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
});

function handleFileInput(input, previewElement) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    previewElement.src = e.target.result;
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

  // Connect trigger inputs to modal inputs
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

  // **Add these lines for direct modal input selection**
  if (modalImageInput) {
    modalImageInput.onchange = () => handleFilePreview(modalImageInput, false);
  }
  if (modalVideoInput) {
    modalVideoInput.onchange = () => handleFilePreview(modalVideoInput, true);
  }
}

// Handle paste events in text editor
function handlePaste(editor) {
  editor.addEventListener('paste', function(e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text/plain');
    const span = document.createElement("span");
    span.textContent = pastedText;
    span.style.whiteSpace = "pre-wrap";
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
}

// Update formatting button states
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

function saveProfileUpdates() {
  const profileInput = document.getElementById("profile_media_input").files[0];
  const coverInput = document.getElementById("cover_media_input").files[0];
  const bioText = document.getElementById("bio_textarea").value;

  const formData = new FormData();
  formData.append("bio", bioText);
  if (profileInput) formData.append("profile_picture", profileInput);
  if (coverInput) formData.append("cover_photo", coverInput);

  fetch("../php/update_profile.php", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const bioDisplay = document.querySelector(".bio-section p");
        if (bioDisplay) bioDisplay.innerText = bioText;

        if (data.profile_picture_url) {
          document.querySelectorAll(
            ".profile-img, .profile-img-preview, .modal-profile-pic, .main-create-post .profile-pic"
          ).forEach(img => {
            img.src = data.profile_picture_url + "?v=" + Date.now();
          });

          document.querySelectorAll('.user-post .profile-pic').forEach(img => {
            img.src = data.profile_picture_url + "?v=" + Date.now();
          });
        }

        if (data.cover_photo_url) {
          document.querySelectorAll(
            ".cover-img, .cover-img-preview"
          ).forEach(img => {
            img.src = data.cover_photo_url + "?v=" + Date.now();
          });
        }

        if (data.display_name) {
          const displayNameElem = document.getElementById("display_name");
          if (displayNameElem) displayNameElem.textContent = data.display_name;
        }
        if (data.username) {
          document.querySelectorAll(".username").forEach(el => {
            el.textContent = data.username;
          });
        }

        closeEditModal();
      } else {
        alert("Update failed: " + (data.error || "Unknown error"));
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      alert("An error occurred while updating the profile.");
    });
}

const currentUser = document.body.dataset.username || "";

function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "user-post"; // Use user-post for profile page
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

function displayPostsInContainer(posts) {
  const container = document.getElementById("post-container");
  if (!container) {
    console.error("No #post-container found.");
    return;
  }
  container.innerHTML = "";
  posts.forEach(post => {
    const postElement = createPostElement(post);
    container.appendChild(postElement);
  });
}

function getProfileUserId() {
  const span = document.getElementById("profile_user_id");
  if (span) return span.textContent.trim();

  const params = new URLSearchParams(window.location.search);
  return params.get("user_id") || "";
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

function editPost(button) {
  const post = button.closest('.user-post');
  const postId = post.dataset.postId;
  const contentDiv = post.querySelector('.content');
  const paragraph = contentDiv.querySelector('.post-text');
  const sharedCard = contentDiv.querySelector('.shared-card');
  const existingImage = contentDiv.querySelector('img:not(.shared-card img)');
  const existingVideo = contentDiv.querySelector('video:not(.shared-card video)');
  const postActions = post.querySelector('.post-actions');
  const visibilityIcon = post.querySelector('.visibility-icon');

  if (contentDiv.querySelector('.edit-editor')) return;

  const editor = createEditor(paragraph?.innerHTML || '');
  const formatting = createFormatting(editor);
  const { uploadControls, fileInputImage,
      fileInputVideo, visibilitySelect } = createUploadControls();
      console.log("Adding upload controls for post", postId);
      console.log("Appending to:", contentDiv);
      console.log("Upload controls added:", uploadControls);
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
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const hasText = plainText !== '';
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
        if (!data.success) {
          alert(data.error || 'Failed to update post');
          return;
        }

        updatePostContent(contentDiv, content, sharedCard, paragraph,
            fileInputImage, fileInputVideo, existingImage, existingVideo);
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

  const previewMedia = (file, isVideo) => {
    const reader = new FileReader();
    reader.onload = e => {
      const media = document.createElement(isVideo ? 'video' : 'img');
      media.src = e.target.result;
      media.className = isVideo ? 'preview-video' : 'preview-image';
      if (isVideo) media.controls = true;

      const existing = container.querySelector('.preview-image, .preview-video');
      if (existing) existing.remove();

      container.appendChild(media);
    };
    reader.readAsDataURL(file);
  };

  fileInputImage.addEventListener('change', () => {
    if (fileInputImage.files.length > 0) {
      fileInputVideo.value = '';
      previewMedia(fileInputImage.files[0], false);
    }
  });

  fileInputVideo.addEventListener('change', () => {
    if (fileInputVideo.files.length > 0) {
      fileInputImage.value = '';
      previewMedia(fileInputVideo.files[0], true);
    }
  });

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

function updatePostContent(container, newContent, sharedCard, paragraph,
    fileInputImage, fileInputVideo, oldImg, oldVid) {
  const hasText = newContent.replace(/<[^>]*>/g, '').trim() !== '';

  if (paragraph) {
    if (hasText) {
      paragraph.innerHTML = newContent;
      paragraph.classList.remove('hidden');
    } else {
      paragraph.remove();
    }
  } else if (hasText) {
    const newText = document.createElement('div');
    newText.className = 'post-text';
    newText.innerHTML = newContent;
    if (sharedCard) {
      container.insertBefore(newText, sharedCard);
    } else {
      container.insertBefore(newText, container.firstChild);
    }
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

    if (sharedCard) {
      container.insertBefore(media, sharedCard);
    } else {
      container.appendChild(media);
    }
  };
  reader.readAsDataURL(file);
}

function deletePost(button) {
  postToDelete = button.closest('.user-post');
  document.getElementById('delete_post_modal').classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeDeletePostModal() {
  document.getElementById('delete_post_modal').classList.add('hidden');
  document.body.classList.remove('no-scroll');
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
      closeDeletePostModal();
    } else {
      alert(data.error || 'Failed to delete post');
    }
  })
  .catch(error => {
    console.error('Error deleting post:', error);
    alert('Error deleting post');
  });
}

function toggleShareModal(postElement) {
  const modal = document.getElementById("share_modal");
  const preview = document.getElementById("shared_post_preview");
  const postIdInput = document.getElementById("shared_post_id");
  const linkInput = document.getElementById("share_link");

  const content = postElement
      .querySelector(".content")?.innerHTML || "No content";
  const postId = postElement.dataset.postId;

  preview.innerHTML = content;
  postIdInput.value = postId;
  linkInput.value = `https://www.hershive.com/post/${postId}`;

  modal.classList.remove("hidden");
}

function closeShareModal() {
  const shareModal = document.getElementById("share_modal");
  if (shareModal) {
    shareModal.classList.add("hidden");
  }
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
        loadProfilePosts();
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

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closePostModal();
  }
});

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  if (panel) {
    const isActive = panel.classList.contains("active");
    document.querySelectorAll('.notification-panel').forEach(p => p.classList.remove('active'));
    if (!isActive) {
      panel.classList.add("active");
      loadNotifications();
    }
  }
}

let allNotifications = [];
let notificationsShown = 0;
const INITIAL_SHOW = 6;
const PREVIEW_COUNT = 5;

function loadNotifications() {
  fetch('../php/get_notifications.php')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('notification_container');
      if (!container) return;
      container.innerHTML = "";

      if (!data.success || !data.notifications || data.notifications.length === 0) {
        container.innerHTML = "<p>No notifications available.</p>";
        return;
      }

      allNotifications = data.notifications;
      notificationsShown = 0;
      appendNotifications(INITIAL_SHOW);
    });
}

function appendNotifications(count) {
  const container = document.getElementById('notification_container');
  const start = notificationsShown;
  const end = Math.min(notificationsShown + count, allNotifications.length);

  for (let i = start; i < end; i++) {
    const notif = allNotifications[i];
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
  }

  notificationsShown = end;

  const oldPreview = document.querySelector('.notification-preview');
  if (oldPreview) oldPreview.remove();

  if (notificationsShown < allNotifications.length) {
    const previewDiv = document.createElement('div');
    previewDiv.className = "notification-preview";
    previewDiv.innerHTML = `<button id="showPreviewBtn" style="padding:6px 18px;border-radius:20px;background:#e0c48f;border:none;color:#222;cursor:pointer;">Show previous</button>`;
    container.appendChild(previewDiv);

    document.getElementById('showPreviewBtn').onclick = function(e) {
      e.stopPropagation();
      appendNotifications(PREVIEW_COUNT);
    };
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}   

document.addEventListener('click', function (e) {
  const panel = document.getElementById("notification_panel");
  if (!panel) return;
  if (
    !panel.contains(e.target) &&
    !e.target.closest('button[onclick="toggleNotificationPanel()"]')
  ) {
    panel.classList.remove("active");
  }
});

// --- Make functions available globally for inline onclick ---
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.formatText = formatText;
window.submitPost = submitPost;
window.toggleDropdown = toggleDropdown;
window.cancelDropdown = cancelDropdown;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveProfileUpdates = saveProfileUpdates;
window.editPost = editPost;
window.deletePost = deletePost;
window.toggleShareModal = toggleShareModal;
window.closeShareModal = closeShareModal;
window.submitShare = submitShare;
window.copyLink = copyLink;

// Tab functionality
let currentUserId = null;
let targetUserId = null;
let followersLoaded = false;
let followingLoaded = false;

function loadInitialData() {
  targetUserId = getProfileUserId();
  currentUserId = document.body.dataset.userId || document.body.dataset.username;
}

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
  if (!targetUserId) return;

  const loadingElement = document.getElementById('followers-loading');
  const listElement = document.getElementById('followers-list');

  loadingElement.style.display = 'block';

  fetch(`../php/get_followers.php?user_id=${targetUserId}`)
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
  if (!targetUserId) return;

  const loadingElement = document.getElementById('following-loading');
  const listElement = document.getElementById('following-list');

  loadingElement.style.display = 'block';

  fetch(`../php/get_following.php?user_id=${targetUserId}`)
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
              onclick="toggleFollow(${user.user_id}, this)">
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

function toggleFollow(userId, button) {
  const isFollowing = button.classList.contains('following');
  const action = isFollowing ? 'unfollow' : 'follow';
  const userItem = button.closest('.user-item');
  const username = userItem.querySelector('.user-username').textContent.replace('@', '');

  fetch(`../php/follow.php`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          action: action,
          username: username
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          if (isFollowing) {
              button.classList.remove('following');
              button.textContent = 'Follow';
          } else {
              button.classList.add('following');
              button.textContent = 'Following';
          }

          try {
              if (!isFollowing) {
                  sendNotification('follow', userId, 'started following you.');
              }
          } catch (error) {
              console.error('Notification error:', error);
          }

          try {
              updateFollowStatsDirectly(action, username);
          } catch (error) {
              console.error('Stats update error:', error);
          }

          try {
              updateFollowCounts();
          } catch (error) {
              console.error('Follow counts update error:', error);
          }

          const urlParams = new URLSearchParams(window.location.search);
          const viewedUserId = urlParams.get('user_id');

          if (viewedUserId && viewedUserId === userId) {
              const followerCountElement = document.getElementById('followerCount');
              if (followerCountElement) {
                  let currentCount = parseInt(followerCountElement.textContent) || 0;
                  if (action === 'follow') {
                      followerCountElement.textContent = currentCount + 1;
                  } else {
                      followerCountElement.textContent = Math.max(0, currentCount - 1);
                  }
              }
          }
      } else {
          alert('Error: ' + (data.error || 'Could not update follow status'));
      }
  })
  .catch(error => {
      console.error('Error toggling follow:', error);
      alert('Error updating follow status');
  });
}

function updateFollowStatsDirectly(action, targetUsername) {
  const followerCountElement = document.getElementById('followerCount');
  const followingCountElement = document.getElementById('followingCount');

  const profileUserId = getProfileUserId();
  const currentUserFromBody = document.body.dataset.userId || document.body.dataset.username;

  const profileUsernameElement = document.querySelector('.username');
  const profileUsername = profileUsernameElement ? profileUsernameElement.textContent.trim() : '';

  if (action === 'follow') {
      if (profileUsername === targetUsername && followerCountElement) {
          const currentCount = parseInt(followerCountElement.textContent) || 0;
          followerCountElement.textContent = currentCount + 1;
      }

      if (profileUsername === currentUserFromBody && followingCountElement) {
          const currentCount = parseInt(followingCountElement.textContent) || 0;
          followingCountElement.textContent = currentCount + 1;
      }

  } else if (action === 'unfollow') {
      if (profileUsername === targetUsername && followerCountElement) {
          const currentCount = parseInt(followerCountElement.textContent) || 0;
          followerCountElement.textContent = Math.max(0, currentCount - 1);
      }

      if (profileUsername === currentUserFromBody && followingCountElement) {
          const currentCount = parseInt(followingCountElement.textContent) || 0;
          followingCountElement.textContent = Math.max(0, currentCount - 1);
      }
  }

  updateTabCountsDirectly(action, targetUsername);
}

function updateTabCountsDirectly(action, targetUsername) {
  const followersTab = document.querySelector('[data-tab="followers"]');
  const followingTab = document.querySelector('[data-tab="following"]');

  const profileUsernameElement = document.querySelector('.username');
  const profileUsername = profileUsernameElement ? profileUsernameElement.textContent.trim() : '';
  const currentUserFromBody = document.body.dataset.userId || document.body.dataset.username;

  if (action === 'follow') {
      if (profileUsername === targetUsername && followersTab) {
          const tabText = followersTab.textContent;
          const match = tabText.match(/(\d+)/);
          if (match) {
              const currentCount = parseInt(match[1]) || 0;
              const newText = tabText.replace(/\d+/, currentCount + 1);
              followersTab.innerHTML = newText;
          }
      }

      if (profileUsername === currentUserFromBody && followingTab) {
          const tabText = followingTab.textContent;
          const match = tabText.match(/(\d+)/);
          if (match) {
              const currentCount = parseInt(match[1]) || 0;
              const newText = tabText.replace(/\d+/, currentCount + 1);
              followingTab.innerHTML = newText;
          }
      }

  } else if (action === 'unfollow') {
      if (profileUsername === targetUsername && followersTab) {
          const tabText = followersTab.textContent;
          const match = tabText.match(/(\d+)/);
          if (match) {
              const currentCount = parseInt(match[1]) || 0;
              const newText = tabText.replace(/\d+/, Math.max(0, currentCount - 1));
              followersTab.innerHTML = newText;
          }
      }
      if (profileUsername === currentUserFromBody && followingTab) {
          const tabText = followingTab.textContent;
          const match = tabText.match(/(\d+)/);
          if (match) {
              const currentCount = parseInt(match[1]) || 0;
              const newText = tabText.replace(/\d+/, Math.max(0, currentCount - 1));
              followingTab.innerHTML = newText;
          }
      }
  }
}

function updateFollowCounts() {
  // Reset loaded flags to refresh data
  followersLoaded = false;
  followingLoaded = false;

  const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
  if (activeTab === 'followers') {
      loadFollowers();
  } else if (activeTab === 'following') {
      loadFollowing();
  }
}

// munu functionality

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

function logout() {
  window.location.href = "../php/logout.php";
}