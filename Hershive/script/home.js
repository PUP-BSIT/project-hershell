let currentUser = null;
let allSearchedUsers = [];

document.addEventListener("DOMContentLoaded", function() {
  checkUserSession();
  displaySuggestedUsers();
});

function checkUserSession() {
  fetch("../php/home.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.username;

        document.getElementById("display_name").textContent = data.username;
        document.getElementById("username").textContent = "@" + data.username;

        const mainCreatePostPic = document.querySelector
            (".main-create-post .profile-pic");
            if (mainCreatePostPic) {
              mainCreatePostPic.src = data.profile_picture_url ||
                  "../assets/temporary_pfp.png";
            }

        mainCreatePostPic.onerror = function () {
          this.src = "../assets/temporary_pfp.png";
        };

        const modalUsername = document.querySelector
            (".create-post-modal .username");
        if (modalUsername) {
          modalUsername.textContent = data.username;
        }

        loadPosts();
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
      } else {
        console.error('Failed to load posts:', data.error);
      }
    })
    .catch(error => {
      console.error('Error loading posts:', error);
    });
}

window.onload = loadPosts;

// Display posts in the feed
function displayPosts(posts) {
  const leftContent = document.querySelector(".left-content");

  // Clear existing posts (except the post creation form)
  const existingPosts = leftContent.querySelectorAll(".sample-post");
  existingPosts.forEach(post => post.remove());

  posts.forEach(post => {
    const postElement = createPostElement(post);
    leftContent.appendChild(postElement);
  });
}

