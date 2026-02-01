<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    
    
    $query = "
        SELECT id, title, content, priority, published_at, author_id, target_role
        FROM announcements
        WHERE is_published = 1 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND target_role IN ('all', 'teacher')
        ORDER BY 
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
                ELSE 4 
            END ASC,
            published_at DESC
    ";
    
    $stmt = $pdo->query($query);
    echo json_encode($stmt->fetchAll());
    
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
