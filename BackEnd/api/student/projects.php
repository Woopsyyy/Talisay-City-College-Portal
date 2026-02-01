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
    $student_id = $_SESSION['user_id'];
    
    
    
    
    
    
    $query = "
        SELECT 
            p.id,
            p.title,
            p.description,
            p.due_date,
            p.max_score,
            p.status,
            p.created_at,
            s.subject_code,
            s.subject_name,
            sec.section_name,
            t.full_name as teacher_name
        FROM projects p
        JOIN subjects s ON p.subject_id = s.id
        JOIN sections sec ON p.section_id = sec.id
        JOIN users t ON p.teacher_id = t.id
        JOIN user_assignments ua ON p.section_id = ua.section_id
        WHERE ua.user_id = ? 
        AND ua.status = 'active'
        AND p.status = 'published'
        ORDER BY p.due_date ASC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$student_id]);
    $projects = $stmt->fetchAll();
    
    echo json_encode($projects);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
