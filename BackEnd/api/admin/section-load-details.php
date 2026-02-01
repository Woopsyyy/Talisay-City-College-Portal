<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

$id = $_GET['id'] ?? null;
if (!$id) Response::error("Section ID required", 400);

try {
    $pdo = Database::connect();
    
    
    $stmt = $pdo->prepare("SELECT section_name FROM sections WHERE id = ?");
    $stmt->execute([$id]);
    $sectionName = $stmt->fetchColumn();

    $query = "
        SELECT 
            s.id,
            s.subject_code,
            s.day_of_week,
            s.time_start,
            s.time_end,
            subj.subject_name as subject_title,
            subj.units,
            subj.semester,
            (
                SELECT ss.teacher 
                FROM section_subjects ss 
                WHERE ss.subject_code = s.subject_code 
                AND ss.section = ?
                LIMIT 1
            ) as teacher
        FROM schedules s
        LEFT JOIN subjects subj ON s.subject_code = subj.subject_code
        WHERE s.section_id = ?
        ORDER BY 
            FIELD(s.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
            s.time_start
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$sectionName, $id]);
    $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($details);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
