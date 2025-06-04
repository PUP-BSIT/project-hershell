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

  if (profileInput) {
    const profileReader = new FileReader();
    profileReader.onload = function (e) {
      document.querySelector(".profile-img-preview").src = e.target.result;
      const mainProfileImg = document.querySelector(".profile-img");
      if (mainProfileImg) mainProfileImg.src = e.target.result;
    };
    profileReader.readAsDataURL(profileInput);
  }

  if (coverInput) {
    const coverReader = new FileReader();
    coverReader.onload = function (e) {
      document.querySelector(".cover-img-preview").src = e.target.result;
      const mainCoverImg = document.querySelector(".cover-img");
      if (mainCoverImg) mainCoverImg.src = e.target.result;
    };
    coverReader.readAsDataURL(coverInput);
  }

  document.querySelector(".bio-section p").innerText = bioText;

  closeEditModal();
}

// Event listeners for file inputs to show previews
document.getElementById('media_input').addEventListener('change', function() {
  handleFileInput(this, document.getElementById("profile_img_preview"));
});
document.getElementById('cover_media_input')
    .addEventListener('change', function() {handleFileInput(this, document
    .getElementById("cover_img_preview"));
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
