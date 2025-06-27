document.addEventListener("DOMContentLoaded", function () {
  loadProfilePosts();

  document.getElementById("media_input")?.addEventListener("change", function () {
    handleCreatePostFileInput(this, false);
  });
  document.getElementById("media_input_video")?.addEventListener("change", function () {
    handleCreatePostFileInput(this, true);
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

  document.getElementById('media_input')?.addEventListener('change', function() {
    handleFileInput(this, document.getElementById("profile_img_preview"));
  });
  document.getElementById('cover_media_input')?.addEventListener('change', function() {
    handleFileInput(this, document.getElementById("cover_img_preview"));
  });

  fetch('../php/get_user_stats.php')
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
});

function openPostModal(event) {
  event?.stopPropagation?.();
  const modal = document.getElementById("post_modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("editor").innerHTML = "";
    document.getElementById("preview_container").innerHTML = "";
    document.getElementById("media_input").value = "";
    document.getElementById("media_input_video").value = "";
    syncPrivacyToModal();
  }
}

function closePostModal() {
  document.getElementById("post_modal")?.classList.add("hidden");
}

function formatText(command) {
  document.execCommand(command, false, null);
}

function scrollToProfile() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.scrollToProfile = scrollToProfile;

function handleCreatePostFileInput(input, isVideo = false) {
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
  const parent = button.closest(".more-option");
  parent.classList.remove("active");
}

function openEditModal(button) {
  const modal = document.getElementById("edit_modal");
  modal.classList.remove("hidden");
  cancelDropdown(button);   
}

function closeEditModal() {
  const modal = document.getElementById("edit_modal");
  modal.classList.add("hidden");
}

function handleFileInput(input, previewElement) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    previewElement.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveProfileUpdates() {
  const profileInput = document.getElementById("media_input").files[0];
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

        if (profileInput) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const src = e.target.result;
            const profileImgs =
                document.querySelectorAll(".profile-img, .profile-img-preview");
            profileImgs.forEach(img => img.src = src);
          };
          reader.readAsDataURL(profileInput);
        }

        if (coverInput) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const src = e.target.result;
            const coverImgs =
                document.querySelectorAll(".cover-img, .cover-img-preview");
            coverImgs.forEach(img => img.src = src);
          };
          reader.readAsDataURL(coverInput);
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

function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "user-post";
  postDiv.dataset.postId = post.post_id;

  const isOwner = post.sharer_username === currentUser;
  const isShared = post.shared && post.original_post;

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="../assets/temporary_pfp.png" class="profile-pic" alt="User" />
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
  const paragraph = contentDiv.querySelector('p');
  const image = contentDiv.querySelector('img');
  const video = contentDiv.querySelector('video');

  if (contentDiv.querySelector('.edit-editor')) return;

  const editorDiv = document.createElement('div');
  editorDiv.className = 'edit-editor';
  editorDiv.contentEditable = true;
  editorDiv.innerHTML = paragraph.innerHTML;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.className = 'edit-media-input';

  const saveButton = document.createElement('button');
  saveButton.innerText = 'Save';
  saveButton.className = 'save-edit-button';

  saveButton.onclick = () => {
    const updatedContent = editorDiv.innerHTML.trim();

    if (!updatedContent || updatedContent === '<br>') {
      alert('Post content cannot be empty');
      return;
    }

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('content', updatedContent);

    if (fileInput.files.length > 0) {
      formData.append('media', fileInput.files[0]);
    }

    fetch('../php/edit_post.php', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        paragraph.innerHTML = updatedContent;
        paragraph.classList.remove('hidden');

        if (fileInput.files.length > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (video) {
              video.src = e.target.result;
            } else if (image) {
              image.src = e.target.result;
            } else {
              const mediaType = fileInput.files[0].type;
              if (mediaType.startsWith('video')) {
                const newVideo = document.createElement('video');
                newVideo.controls = true;
                newVideo.src = e.target.result;
                contentDiv.appendChild(newVideo);
              } else if (mediaType.startsWith('image')) {
                const newImg = document.createElement('img');
                newImg.src = e.target.result;
                newImg.alt = 'Post media';
                newImg.className = 'preview-image';
                contentDiv.appendChild(newImg);
              }
            }
          };
          reader.readAsDataURL(fileInput.files[0]);
        }

        editorDiv.remove();
        fileInput.remove();
        saveButton.remove();
      } else {
        alert(data.error || 'Failed to update post');
      }
    })
    .catch(error => {
      console.error('Error updating post:', error);
      alert('Error updating post');
    });
  };

  paragraph.classList.add('hidden');
  contentDiv.insertBefore(editorDiv, paragraph);
  contentDiv.insertBefore(fileInput, paragraph);
  contentDiv.insertBefore(saveButton, paragraph);
}

function deletePost(button) {
  const post = button.closest('.user-post');
  const postId = post.dataset.postId;

  if (confirm('Are you sure you want to delete this post?')) {
    fetch('../php/delete_post.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        post.remove();
      } else {
        alert(data.error || 'Failed to delete post');
      }
    })
    .catch(error => {
      console.error('Error deleting post:', error);
    });
  }
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
  const logoutSection = document.getElementById("logout");
  if (logoutSection) logoutSection.hidden = true;
}

function toggleLogout() {
  const logoutSection = document.getElementById("logout");
  if (logoutSection) logoutSection.hidden = false;
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closePostModal();
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