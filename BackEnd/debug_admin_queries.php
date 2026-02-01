<?php
require_once 'config/db.php';

function testQuery($name, $sql) {
    global $pdo;
    echo "Testing $name... ";
    try {
        $stmt = $pdo->query($sql);
        $stmt->fetchAll();
        echo "OK\n";
    } catch (Exception $e) {
        echo "FAIL: " . $e->getMessage() . "\n";
    }
}

try {
    $pdo = Database::connect();
    
    
    $sql1 = "
        SELECT 
            ta.id, ta.teacher_id, ta.subject_id, ta.section_id, ta.status, ta.created_at,
            u.full_name, u.username,
            s.subject_code, s.subject_name AS subject_title,
            sec.section_name, sec.grade_level
        FROM teacher_assignments ta
        LEFT JOIN users u ON ta.teacher_id = u.id
        LEFT JOIN subjects s ON ta.subject_id = s.id
        LEFT JOIN sections sec ON ta.section_id = sec.id
        WHERE ta.status = 'active'
    ";
    testQuery("Teacher Assignments", $sql1);

    
    $sql2 = "
        SELECT 
            sc.id,
            sc.subject_code AS subject,
            sc.section_id,
            sc.day_of_week AS day,
            sc.time_start,
            sc.time_end,
            sc.room_id,
            sc.created_at,
            s.subject_name AS subject_name,
            sec.section_name AS section,
            sec.grade_level AS year,
            u.full_name AS instructor,
            r.building_name AS building,
            r.room_number AS room
        FROM schedules sc
        LEFT JOIN subjects s ON sc.subject_code = s.subject_code
        LEFT JOIN sections sec ON sc.section_id = sec.id
        LEFT JOIN teacher_assignments ta ON sc.subject_code = ta.subject_id AND sc.section_id = ta.section_id
        LEFT JOIN users u ON ta.teacher_id = u.id
        LEFT JOIN rooms r ON sc.room_id = r.id
    ";
    testQuery("Schedules", $sql2);

    
    $sql3 = "
        SELECT 
            b.id, b.building_name, b.num_floors, b.rooms_per_floor,
            COUNT(DISTINCT sa.id) AS assigned_rooms
        FROM buildings b
        LEFT JOIN section_assignments sa ON b.id = sa.building_id AND sa.status = 'active'
        GROUP BY b.id, b.building_name, b.num_floors, b.rooms_per_floor
    ";
    testQuery("Buildings", $sql3);

} catch (Exception $e) {
    echo "Connection Error: " . $e->getMessage() . "\n";
}
?>
