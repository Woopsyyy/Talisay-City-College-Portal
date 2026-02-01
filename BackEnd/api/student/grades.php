<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

$user_id = $_SESSION['user_id'];

try {
    $pdo = Database::connect();

    
    
    $query = "
        SELECT 
            g.id,
            g.student_id,
            COALESCE(subj.subject_code, 'N/A') as subject_code,
            COALESCE(subj.subject_name, 'Unknown Subject') as subject,
            COALESCE(t.full_name, 'TBA') as instructor,
            g.prelim_grade,
            g.midterm_grade,
            g.final_grade as finals_grade,
            g.semester,
            g.school_year as year,
            g.created_at
        FROM grades g
        LEFT JOIN subjects subj ON g.subject_id = subj.id
        LEFT JOIN users t ON g.teacher_id = t.id
        WHERE g.student_id = ?
        ORDER BY g.school_year DESC, g.semester, subj.subject_name
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user_id]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($grades);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
