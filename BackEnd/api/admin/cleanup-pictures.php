<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../helpers/Response.php';


if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $uploadDir = UPLOAD_DIR;
    
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
        Response::success([
            'deleted' => 0,
            'message' => 'Upload directory was empty'
        ], 'No cleanup needed');
    }
    
    
    $stmt = $pdo->query("SELECT id FROM users");
    $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    
    $allFiles = glob($uploadDir . '*');
    
    $deletedCount = 0;
    $deletedFiles = [];
    
    foreach ($allFiles as $file) {
        if (!is_file($file)) {
            continue;
        }
        
        $filename = basename($file);
        
        
        $parts = explode('.', $filename);
        $fileUserId = (int)$parts[0];
        
        
        if (!in_array($fileUserId, $userIds)) {
            if (unlink($file)) {
                $deletedCount++;
                $deletedFiles[] = $filename;
            }
        }
    }
    
    Response::success([
        'deleted' => $deletedCount,
        'files' => $deletedFiles,
        'total_users' => count($userIds)
    ], "Cleaned up $deletedCount unused profile picture(s)");
    
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