// Create individual post element
function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "sample-post";
  postDiv.dataset.postId = post.post_id;

  // Determine if this post belongs to current user
  const isOwner = (post.sharer_username || post.username) === currentUser;
  const isShared = post.shared && post.original_post;

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="../assets/temporary_pfp.png" alt="user profile" class="profile-pic">
        <div class="post-info">
          <span class="username">${post.sharer_username}</span>
          <span class="timestamp">${post.formatted_time}</span>
        </div>
      </div>
      ${isOwner ? `
      <div class="more-option">
        <img src="../assets/more_icon.png" alt="more" onclick="toggleDropdown(this)">
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
          <div class="shared-card">
            <p class="shared-username">Originally posted by
              <strong>
                ${post.original_post.username}
              </strong>
            </p>
            <p>${post.original_post.content}</p>
            ${post.original_post.media_url ?
              (post.original_post.media_type === 'video'
                ? `<video controls class="preview-video">
                      <source src="${post.original_post.media_url}" type="video/mp4">
                    </video>`
                : `<img src="${post.original_post.media_url}" class="preview-image" alt="Shared Image">`)
              : ""}
          </div>
        ` : `
          ${post.media_url ?
            (post.media_type === 'video'
              ? `<video controls class="preview-video"><source src="${post.media_url}" type="video/mp4"></video>`
              : `<img src="${post.media_url}" class="preview-image" alt="Post Image">`)
            : ""}
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
            <div class="comment-list" id="comment-list"></div>
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
            <span class="close-share-modal" onclick="toggleShareModal(this.closest('.sample-post'))">&times;</span>
            <input class="share-link" type="text" value="https://example.com/post/${post.post_id}" readonly>
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

// Updated submitPost function to use database
function submitPost() {
  const editor = document.getElementById("editor");
  const postText = editor.innerHTML.trim();
  const imageFile = imageInput.files[0];
  const videoFile = videoInput.files[0];

  if (!postText || postText === "<br>") {
    alert("Please enter some text to post.");
    return;
  }

  // Create FormData for file upload if needed
  const formData = new FormData();
  formData.append('content', postText);

  if (imageFile) {
    formData.append('media', imageFile);
    formData.append('media_type', 'image');
  } else if (videoFile) {
    formData.append('media', videoFile);
    formData.append('media_type', 'video');
  }

  // Submit to backend
  fetch('../php/create-post.php', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Clear form
      editor.innerHTML = "";
      imageInput.value = "";
      videoInput.value = "";
      previewContainer.innerHTML = "";
      closePostModal();

      // Reload posts to show the new one
      loadPosts();
    } else {
      alert(data.error || 'Error creating post');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error creating post');
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
      }
    }
  })
  .catch(error => {
    console.error('Error toggling like:', error);
  });
}

// Rest of your existing functions
function openPostModal() {
  const postModal = document.getElementById("post_modal");
  postModal.classList.remove("hidden");
  postModal.classList.add("flex-center");
}

function closePostModal() {
  const postModal = document.getElementById("post_modal");
  postModal.classList.add("hidden");
  postModal.classList.remove("flex-center");
}

window.addEventListener("click", function (e) {
  const postModal = document.getElementById("post_modal");
  if (e.target === postModal) {
    closePostModal();
  }
});

function toggleDropdown(icon) {
  const parent = icon.parentElement;
  parent.classList.toggle("active");
}

function cancelDropdown(button) {
  const parent = button.closest(".more-option");
  parent.classList.remove("active");
}

function editPost(button) {
  const post = button.closest('.sample-post');
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
};

function deletePost(button) {
  const post = button.closest('.sample-post');
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

function formatText(command) {
  document.execCommand(command, false, null);
}

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

const suggestedUsers = [
  {
    username: "John Doe",
    handle: "@johndoe",
    image: "../assets/temporary_pfp.png",
  },
  {
    username: "Jane Smith",
    handle: "@janesmith",
    image: "../assets/temporary_pfp.png",
  },
  {
    username: "Alice Ray",
    handle: "@alice",
    image: "../assets/temporary_pfp.png",
  },
  {
    username: "Mark Zee",
    handle: "@markz",
    image: "../assets/temporary_pfp.png",
  },
];

function displaySuggestedUsers() {
  const container = document.getElementById("suggested_users_container");
  if (!container) return;

  suggestedUsers.forEach((user) => {
    const div = document.createElement("div");
    div.className = "suggested-user";
    div.innerHTML = `
      <img src="${user.image}" alt="${user.username}">
      <div class="user-info">
        <p><strong>${user.username}</strong></p>
        <p>${user.handle}</p>
      </div>
      <button onclick="toggleFollow(this)">Follow</button>`;
    container.appendChild(div);
  });
}

function toggleFollow(button) {
  const isFollowing = button.classList.contains("following");

  if (isFollowing) {
    button.textContent = "Follow";
    button.classList.remove("following");
  } else {
    button.textContent = "Following";
    button.classList.add("following");
  }
}

function menuToggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  if (dropdown) dropdown.classList.toggle("hidden");
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  if (panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
}

let currentPostIdForComments = null;

function toggleCommentModal(button) {
  const postElement = button.closest('.sample-post');
  const modal = postElement.querySelector('.comment-modal');
  const commentListContainer = modal.querySelector('.comment-list');
  modal.classList.remove('hidden');

  currentPostIdForComments = postElement.dataset.postId;
  loadComments(currentPostIdForComments, commentListContainer);
}

function closeCommentModal(button) {
  const modal = button.closest('.comment-modal');
  modal.classList.add('hidden');
}

function loadComments(postId, commentListContainer) {
  fetch(`../php/comment_crud.php?action=get&post_id=${postId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayComments(data.comments, commentListContainer);
      } else {
        console.error(data.error);
      }
    });
}

function displayComments(comments, container) {
  container.innerHTML = '';

  comments.forEach(comment => {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.setAttribute('data-id', comment.comment_id);

    const timeAgo = formatTime(comment.timestamp);

    commentDiv.innerHTML = `
      <div class="comment-content">
        <button class="comment-options" onclick="showCommentOptionsMenu(event, ${comment.comment_id}, ${comment.user_id})">&#8942;</button>
        <img src="${comment.avatar}" class="comment-avatar" />
        <div class="comment-header">
          <span class="comment-author">${comment.username}</span>
        </div>
        <p class="comment-text">${comment.comment_content}</p>
        <span class="comment-time">${timeAgo}</span>
      </div>
    `;

    container.appendChild(commentDiv);
  });
}

