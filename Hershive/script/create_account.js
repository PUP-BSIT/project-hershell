function previewImage(input) {
  const file = input.files[0];
  const imagePreview = document.getElementById("image_preview");
  const removeBtn = document.getElementById("remove-profile-btn");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Image">`;
      imagePreview.classList.add("has-image");
      removeBtn.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }
}

function previewCover(input) {
  const file = input.files[0];
  const coverPreview = document.getElementById("cover_preview");
  const removeBtn = document.getElementById("remove-cover-btn");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      coverPreview.innerHTML = `<img src="${e.target.result}" alt="Cover Image">`;
      coverPreview.classList.add("has-image");
      removeBtn.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  const imageInput = document.getElementById("profile_image");
  const imagePreview = document.getElementById("image_preview");
  const removeBtn = document.getElementById("remove-profile-btn");

  imageInput.value = "";
  imagePreview.innerHTML = `<span id="previewText">add profile</span>`;
  imagePreview.classList.remove("has-image");
  removeBtn.style.display = "none";
}

function removeCover() {
  const coverInput = document.getElementById("cover_image");
  const coverPreview = document.getElementById("cover_preview");
  const removeBtn = document.getElementById("remove-cover-btn");

  coverInput.value = "";
  coverPreview.innerHTML = `<span id="coverText">add cover photo</span>`;
  coverPreview.classList.remove("has-image");
  removeBtn.style.display = "none";
}

function updateAge() {
  const birthdayInput = document.getElementById("birthday");
  const ageSpan = document.getElementById("calculated_age");
  const birthDate = new Date(birthdayInput.value);
  const today = new Date();

  if (!isNaN(birthDate)) {
    if (birthDate >= today) {
      ageSpan.textContent = "-";
      birthdayInput.setCustomValidity("Birthday must be in the past.");
      birthdayInput.reportValidity();
      return;
    } else {
      birthdayInput.setCustomValidity("");
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    ageSpan.textContent = age;
  } else {
    ageSpan.textContent = "-";
  }
}

const form = document.getElementById('accountForm');
const errorDiv = document.getElementById('errorMessages');
const successDiv = document.getElementById('successMessage');

form.addEventListener("submit", async function(e) {
  e.preventDefault();

  errorDiv.innerHTML = "";
  successDiv.innerHTML = "";

  const formData = new FormData(form);

  try {
    const response = await fetch("../php/create_account.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success === true) {
      successDiv.textContent = data.message || "Account created.";

      form.reset();

      preview.innerHTML = '<span id="previewText">add profile</span>';
      uploadBox.classList.remove("has-image");

      coverPreview.innerHTML = '<span id="coverText">add cover</span>';
      coverUploadBox.classList.remove("has-image");
      
      setTimeout(() => window.location.href = "../html/home.html", 1500);
    } else if (data.error) {
      errorDiv.textContent = data.error;
    }

  } catch (err) {
    errorDiv.innerHTML = "An unexpected error occurred.";
    console.error(err);
  }

  console.log("Form submitted");
});