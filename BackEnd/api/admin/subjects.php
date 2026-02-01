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
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    
    
    $id = null;
    if (preg_match('/\/(\d+)$/', $pathInfo, $matches)) {
        $id = (int)$matches[1];
    }
    
    switch ($method) {
        case 'GET':
            if ($id) {
                
                $stmt = $pdo->prepare("SELECT * FROM subjects WHERE id = ?");
                $stmt->execute([$id]);
                $subject = $stmt->fetch();
                if (!$subject) {
                    Response::error('Subject not found', 404);
                }
                echo json_encode($subject);
            } else {
                
                $stmt = $pdo->query("
                    SELECT 
                        id,
                        subject_code,
                        subject_name,
                        units,
                        course,
                        major,
                        year_level,
                        semester,
                        created_at
                    FROM subjects
                    ORDER BY course, major, year_level, subject_code
                ");
                echo json_encode($stmt->fetchAll());
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'subject_code' => 'required|string',
                'subject_name' => 'required|string',
                'units' => 'required',
                'course' => 'required|string',
                'year_level' => 'required|integer',
                'semester' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM subjects WHERE subject_code = ?");
            $stmt->execute([strtoupper($input['subject_code'])]);
            if ($stmt->fetch()) {
                Response::error("Subject code already exists", 409);
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO subjects 
                (subject_code, subject_name, units, course, major, year_level, semester) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                strtoupper($input['subject_code']),
                $input['subject_name'],
                (float)$input['units'],
                $input['course'],
                $input['major'] ?? '',
                (int)$input['year_level'],
                $input['semester']
            ]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'Subject created');
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('Subject ID required', 400);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'subject_code' => 'required|string',
                'subject_name' => 'required|string',
                'units' => 'required',
                'course' => 'required|string',
                'year_level' => 'required|integer',
                'semester' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM subjects WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                Response::error('Subject not found', 404);
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM subjects WHERE subject_code = ? AND id != ?");
            $stmt->execute([strtoupper($input['subject_code']), $id]);
            if ($stmt->fetch()) {
                Response::error("Subject code already exists", 409);
            }
            
            $stmt = $pdo->prepare("
                UPDATE subjects 
                SET subject_code = ?, subject_name = ?, units = ?, course = ?, major = ?, year_level = ?, semester = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                strtoupper($input['subject_code']),
                $input['subject_name'],
                (float)$input['units'],
                $input['course'],
                $input['major'] ?? '',
                (int)$input['year_level'],
                $input['semester'],
                $id
            ]);
            
            Response::success(null, 'Subject updated');
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('Subject ID required', 400);
            }
            
            
            $stmt = $pdo->prepare("SELECT subject_code FROM subjects WHERE id = ?");
            $stmt->execute([$id]);
            $code = $stmt->fetchColumn();

            
            $stmt = $pdo->prepare("DELETE FROM teacher_assignments WHERE subject_id = ?");
            $stmt->execute([$id]);

            
            if ($code) {
                $stmt = $pdo->prepare("DELETE FROM schedules WHERE subject_code = ?");
                $stmt->execute([$code]);
                
                
                
                try {
                     $stmt = $pdo->prepare("DELETE FROM section_subjects WHERE subject_code = ?");
                     $stmt->execute([$code]);
                } catch (Exception $e) {
                    
                }
            }
            
            
            $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = ?");
            try {
                $stmt->execute([$id]);
                if ($stmt->rowCount() > 0) {
                    Response::success(null, 'Subject and related assignments deleted');
                } else {
                    Response::error('Subject not found', 404);
                }
            } catch (PDOException $e) {
                
                Response::error('Cannot delete: ' . $e->getMessage(), 400); 
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
