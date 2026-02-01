<?php

require_once __DIR__ . '/../../config/header.php';


if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized access']);
    exit;
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            
            $stmt = $pdo->query("
                SELECT 
                    s.id, 
                    s.section_name, 
                    s.grade_level, 
                    s.school_year,
                    s.course,
                    s.major,
                    s.created_at,
                    COUNT(DISTINCT ua.user_id) AS student_count,
                    COUNT(DISTINCT ta.teacher_id) AS teacher_count
                FROM sections s
                LEFT JOIN user_assignments ua ON s.id = ua.section_id AND ua.status = 'active'
                LEFT JOIN teacher_assignments ta ON s.id = ta.section_id AND ta.status = 'active'
                GROUP BY s.id, s.section_name, s.grade_level, s.school_year, s.course, s.major, s.created_at
                ORDER BY s.school_year DESC, s.section_name
            ");
            
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $sectionName = $input['section_name'] ?? '';
            $gradeLevel = $input['grade_level'] ?? '';
            $schoolYear = $input['school_year'] ?? '';
            $course = $input['course'] ?? null;
            $major = $input['major'] ?? null;
            
            if (empty($sectionName) || empty($gradeLevel) || empty($schoolYear)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM sections WHERE section_name = ?");
            $checkStmt->execute([$sectionName]);
            
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'Section already exists']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO sections (section_name, grade_level, school_year, course, major)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([$sectionName, $gradeLevel, $schoolYear, $course, $major]);
            
            echo json_encode([
                'success' => true,
                'section_id' => $pdo->lastInsertId(),
                'message' => 'Section created successfully'
            ]);
            break;
            
        case 'PUT':
            
            $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
            
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $sectionId = $matches[1];
                $input = json_decode(file_get_contents('php://input'), true);
                
                $sectionName = $input['section_name'] ?? '';
                $gradeLevel = $input['grade_level'] ?? '';
                $schoolYear = $input['school_year'] ?? '';
                $course = $input['course'] ?? null;
                $major = $input['major'] ?? null;
                
                if (empty($sectionName) || empty($gradeLevel) || empty($schoolYear)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Missing required fields']);
                    exit;
                }
                
                $stmt = $pdo->prepare("
                    UPDATE sections 
                    SET section_name = ?, grade_level = ?, school_year = ?, course = ?, major = ?
                    WHERE id = ?
                ");
                
                $stmt->execute([$sectionName, $gradeLevel, $schoolYear, $course, $major, $sectionId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Section updated successfully'
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
            }
            break;
            
        case 'DELETE':
            
            $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
            
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $sectionId = $matches[1];
                
                
                $checkStmt = $pdo->prepare("
                    SELECT COUNT(*) FROM user_assignments 
                    WHERE section_id = ? AND status = 'active'
                ");
                $checkStmt->execute([$sectionId]);
                
                if ($checkStmt->fetchColumn() > 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Cannot delete section with active students']);
                    exit;
                }
                
                $stmt = $pdo->prepare("DELETE FROM sections WHERE id = ?");
                $stmt->execute([$sectionId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Section deleted successfully'
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
