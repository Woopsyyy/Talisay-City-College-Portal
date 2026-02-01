<?php

require_once __DIR__ . '/../../config/header.php';

if (isset($_SESSION['user_id'])) {
    
    $user = [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'role' => $_SESSION['role'],
        'full_name' => $_SESSION['full_name'],
        'image_path' => $_SESSION['image_path'],
        'school_id' => $_SESSION['school_id'] ?? null
    ];
    
    
    echo json_encode([
        'authenticated' => true,
        'user' => $user
    ]);

} else {
    echo json_encode(['authenticated' => false]);
}
?>
