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

const imageInput = document.getElementById('media_input');
const videoInput = document.getElementById('media_input_video');
const previewContainer = document.getElementById('preview_container');

function handleFileInput(input, isVideo = false) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    previewContainer.innerHTML = '';

    const media = document.createElement(isVideo ? 'video' : 'img');
    if (isVideo) media.controls = true;
    media.src = e.target.result;

    const wrapper = document.createElement('div');
    wrapper.classList.add('preview-item');

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => {
      previewContainer.innerHTML = '';
      input.value = '';
    };

    wrapper.appendChild(media);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  };
  reader.readAsDataURL(file);
}

imageInput.addEventListener('change', () => handleFileInput(imageInput));
videoInput.addEventListener('change', () => handleFileInput(videoInput, true));

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

function toggleDropdown() {
  const dropdown = document.getElementById("menu_dropdown");
  dropdown.classList.toggle("hidden");
}

function toggleNotificationPanel() {
  const panel = document.getElementById('notification_panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

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
  // Redirect to login page or perform logout logic
  window.location.href = "login.html"; // Example redirect
}