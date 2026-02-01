<?php

require_once __DIR__ . '/../config/header.php';
require_once __DIR__ . '/../helpers/Response.php';


if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

$uploadDir = __DIR__ . '/../Database/upload/';


if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'POST':
            
            if (!isset($_FILES['profile_picture']) || $_FILES['profile_picture']['error'] !== UPLOAD_ERR_OK) {
                Response::error('No file uploaded or upload error', 400);
            }
            
            $file = $_FILES['profile_picture'];
            $userId = $_SESSION['user_id'];
            
            
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            $imageInfo = getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                 Response::error('Invalid image file', 400);
            }
            $mimeType = $imageInfo['mime'];
            
            if (!in_array($mimeType, $allowedTypes)) {
                Response::error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.', 400);
            }
            
            
            if ($file['size'] > 5 * 1024 * 1024) {
                Response::error('File too large. Maximum size is 5MB.', 400);
            }
            
            
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (empty($extension)) {
                
                $extensionMap = [
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp'
                ];
                $extension = $extensionMap[$mimeType] ?? 'jpg';
            }
            
            
            $oldFiles = glob($uploadDir . $userId . '.*');
            foreach ($oldFiles as $oldFile) {
                if (is_file($oldFile)) {
                    unlink($oldFile);
                }
            }
            
            
            $newFilename = $userId . '.' . $extension;
            $targetPath = $uploadDir . $newFilename;
            
            
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                Response::error('Failed to save file', 500);
            }
            
            
            $imagePath = '/Database/upload/' . $newFilename . '?t=' . time();
            $stmt = $pdo->prepare("UPDATE users SET image_path = ? WHERE id = ?");
            $stmt->execute([$imagePath, $userId]);
            
            Response::success([
                'image_path' => $imagePath,
                'filename' => $newFilename
            ], 'Profile picture uploaded successfully');
            break;
            
        case 'DELETE':
            
            $userId = $_SESSION['user_id'];
            
            
            $files = glob($uploadDir . $userId . '.*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            
            
            $stmt = $pdo->prepare("UPDATE users SET image_path = '/images/sample.jpg' WHERE id = ?");
            $stmt->execute([$userId]);
            
            Response::success(null, 'Profile picture deleted');
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