function showCommentOptionsMenu(e, commentId, commentUserId) {
  e.stopPropagation();

  document.querySelectorAll('.comment-context-menu').forEach(menu => menu.remove());

  const commentDiv = e.target.closest('.comment');
  if (!commentDiv) return;

  const newMenu = document.createElement('div');
  newMenu.className = 'comment-context-menu';
  newMenu.innerHTML = `
    <button onclick="editComment(${commentId})">Edit</button>
    <button onclick="deleteComment(${commentId})">Delete</button>
    <button onclick="cancelCommentMenu(this)">Cancel</button>
  `;

  newMenu.style.position = 'absolute';
  newMenu.style.top = '30px';
  newMenu.style.right = '0';

  commentDiv.appendChild(newMenu);

  setTimeout(() => {
    document.addEventListener('click', () => {
      newMenu.remove();
    }, { once: true });
  }, 0);
}

function cancelCommentMenu(button) {
  const menu = button.closest('.comment-context-menu');
  if (menu) menu.remove();
}

function submitComment(btn) {
  const input = btn.previousElementSibling;
  const content = input.value.trim();
  if (!content) return;

  fetch('../php/comment_crud.php?action=add', {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ post_id: currentPostIdForComments, content: content })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      input.value = '';
      loadComments(currentPostIdForComments);
    } else {
      alert('Failed to add comment');
    }
  });
}

function formatTime(timeStr) {
  const time = new Date(timeStr);
  const now = new Date();
  const diff = Math.floor((now - time) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function editComment(commentId) {
  const commentDiv = document.querySelector(`.comment[data-id='${commentId}']`);
  if (!commentDiv) return;

  const contentP = commentDiv.querySelector('p');
  const originalContent = contentP.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-comment-input';
  input.value = originalContent;

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.onclick = function () {
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
        contentP.textContent = newContent;
        input.remove();
        saveBtn.remove();
        contentP.style.display = '';
      } else {
        alert('Failed to update comment');
      }
    });
  };

  contentP.style.display = 'none';
  commentDiv.appendChild(input);
  commentDiv.appendChild(saveBtn);
}

function deleteComment(commentId) {
  if (!confirm("Are you sure you want to delete this comment?")) return;

  fetch('../php/comment_crud.php?action=delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ comment_id: commentId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadComments(currentPostIdForComments);
    } else {
      alert('Failed to delete comment');
    }
  });
}

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
}

function toggleShareModal(postElement) {
  const modal = document.getElementById("share_modal");
  const preview = document.getElementById("shared_post_preview");
  const postIdInput = document.getElementById("shared_post_id");
  const linkInput = document.getElementById("share_link");

  const content = postElement.querySelector(".content")?.innerHTML || "No content";
  const postId = postElement.dataset.postId;

  preview.innerHTML = content;
  postIdInput.value = postId;
  linkInput.value = `https://www.hershive.com/post/${postId}`; // adjust URL format as needed

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
      post_id: postId,        // original post being shared
      content: message        // now goes into the post table
    })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Post shared successfully!");
        closeShareModal();
        loadPosts(); // Refresh global wall
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
            document.getElementById('postCount').textContent = data.posts;
            document.getElementById('followerCount').textContent = data.followers;
            document.getElementById('followingCount').textContent = data.following;
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
        displayPosts(data.posts);
      }
      else if (data.type === "user_post_mix") {
        if (data.users && data.users.length > 0) {
          renderTopUserResult(data.users[0]);
          renderMorePeople(data.users.slice(1));
        }
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
            <span>0 following</span>
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
}

function toggleTopUserFollow(button, username) {
  const isFollowing = button.classList.contains("following");

  if (isFollowing) {
    button.textContent = "Follow";
    button.classList.remove("following");
  } else {
    button.textContent = "Following";
    button.classList.add("following");
  }

  console.log(`${isFollowing ? 'Unfollowed' : 'Followed'} ${username}`);
}

function toggleMorePeopleFollow(button, username) {
  const isFollowing = button.classList.contains("following");

  if (isFollowing) {
    button.textContent = "Follow";
    button.classList.remove("following");
  } else {
    button.textContent = "Following";
    button.classList.add("following");
  }

  console.log(`${isFollowing ? 'Unfollowed' : 'Followed'} ${username}`);
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

function logout() {
  window.location.href = "../php/logout.php";
}