<?php

require_once __DIR__ . '/../../config/header.php';

if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

if ($_SESSION['role'] !== 'student' && $_SESSION['role'] !== 'admin') {
    Response::error('Unauthorized access', 403);
}

try {
    $pdo = Database::connect();
    
    
    
    $query = "
        SELECT 
            id, 
            name, 
            status, 
            budget, 
            start_date, 
            description, 
            created_at 
        FROM campus_projects 
        WHERE status IN ('Ongoing', 'Completed')
        ORDER BY 
            CASE status 
                WHEN 'Ongoing' THEN 1 
                WHEN 'Completed' THEN 2 
            END,
            created_at DESC
    ";
    
    $stmt = $pdo->query($query);
    $projects = $stmt->fetchAll();
    
    echo json_encode($projects);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
