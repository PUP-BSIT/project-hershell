const input = document.getElementById("profile_image");
const preview = document.getElementById("image_preview");
const uploadBox = document.getElementById("image_upload");

function triggerFileInput() {
  input.click();
}

function previewImage(inputElement) {
  const file = inputElement.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Profile Image">`;
      uploadBox.classList.add("has-image");
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  input.value = "";
  preview.innerHTML = '<span id="previewText">add image</span>';
  uploadBox.classList.remove("has-image");
}

function goToHome(event) {
  event.preventDefault();
  window.location.href = "/Hershive/html/home.html";
}

function updateAge() {
  const birthdayInput = document.getElementById("birthday");
  const ageSpan = document.getElementById("calculated_age");

  const birthDate = new Date(birthdayInput.value);
  const today = new Date();

  if (!isNaN(birthDate)) {
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