<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../helpers/Validator.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT 
                    sl.id,
                    sl.course,
                    sl.major,
                    sl.year_level,
                    sl.section,
                    sl.subject_code,
                    sl.subject_title,
                    sl.units,
                    sl.semester,
                    sl.teacher,
                    sl.created_at
                FROM section_subjects sl
                ORDER BY sl.course, sl.major, sl.year_level, sl.section, sl.subject_code
            ");
            
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'course' => 'required|string',
                'major' => 'required|string',
                'year_level' => 'required|integer',
                'section' => 'required|string',
                'subject_code' => 'required|string',
                'subject_title' => 'required|string',
                'units' => 'required',
                'semester' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $stmt = $pdo->prepare("
                SELECT id FROM section_subjects 
                WHERE course = ? AND major = ? AND year_level = ? 
                AND section = ? AND subject_code = ? AND semester = ?
            ");
            $stmt->execute([
                $input['course'],
                $input['major'],
                $input['year_level'],
                $input['section'],
                $input['subject_code'],
                $input['semester']
            ]);
            
            if ($stmt->fetch()) {
                Response::error('This subject is already assigned to this section', 409);
            }
            
            
            $stmt = $pdo->prepare("
                INSERT INTO section_subjects 
                (course, major, year_level, section, subject_code, subject_title, units, semester, teacher) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $input['course'],
                $input['major'],
                $input['year_level'],
                $input['section'],
                $input['subject_code'],
                $input['subject_title'],
                (float)$input['units'],
                $input['semester'],
                $input['teacher'] ?? null
            ]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'Study load created');
            break;
            
        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("DELETE FROM section_subjects WHERE id = ?");
                $stmt->execute([$id]);
                Response::success(null, 'Study load deleted');
            } else {
                Response::error('Invalid request', 400);
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
