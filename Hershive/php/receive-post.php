<?php 
require_once 'db_connection.php';
header('Content-Type: application/json');

// Decode JSON input
$input = json_decode(file_get_contents("php://input"), true);

$incoming_token = $input['token'] ?? null;
$provider = $input['provider'];// devhive or heybleepi
$shared_post_id = $input['posts'][0]['shared_post_id'] ?? null;
$shared_content = $input['posts'][0]['content'] ?? '';
$media_url = $input['posts'][0]['file_path'] ?? null;

if (!$incoming_token) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing token.']);
    exit;
}

switch (strtolower($provider)) {
case 'devhive':
    $media_url = $input['posts'][0]['image_url'] ?? $input['posts'][0]['video_url'] ?? null;
    $shared_content = $input['posts'][0]['content'] ?? '';

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

    if (empty(trim($shared_content)) && empty($media_url)) {
        http_response_code(400);
        echo json_encode(['error' => 'Post must contain shared content or media.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO post (user_id, content) VALUES (?, ?)");
    $stmt->bind_param("is", $local_user_id, $shared_content);
    $stmt->execute();
    $new_post_id = $stmt->insert_id;

    if (!empty($media_url)) {
        $video_exts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
        $image_exts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

        $extension = strtolower(pathinfo($media_url, PATHINFO_EXTENSION));

        if (in_array($extension, $video_exts)) {
            $media_type = 'video';
        } elseif (in_array($extension, $image_exts)) {
            $media_type = 'image';
        } else {
            echo json_encode(['error' => 'Unsupported media type.']);
            exit;
        }

        // Save to uploads/
        $uploadDir = __DIR__ . '/../uploads/';
        $filename = uniqid('media_', true) . '.' . $extension;
        $local_path = $uploadDir . $filename;

        $file_contents = @file_get_contents($media_url);
        if ($file_contents === false) {
            echo json_encode(['error' => 'Failed to download media.']);
            exit;
        }

        file_put_contents($local_path, $file_contents);

        // Save local file path
        $media_url_to_store = 'https://hershive.com/project-hershell/Hershive/uploads/' . $filename;
        $media_stmt = $conn->prepare("UPDATE post SET media_url = ? WHERE post_id = ?");
        $media_stmt->bind_param("si", $media_url_to_store, $new_post_id);
        $media_stmt->execute();
        $media_stmt->close();
    }

    $stmt->close();
    $conn->close();
    break;
    
case 'heybleepi':
    $media_url = $input['posts'][0]['file_path'] ?? null;
    $shared_content = $input['posts'][0]['content'] ?? '';
    
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
    
    if (empty(trim($shared_content)) && empty($media_url)) {
        http_response_code(400);
        echo json_encode(['error' => 'Post must contain shared content or media.']);
        exit;
    }
    
    // Save post
    $stmt = $conn->prepare("INSERT INTO post (user_id, content) VALUES (?, ?)");
    $stmt->bind_param("is", $local_user_id, $shared_content);
    $stmt->execute();
    $new_post_id = $stmt->insert_id;

    if (!empty($media_url)) {
        $video_exts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
        $image_exts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

        $extension = strtolower(pathinfo($media_url, PATHINFO_EXTENSION));

        if (in_array($extension, $video_exts)) {
            $media_type = 'video';
        } elseif (in_array($extension, $image_exts)) {
            $media_type = 'image';
        } else {
            echo json_encode(['error' => 'Unsupported media type.']);
            exit;
        }

        // Save to uploads/
        $uploadDir = __DIR__ . '/../uploads/';
        $filename = uniqid('media_', true) . '.' . $extension;
        $local_path = $uploadDir . $filename;

        $file_contents = @file_get_contents($media_url);
        if ($file_contents === false) {
            echo json_encode(['error' => 'Failed to download media.']);
            exit;
        }

        file_put_contents($local_path, $file_contents);

        // Save local file path
        $media_url_to_store = 'https://hershive.com/project-hershell/Hershive/uploads/' . $filename;
        $media_stmt = $conn->prepare("UPDATE post SET media_url = ? WHERE post_id = ?");
        $media_stmt->bind_param("si", $media_url_to_store, $new_post_id);
        $media_stmt->execute();
        $media_stmt->close();
    }
    $stmt->close();
    $conn->close();
    break;
}
http_response_code(200);
echo json_encode(['message' => 'Post received and saved successfully.']);
?>