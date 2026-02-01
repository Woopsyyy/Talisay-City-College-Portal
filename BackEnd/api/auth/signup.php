<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../helpers/Response.php';

try {
    $pdo = Database::connect();
    
    
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
    
    $username = '';
    $password = '';
    $full_name = '';
    $email = '';
    $role = 'student';
    $school_id = null;
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $full_name = trim($input['full_name'] ?? ($input['name'] ?? ''));
        $email = trim($input['email'] ?? '');
        $role = $input['role'] ?? 'student';
        $school_id = $input['school_id'] ?? null;
    } else {
        
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        $full_name = trim($_POST['full_name'] ?? ($_POST['name'] ?? ''));
        $email = trim($_POST['email'] ?? '');
        $role = $_POST['role'] ?? 'student';
        $school_id = $_POST['school_id'] ?? null;
    }
    
    
    if (empty($username) || empty($password) || empty($full_name)) {
        Response::error('Username, password, and full name are required', 400);
    }
    
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        Response::error('Username already exists', 409);
    }
    
    if (!empty($email)) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                Response::error('Email already exists', 409);
            }
        } catch (Exception $e) {
            
        }
    }
    
    if ($school_id) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE school_id = ?");
        $stmt->execute([$school_id]);
        if ($stmt->fetch()) {
            Response::error('School ID already exists', 409);
        }
    }
    
    
    if (empty($school_id) && $role === 'student') {
        $year = date('Y');
        $attempts = 0;
        while (empty($school_id) && $attempts < 20) {
            $rand = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $candidate = "$year-$rand";
            $stmt = $pdo->prepare("SELECT id FROM users WHERE school_id = ?");
            $stmt->execute([$candidate]);
            if (!$stmt->fetch()) {
                $school_id = $candidate;
            }
            $attempts++;
        }
        if (empty($school_id)) $school_id = "$year-" . substr(time(), -4);
    }
    
    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $imagePath = '/images/sample.jpg'; 
    
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, school_id, role, image_path, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $full_name, $school_id, $role, $imagePath, $email]);
    } catch (Exception $e) {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, school_id, role, image_path) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $full_name, $school_id, $role, $imagePath]);
    }
    
    $userId = $pdo->lastInsertId();
    
    
    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
        error_log("Profile picture upload detected for user $userId");
        $uploadDir = __DIR__ . '/../../Database/upload/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        
        $file = $_FILES['profile_picture'];
        $imageInfo = getimagesize($file['tmp_name']);
        
        if ($imageInfo !== false) {
            $mimeType = $imageInfo['mime'];
            error_log("Detected MIME type: $mimeType");
            
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (in_array($mimeType, $allowedTypes) && $file['size'] <= 5 * 1024 * 1024) {
                $extMap = [
                    'image/jpeg' => 'jpg', 'image/jpg' => 'jpg',
                    'image/png' => 'png', 'image/gif' => 'gif',
                    'image/webp' => 'webp'
                ];
                $ext = $extMap[$mimeType] ?? 'jpg';
                
                $newFilename = $userId . '.' . $ext;
                $targetPath = $uploadDir . $newFilename;
                
                if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                    error_log("File moved successfully to $targetPath");
                    $imagePath = '/Database/upload/' . $newFilename . '?t=' . time();
                    $stmt = $pdo->prepare("UPDATE users SET image_path = ? WHERE id = ?");
                    $stmt->execute([$imagePath, $userId]);
                } else {
                    error_log("Failed to move uploaded file");
                }
            } else {
                error_log("Invalid file type or size");
            }
        } else {
            error_log("getimagesize failed for temporary file");
        }
    } else {
        if (isset($_FILES['profile_picture'])) {
            error_log("Profile picture upload error: " . $_FILES['profile_picture']['error']);
        } else {
            error_log("Profile picture field missing in FILES");
        }
    }
    
    Response::success([
        'user_id' => $userId,
        'username' => $username,
        'role' => $role,
        'avatar_path' => $imagePath
    ], 'User created successfully', 201);
    
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
