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
    postModal.style.display = "none";
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
  const post = button.closest(".sample-post");
  const contentDiv = post.querySelector(".content");
  const paragraph = contentDiv.querySelector("p");
  const image = contentDiv.querySelector("img");

  if (contentDiv.querySelector(".edit-editor")) return;

  const editorDiv = document.createElement("div");
  editorDiv.className = "edit-editor";
  editorDiv.contentEditable = true;
  editorDiv.innerHTML = paragraph.innerHTML;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "edit-image-input";

  const saveButton = document.createElement("button");
  saveButton.innerText = "Save";
  saveButton.className = "save-edit-button";

  saveButton.onclick = () => {
    paragraph.innerHTML = editorDiv.innerHTML;
    paragraph.classList.remove("hidden");

    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = function (e) {
        if (image) {
          image.src = e.target.result;
        }
      };
      reader.readAsDataURL(fileInput.files[0]);
    }

    editorDiv.remove();
    fileInput.remove();
    saveButton.remove();
  };

  paragraph.classList.add("hidden");

  contentDiv.insertBefore(editorDiv, paragraph);
  contentDiv.insertBefore(fileInput, paragraph);
  contentDiv.insertBefore(saveButton, paragraph);

  cancelDropdown(button);
}

function deletePost(button) {
  const post = button.closest(".sample-post");
  if (confirm("Are you sure you want to delete this post?")) {
    post.remove();
  }
}

function submitPost() {
  const editor = document.getElementById("editor");
  const postText = editor.innerHTML.trim();
  const imageFile = imageInput.files[0];
  const videoFile = videoInput.files[0];

  if (!postText || postText === "<br>") {
    alert("Please enter some text to post.");
    return;
  }

  const leftContent = document.querySelector(".left-content");

  const post = document.createElement("div");
  post.className = "sample-post";
  post.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="../assets/temporary_pfp.png"
            alt="user profile"
            class="profile-pic">
        <div class="post-info">
          <span class="username">Jane Dee</span>
          <span class="timestamp">${new Date().toLocaleString()}</span>
        </div>
      </div>
      <div class="more-option">
        <img src="../assets/more_icon.png"
            alt="more"
            onclick="toggleDropdown(this)">
        <div class="dropdown-menu">
          <button onclick="editPost(this)">Edit</button>
          <button onclick="deletePost(this)">Delete</button>
          <button onclick="cancelDropdown(this)">Cancel</button>
        </div>
      </div>
    </div>

    <div class="post-content">
      <div class="content">
        <p>${postText}</p>
      </div>

        <div class="post-actions">
          <div class="action-button">
            <button class="like-btn" onclick="toggleLike(this)">
              <img class="heart-icon outline"
                    src="../assets/heart_icon.png" alt="Like">
              <img class="heart-icon filled hidden"
                  src="../assets/red_heart_icon.png" alt="Liked">
            </button>
            <span class="like-count">0</span>
          </div>

          <div class="action-button">
            <button class="comment-btn"
            onclick="toggleCommentModal(this.closest('.sample-post'))">
              <img src="../assets/comment_icon.png" alt="Comment">
            </button>
            <span class="comment-count">0</span>
          </div>

          <div class="comment-modal hidden">
            <div class="modal-content">
              <span class="close-comment-modal"
                    onclick="toggleCommentModal(this.closest('.sample-post'))">
                        &times;</span>
              <div class="comment-list"></div>
              <div class="comment-input">
                <input type="text" placeholder="Write a comment...">
                <button class="send-comment"
                    onclick="postComment(this)">Send</button>
              </div>
            </div>
          </div>

          <div class="action-button">
            <button class="share-btn"
                onclick="toggleShareModal(this.closest('.sample-post'))">
              <img src="../assets/share_icon.png" alt="Share">
            </button>
          </div>

         <div class="share-modal hidden">
          <div class="modal-content">
            <span class="close-share-modal"
                onclick="toggleShareModal(this.closest('.sample-post'))">
                    &times;</span>
            <input class="share-link" type="text"
                value="https://example.com/post-link" readonly>
            <button onclick="copyLink(this)">
              <img src="../assets/copy_icon.png" alt="Copy">
            </button>
          </div>
        </div>
    </div>
  `;

  const contentDiv = post.querySelector(".content");

  if (imageFile) addMediaToPost(imageFile, false, contentDiv);
  if (videoFile) addMediaToPost(videoFile, true, contentDiv);

  leftContent.insertBefore(post, leftContent.children[1]);

  editor.innerHTML = "";
  imageInput.value = "";
  videoInput.value = "";
  previewContainer.innerHTML = "";
  closePostModal();
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

imageInput.addEventListener("change", () => handleFileInput(imageInput));
videoInput.addEventListener("change", () => handleFileInput(videoInput, true));

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

  suggestedUsers.forEach((user) => {
    const div = document.createElement("div");
    div.className = "suggested-user";
    div.innerHTML = `
      <img src="${user.image}" alt="${user.username}">
      <div class="user-info">
        <p><strong>${user.username}</strong></p>
        <p>${user.handle}</p>
      </div>
      <button onclick="toggleFollow(this)">Follow</button>
    `;
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
  dropdown.classList.toggle("hidden");
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notification_panel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function toggleLike(button) {
  const outlineIcon = button.querySelector(".heart-icon.outline");
  const filledIcon = button.querySelector(".heart-icon.filled");
  const likeCountSpan = button.nextElementSibling;

  console.log("outlineIcon:", outlineIcon);
  console.log("filledIcon:", filledIcon);

  if (!outlineIcon || !filledIcon) {
    console.error("Heart icons missing!");
    return;
  }

  if (outlineIcon.classList.contains("hidden")) {
    outlineIcon.classList.remove("hidden");
    filledIcon.classList.add("hidden");
    likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
  } else {
    outlineIcon.classList.add("hidden");
    filledIcon.classList.remove("hidden");
    likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
  }
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
        <span class="comment-author">John Doe</span>
        <p>${commentText}</p>
      </div>`;
    list.appendChild(comment);
    input.value = "";

    const post = button.closest(".sample-post");
    const count = post.querySelector(".comment-count");
    count.textContent = parseInt(count.textContent) + 1;
  }
}

function toggleShareModal() {
  const shareModal = document.getElementById("share_modal");
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

document.addEventListener("DOMContentLoaded", () => {
  const samplePost = document.querySelector(".sample-post");
  if (samplePost) {
    initCommentButton(samplePost);
  }
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("close-comment-modal")) {
    const modal = e.target.closest(".comment-modal");
    if (modal) modal.classList.add("hidden");
  }
});

function hideLogout() {
  const logoutSection = document.getElementById("logout");
  logoutSection.hidden = true;
}

function toggleLogout() {
  const logoutSection = document.getElementById("logout");
  logoutSection.hidden = false;
}

function logout() {
  alert("Logged out successfully!");
  window.location.href = "login.html";
}

fetch("../php/home.php")
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      document.getElementById("display_name").textContent = data.username;
      document.getElementById("username").textContent = "@" + data.username;
    } else {
      window.location.href = "../html/login.html";
    }
  })
  .catch(() => {
    window.location.href = "../html/login.html";
  });