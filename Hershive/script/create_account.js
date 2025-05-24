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