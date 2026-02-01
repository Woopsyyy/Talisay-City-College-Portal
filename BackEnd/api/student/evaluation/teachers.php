<?php

require_once __DIR__ . '/../../../config/header.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/Response.php';

if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $user_id = $_SESSION['user_id'];

    
    $stmt = $pdo->prepare("
        SELECT 
            ua.year_level, 
            ua.section, 
            ua.department, 
            ua.major,
            s.id as section_id,
            s.course as section_course,
            s.major as section_major,
            s.grade_level as section_year
        FROM user_assignments ua
        LEFT JOIN sections s ON s.section_name = ua.section AND s.grade_level = ua.year_level
        WHERE ua.user_id = ? AND ua.status = 'active' 
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $assignment = $stmt->fetch();

    if (!$assignment) {
        
        $stmt = $pdo->prepare("
            SELECT 
                ua.year_level, 
                ua.section, 
                ua.department, 
                ua.major,
                s.id as section_id,
                s.course as section_course,
                s.major as section_major,
                s.grade_level as section_year
            FROM user_assignments ua
            LEFT JOIN sections s ON s.section_name = ua.section AND s.grade_level = ua.year_level
            WHERE ua.user_id = ? 
            ORDER BY ua.created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$user_id]);
        $assignment = $stmt->fetch();
        
        if (!$assignment) {
            echo json_encode(['teachers' => []]);
            exit;
        }
    }

    
    
    
    
    
    
    $query = "
        SELECT DISTINCT 
            COALESCE(NULLIF(ss.teacher, ''), u.full_name) as teacher_name, 
            ss.subject_title,
            COALESCE(u_ss.id, u.id) as teacher_id
        FROM section_subjects ss
        LEFT JOIN subjects s ON ss.subject_code = s.subject_code
        -- Join for Global Assignment (Fallback)
        LEFT JOIN teacher_assignments ta ON s.id = ta.subject_id AND ta.status = 'active'
        LEFT JOIN users u ON ta.teacher_id = u.id
        -- Join for Section Specific Teacher ID lookup
        LEFT JOIN users u_ss ON ss.teacher = u_ss.full_name AND u_ss.role = 'teacher'
        WHERE ss.year_level = ?
    ";
    
    $params = [$assignment['year_level']];
    
    
    if (!empty($assignment['section_course'])) {
        $query .= " AND ss.course = ?";
        $params[] = $assignment['section_course'];
    } elseif (!empty($assignment['department'])) {
        $query .= " AND ss.course = ?";
        $params[] = $assignment['department'];
    }
    
    if (!empty($assignment['section_major'])) {
        $query .= " AND ss.major = ?";
        $params[] = $assignment['section_major'];
    } elseif (!empty($assignment['major'])) {
        $query .= " AND ss.major = ?";
        $params[] = $assignment['major'];
    }
    
    
    $query .= " AND (ss.section = ? OR ss.section IS NULL OR ss.section = '')";
    $params[] = $assignment['section'];
    
    
    $query .= " HAVING teacher_name IS NOT NULL AND teacher_name != '' ORDER BY teacher_name";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $teachersMap = [];
    foreach($rows as $row) {
        $name = $row['teacher_name'];
        if (!$name) continue;

        if (!isset($teachersMap[$name])) {
            $teachersMap[$name] = [
                'id' => $row['teacher_id'] ? $row['teacher_id'] : 'temp-' . md5($name),
                'name' => $name,
                'subjects' => [],
                'evaluated' => false 
            ];
        }
        if (!in_array($row['subject_title'], $teachersMap[$name]['subjects'])) {
            $teachersMap[$name]['subjects'][] = $row['subject_title'];
        }
    }

    echo json_encode(['teachers' => array_values($teachersMap)]);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
