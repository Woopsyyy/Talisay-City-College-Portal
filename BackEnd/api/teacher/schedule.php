<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $userId = $_SESSION['user_id'];

    
    $stmt = $pdo->prepare("SELECT full_name FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userFullName = $stmt->fetchColumn();

    
    $query = "
        SELECT 
            sc.id,
            sc.subject_code as subject,
            sc.day_of_week as day,
            sc.time_start,
            sc.time_end,
            sec.section_name as section,
            sec.grade_level as year,
            r.room_number as room,
            r.building_name as building
        FROM schedules sc
        LEFT JOIN sections sec ON sc.section_id = sec.id
        LEFT JOIN rooms r ON sc.room_id = r.id
        LEFT JOIN subjects s ON sc.subject_code = s.subject_code
        
        -- Check Global Assignment
        LEFT JOIN teacher_assignments ta ON s.id = ta.subject_id AND ta.teacher_id = ? AND ta.status = 'active'
        
        -- Check Section Specific Assignment (by name matches section_subjects)
        LEFT JOIN section_subjects ss ON ss.subject_code = sc.subject_code 
                                      AND ss.section = sec.section_name 
                                      AND ss.teacher = ?
        
        WHERE ta.id IS NOT NULL OR ss.id IS NOT NULL
        ORDER BY FIELD(sc.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), sc.time_start
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$userId, $userFullName]);
    $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($schedules);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
