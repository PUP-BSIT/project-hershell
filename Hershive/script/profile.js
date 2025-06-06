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
            const profileImgs = document.querySelectorAll(".profile-img, .profile-img-preview");
            profileImgs.forEach(img => img.src = src);
          };
          reader.readAsDataURL(profileInput);
        }

        if (coverInput) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const src = e.target.result;
            const coverImgs = document.querySelectorAll(".cover-img, .cover-img-preview");
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
