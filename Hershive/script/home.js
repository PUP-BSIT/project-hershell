// Global variables
let currentUser = null;

// Initialize page when DOM loads
document.addEventListener("DOMContentLoaded", function() {
  checkUserSession();
  displaySuggestedUsers();
});

// Check user session and load posts
function checkUserSession() {
  fetch("../php/home.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.username;
        document.getElementById("display_name").textContent = data.username;
        document.getElementById("username").textContent = "@" + data.username;
        loadPosts(); // Load posts after user is authenticated
      } else {
        window.location.href = "../html/login.html";
      }
    })
    .catch(() => {
      window.location.href = "../html/login.html";
    });
}

function loadPosts() {
  fetch('path_to_your_fetch_posts.php')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const postsContainer = document.querySelector('.posts-container');
        postsContainer.innerHTML = ''; // Clear current posts
        data.posts.forEach(post => {
          // Generate your post HTML here
          const postDiv = document.createElement('div');
          postDiv.className = 'sample-post';
          postDiv.dataset.postId = post.post_id;
          postDiv.innerHTML = `
            <div>${post.content}</div>
            <button onclick="deletePost(this)">Delete</button>
          `;
          postsContainer.appendChild(postDiv);
        });
      } else {
        alert('Failed to load posts');
      }
    })
    .catch(error => console.error('Error loading posts:', error));
}

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
  const isOwner = post.username === currentUser;

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="../assets/temporary_pfp.png" alt="user profile" class="profile-pic">
        <div class="post-info">
          <span class="username">${post.username}</span>
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
        <p>${post.content}</p>
        ${post.media_url ? `
          ${post.media_type === 'video' ?
            `<video controls class="preview-video"><source src="${post.media_url}" type="video/mp4"></video>` :
            `<img src="${post.media_url}" alt="Post media" class="preview-image">`
          }
        ` : ''}
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
          <button class="comment-btn" onclick="toggleCommentModal(this.closest('.sample-post'))">
            <img src="../assets/comment_icon.png" alt="Comment">
          </button>
          <span class="comment-count">${post.comments_count}</span>
        </div>

        <div class="comment-modal hidden">
          <div class="modal-content">
            <span class="close-comment-modal" onclick="toggleCommentModal(this.closest('.sample-post'))">&times;</span>
            <div class="comment-list"></div>
            <div class="comment-input">
              <input type="text" placeholder="Write a comment...">
              <button class="send-comment" onclick="postComment(this)">Send</button>
            </div>
          </div>
        </div>

        <div class="action-button">
          <button class="share-btn" onclick="toggleShareModal(this.closest('.sample-post'))">
            <img src="../assets/share_icon.png" alt="Share">
          </button>
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

// Pagination function (optional)
function updatePagination(pagination) {
  // You can implement pagination controls here if needed
  console.log('Pagination info:', pagination);
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

function toggleCommentModal(postElement) {
  const modal = postElement.querySelector(".comment-modal");
  modal.classList.toggle("hidden");
}

function postComment(button) {
  const input = button.previousElementSibling;
  const commentText = input.value.trim();
  const modal = button.closest(".comment-modal");
  const list = modal.querySelector(".comment-list");

  if (commentText !== "") {
    const comment = document.createElement("div");
    comment.className = "comment";
    comment.innerHTML = `
      <img src="../assets/temporary_pfp.png" alt="Avatar" class="comment-avatar">
      <div class="comment-content">
        <span class="comment-author">${currentUser}</span>
        <p>${commentText}</p>
      </div>`;
    list.appendChild(comment);
    input.value = "";

    const post = button.closest(".sample-post");
    const count = post.querySelector(".comment-count");
    count.textContent = parseInt(count.textContent) + 1;
  }
}

function toggleShareModal(postElement) {
  const shareModal = postElement.querySelector(".share-modal");
  if (shareModal) {
    shareModal.classList.toggle("hidden");
  }
}

function closeShareModal() {
  const shareModal = document.getElementById("share_modal");
  if (shareModal) {
    shareModal.classList.add("hidden");
  }
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

function logout() {
  window.location.href = "../php/logout.php";
}