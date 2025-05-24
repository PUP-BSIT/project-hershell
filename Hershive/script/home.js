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
