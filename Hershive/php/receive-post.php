<?php 
require_once 'db_connection.php';
header('Content-Type: application/json');

// Decode JSON input
$input = json_decode(file_get_contents("php://input"), true);

$incoming_token = $input['token'] ?? null;
$provider = $input['client']; // devhive or heybleepi
$shared_post_id = $input['posts'][0]['shared_post_id'] ?? null;
$shared_content = $input['posts'][0]['content'] ?? '';
$media_url = $input['posts'][0]['file_path'] ?? null;

if (!$incoming_token) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing token.']);
    exit;
}

// Verify token
$stmt = $conn->prepare("SELECT user_id FROM oauth_tokens WHERE token = ?");
$stmt->bind_param("s", $incoming_token);
$stmt->execute();
$stmt->bind_result($local_user_id);
$stmt->fetch();
$stmt->close();

if (!$local_user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid or unauthorized token.']);
    exit;
}

// Require at least shared content or media
if (empty(trim($shared_content)) && empty($media_url)) {
    http_response_code(400);
    echo json_encode(['error' => 'Post must contain shared content or media.']);
    exit;
}

// Insert post
$stmt = $conn->prepare("INSERT INTO post (user_id, content, media_url) VALUES (?, ?, ?)");
$stmt->bind_param("iss", $local_user_id, $final_content, $media_url);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'post_id' => $stmt->insert_id,
        'message' => 'Shared post successfully saved.'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save post.']);
}

$stmt->close();
$conn->close();
?>