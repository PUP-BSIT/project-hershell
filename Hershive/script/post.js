function toggleLike(btn, postId) {
    fetch('../php/toggle-like.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action: btn.classList.contains('liked') ? 'unlike' : 'like' })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            btn.classList.toggle('liked', data.liked);
            document.getElementById('likeCount').textContent = data.like_count;
        } else if (data.error) {
            alert(data.error);
        }
    });
}

function loadComments(postId) {
    fetch('../php/comment_crud.php?action=get&post_id=' + postId)
    .then(res => res.json())
    .then(data => {
        var list = document.getElementById('commentsList');
        if (data.success && data.comments.length) {
            list.innerHTML = data.comments.map(function(c) {
                return `<div class="comment-entry">
                    <img src="${c.profile_picture_url || '../assets/temporary_pfp.png'}" class="comment-avatar" alt="Avatar">
                    <div class="comment-bubble">
                        <span class="comment-username">${escapeHtml(c.username)}</span>
                        <span class="comment-timestamp">${escapeHtml(c.timestamp || c.created_at)}</span>
                        <div class="comment-text">${escapeHtml(c.comment_content).replace(/\n/g, '<br>')}</div>
                    </div>
                </div>`;
            }).join('');
        } else {
            list.innerHTML = "<div style='color:#888;'>No comments yet.</div>";
        }
    });
}

function submitComment(postId) {
    var input = document.getElementById('commentInput');
    var content = input.value.trim();
    if (!content) return;
    fetch('../php/comment_crud.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'post_id=' + postId + '&content=' + encodeURIComponent(content)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            input.value = '';
            loadComments(postId);
        } else if (data.error) {
            alert(data.error);
        }
    });
}

function escapeHtml(text) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function openShareModal(postId) {
    document.getElementById('shareModal').style.display = 'flex';
}
function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}
function copyShareLink() {
    var input = document.querySelector('#shareModal input[type="text"]');
    input.select();
    document.execCommand('copy');
    alert('Link copied!');
}

document.addEventListener('DOMContentLoaded', function() {
    loadComments(window.postId);
});