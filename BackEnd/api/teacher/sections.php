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
        SELECT DISTINCT
            sec.section_name,
            sec.grade_level,
            sec.course,
            s.subject_code,
            s.subject_name
        FROM schedules sc
        JOIN sections sec ON sc.section_id = sec.id
        JOIN subjects s ON sc.subject_code = s.subject_code
        
        -- Global Check
        LEFT JOIN teacher_assignments ta ON s.id = ta.subject_id AND ta.teacher_id = ? AND ta.status = 'active'
        
        -- Specific Check
        LEFT JOIN section_subjects ss ON ss.subject_code = sc.subject_code AND ss.section = sec.section_name AND ss.teacher = ?
        
        WHERE ta.id IS NOT NULL OR ss.id IS NOT NULL
        ORDER BY sec.section_name, s.subject_name
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$userId, $userFullName]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    
    $sections = [];
    foreach ($rows as $row) {
        $secName = $row['section_name'];
        if (!isset($sections[$secName])) {
            $sections[$secName] = [
                'name' => $secName,
                'year_level' => $row['grade_level'],
                'course' => $row['course'],
                'subjects' => []
            ];
        }
        $sections[$secName]['subjects'][] = [
            'code' => $row['subject_code'],
            'name' => $row['subject_name']
        ];
    }

    echo json_encode(array_values($sections));

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
