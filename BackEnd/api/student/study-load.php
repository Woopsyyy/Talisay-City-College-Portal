<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $user_id = $_SESSION['user_id'];

    
    $stmt = $pdo->prepare("SELECT section, year_level FROM user_assignments WHERE user_id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$assignment || !$assignment['section']) {
        echo json_encode([]);
        exit;
    }

    $section = $assignment['section'];

    
    
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            s.subject_code,
            subj.subject_name as subject_title,
            subj.units,
            subj.semester,
            u.full_name as teacher
        FROM schedules s
        INNER JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN subjects subj ON s.subject_code = subj.subject_code
        LEFT JOIN users u ON subj.teacher_id = u.id
        WHERE sec.section_name = ?
        ORDER BY subj.subject_code
    ");
    $stmt->execute([$section]);
    $studyLoad = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($studyLoad);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
