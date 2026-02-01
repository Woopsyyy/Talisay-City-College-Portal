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
            ua.id as assignment_id,
            ua.user_id,
            ua.year_level,
            ua.section as section_code,
            ua.department,
            ua.major,
            ua.payment,
            ua.amount_lacking,
            ua.sanctions,
            ua.sanction_reason,
            ua.status,
            ua.created_at,
            s.id as section_id,
            s.section_name,
            s.grade_level,
            s.school_year,
            b.building_name as building,
            sa.floor_number as floor,
            sa.room_number as room
        FROM user_assignments ua
        LEFT JOIN sections s ON (
            (ua.section_id IS NOT NULL AND ua.section_id = s.id) OR
            (ua.section_id IS NULL AND ua.section = s.section_name)
        )
        LEFT JOIN section_assignments sa ON (s.id = sa.section_id AND sa.status = 'active')
        LEFT JOIN buildings b ON sa.building_id = b.id
        WHERE ua.user_id = ? AND ua.status = 'active'
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$student_id]);
    $assignments = $stmt->fetchAll();
    
    echo json_encode($assignments);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
