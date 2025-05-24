function openPostModal() {
  const postModal = document.getElementById("postModal");
  postModal.style.display = "flex";
}

function closePostModal() {
  const postModal = document.getElementById("postModal");
  postModal.style.display = "none";
}

window.addEventListener("click", function (e) {
  const postModal = document.getElementById("postModal");
  if (e.target === postModal) {
    postModal.style.display = "none";
  }
});

function toggleDropdown(icon) {
  const parent = icon.parentElement;
  parent.classList.toggle('active');
}

function cancelDropdown(button) {
  const parent = button.closest('.more-option');
  parent.classList.remove('active');
}

function editPost(button) {
  const post = button.closest('.sample-post');
  const contentDiv = post.querySelector('.content');
  const paragraph = contentDiv.querySelector('p');
  const image = contentDiv.querySelector('img');

  // Prevent duplicate editors
  if (contentDiv.querySelector('.edit-textarea')) return;

  // Create editable textarea with current text
  const textarea = document.createElement('textarea');
  textarea.value = paragraph.innerText;
  textarea.className = 'edit-textarea';

  // Create file input for image upload
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'edit-image-input';

  // Create save button
  const saveButton = document.createElement('button');
  saveButton.innerText = 'Save';
  saveButton.className = 'save-edit-button';

  // Save handler
  saveButton.onclick = () => {
    paragraph.innerText = textarea.value;
    paragraph.style.display = 'block';

    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = function (e) {
        image.src = e.target.result;
      };
      reader.readAsDataURL(fileInput.files[0]);
    }

    // Remove editing UI
    textarea.remove();
    fileInput.remove();
    saveButton.remove();
  };

  // Hide current paragraph for editing
  paragraph.style.display = 'none';

  // Insert editing elements
  contentDiv.insertBefore(textarea, paragraph);
  contentDiv.insertBefore(fileInput, paragraph);
  contentDiv.insertBefore(saveButton, paragraph);

  cancelDropdown(button);
}


function deletePost(button) {
  const post = button.closest('.sample-post');
  if (confirm("Are you sure you want to delete this post?")) {
    post.remove();
  }
}