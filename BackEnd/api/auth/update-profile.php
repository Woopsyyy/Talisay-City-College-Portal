<?php

require_once __DIR__ . '/../../config/header.php';




try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }

    $userId = $_SESSION['user_id'];

    
    $username = trim($_POST['username'] ?? '');
    $full_name = trim($_POST['full_name'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $full_name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Username and full name are required']);
        exit;
    }

    $pdo = Database::connect();

    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR full_name = ?) AND id <> ?");
    $stmt->execute([$username, $full_name, $userId]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Username or full name already exists']);
        exit;
    }

    
    $fields = ['username = :username', 'full_name = :full_name'];
    $params = [
        ':username' => $username,
        ':full_name' => $full_name,
        ':id' => $userId,
    ];

    
    if (!empty($password)) {
        if (strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 8 characters']);
            exit;
        }
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $fields[] = 'password = :password';
        $params[':password'] = $hashed;
    }

    
    $imagePath = null;
    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = UPLOAD_DIR;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $file = $_FILES['profile_image'];
        
        
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
             http_response_code(415);
             echo json_encode(['error' => 'Invalid image file']);
             exit;
        }
        
        $mimeType = $imageInfo['mime'];
        
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
        if (!isset($allowed[$mimeType])) {
            http_response_code(415);
            echo json_encode(['error' => 'Unsupported image type. Only JPEG, PNG, GIF, and WebP are allowed.']);
            exit;
        }
        
        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'File too large. Maximum size is 5MB.']);
            exit;
        }

        $ext = $allowed[$mimeType];
        
        
        $oldFiles = glob($uploadDir . $userId . '.*');
        foreach ($oldFiles as $oldFile) {
            if (is_file($oldFile)) {
                unlink($oldFile);
            }
        }

        $fileName = $userId . '.' . $ext;
        $targetPath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            error_log("Failed to move uploaded file to: " . $targetPath);
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save uploaded image']);
            exit;
        }

        
        $imagePath = '/Database/upload/' . $fileName . '?t=' . time();
        $fields[] = 'image_path = :image_path';
        $params[':image_path'] = $imagePath;
    }

    $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    
    $_SESSION['username'] = $username;
    $_SESSION['full_name'] = $full_name;
    if ($imagePath !== null) {
        $_SESSION['image_path'] = $imagePath;
    }

    
    $stmt = $pdo->prepare("SELECT id, username, full_name, role, school_id, image_path FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'user' => $user,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>

