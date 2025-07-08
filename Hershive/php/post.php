<?php
require_once 'db_connection.php';
session_start();

$post_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$current_user_id = $_SESSION['user_id'] ?? null;

if ($post_id <= 0) {
    echo "<h2>Invalid post ID.</h2>";
    exit;
}

$stmt = $conn->prepare("
    SELECT 
        p.*, 
        u.username, 
        u.profile_picture_url,
        s.source_post_id,
        original.content AS original_content,
        original.media_url AS original_media_url,
        original_user.username AS original_author
    FROM post p
    JOIN user u ON p.user_id = u.user_id
    LEFT JOIN share s ON s.post_wrapper_id = p.post_id
    LEFT JOIN post original ON s.source_post_id = original.post_id
    LEFT JOIN user original_user ON original.user_id = original_user.user_id
    WHERE p.post_id = ?
");
$stmt->bind_param("i", $post_id);
$stmt->execute();
$result = $stmt->get_result();

if ($post = $result->fetch_assoc()) {
    $isShared = $post['is_shared'] == 1 && !empty($post['original_content']);
    $media_url = $isShared ? $post['original_media_url'] : $post['media_url'];
    $media_html = '';
    if ($media_url) {
        $ext = strtolower(pathinfo($media_url, PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
            $media_html = "<img src=\"{$media_url}\" alt=\"Post Image\" class=\"post-media\" />";
        } elseif (in_array($ext, ['mp4', 'webm', 'mov', 'avi'])) {
            $media_html = "<video controls class=\"post-media\"><source src=\"{$media_url}\" type=\"video/{$ext}\"></video>";
        }
    }

    // Like count and user liked
    $like_count = 0;
    $user_liked = false;
    $like_stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM heart_react WHERE post_id = ?");
    $like_stmt->bind_param("i", $post_id);
    $like_stmt->execute();
    $like_res = $like_stmt->get_result();
    if ($like_row = $like_res->fetch_assoc()) {
        $like_count = $like_row['cnt'];
    }
    if ($current_user_id) {
        $user_like_stmt = $conn->prepare("SELECT 1 FROM heart_react WHERE post_id = ? AND user_id = ?");
        $user_like_stmt->bind_param("ii", $post_id, $current_user_id);
        $user_like_stmt->execute();
        $user_like_stmt->store_result();
        $user_liked = $user_like_stmt->num_rows > 0;
    }

    // Comment count
    $comment_count = 0;
    $comment_stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM comment WHERE post_id = ? AND deleted = 0");
    $comment_stmt->bind_param("i", $post_id);
    $comment_stmt->execute();
    $comment_res = $comment_stmt->get_result();
    if ($comment_row = $comment_res->fetch_assoc()) {
        $comment_count = $comment_row['cnt'];
    }
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"/>
        <title>Post by <?php echo htmlspecialchars($post['username']); ?></title>
        <link rel="stylesheet" href="../style/post.css"/>
    </head>
    <body>
        <div class="post-detail">
            <div class="post-header">
                <img src="<?php echo htmlspecialchars($post['profile_picture_url'] ?? '../assets/temporary_pfp.png'); ?>" alt="Profile" class="profile-pic"/>
                <span class="username"><?php echo htmlspecialchars($post['username']); ?></span>
            </div>
            <div class="timestamp">
                <?php echo htmlspecialchars($post['created_at']); ?>
            </div>
            <div class="post-content">
                <?php if ($isShared): ?>
                    <div class="shared-card">
                        <p class="shared-username">Originally posted by <strong><?php echo htmlspecialchars($post['original_author']); ?></strong></p>
                        <p><?php echo nl2br(htmlspecialchars($post['original_content'])); ?></p>
                        <?php echo $media_html; ?>
                    </div>
                <?php else: ?>
                    <p><?php echo nl2br(htmlspecialchars($post['content'])); ?></p>
                    <?php echo $media_html; ?>
                <?php endif; ?>
            </div>
            <div class="post-actions">
                <button class="like-btn<?php echo $user_liked ? ' liked' : ''; ?>" id="likeBtn" onclick="toggleLike(this, <?php echo $post_id; ?>)">
                    <img class="heart-icon outline" src="../assets/heart_icon.png" alt="Like">
                    <img class="heart-icon filled" src="../assets/red_heart_icon.png" alt="Liked">
                    <span class="like-count" id="likeCount"><?php echo $like_count; ?></span>
                </button>
                <button class="comment-btn" onclick="document.getElementById('commentInput').focus();">
                    <img src="../assets/comment_icon.png" alt="Comment">
                    <span class="comment-count" id="commentCount"><?php echo $comment_count; ?></span>
                </button>
                <button class="share-btn" onclick="openShareModal(<?php echo $post_id; ?>)">
                    <img src="../assets/share_icon.png" alt="Share">
                    <span class="share-count"></span>
                </button>
            </div>
            <div class="comment-section">
                <h3>Comments</h3>
                <div id="commentsList"></div>
                <div class="comment-input">
                    <input type="text" id="commentInput" placeholder="Write a comment...">
                    <button class="send-comment-btn" onclick="submitComment(<?php echo $post_id; ?>)">Send</button>
                </div>
            </div>
        </div>

        <!-- Share Modal -->
        <div id="shareModal">
            <div class="modal-content">
                <h3>Share this post</h3>
                <input type="text" value="<?php echo htmlspecialchars("https://".$_SERVER['HTTP_HOST']."/post/".$post_id); ?>" readonly>
                <button onclick="copyShareLink()">Copy Link</button>
                <button onclick="closeShareModal()">Close</button>
            </div>
        </div>
        <script>window.postId = <?php echo $post_id; ?>;</script>
        <script src="../script/post.js"></script>
    </body>
    </html>
    <?php
} else {
    echo "<h2>Post not found.</h2>";
}
?>