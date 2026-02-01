<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    
    
    
    $query = "
        SELECT 
            sec.id, 
            sec.section_name, 
            sec.grade_level,
            sec.course,
            sec.major,
            COUNT(s.id) as subject_count,
            CASE 
                WHEN COUNT(s.id) > 0 THEN 'Assigned' 
                ELSE 'Not Assigned' 
            END as status
        FROM sections sec
        LEFT JOIN schedules s ON sec.id = s.section_id
        GROUP BY sec.id
        ORDER BY sec.grade_level, sec.section_name
    ";
    
    $stmt = $pdo->query($query);
    $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($sections);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
