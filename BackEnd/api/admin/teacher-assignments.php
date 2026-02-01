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
                    ta.id,
                    ta.teacher_id,
                    ta.subject_id,
                    ta.section_id,
                    ta.status,
                    ta.created_at,
                    u.full_name,
                    u.username,
                    s.subject_code,
                    s.subject_name AS subject_title,
                    sec.section_name,
                    sec.grade_level
                FROM teacher_assignments ta
                LEFT JOIN users u ON ta.teacher_id = u.id
                LEFT JOIN subjects s ON ta.subject_id = s.id
                LEFT JOIN sections sec ON ta.section_id = sec.id
                WHERE ta.status = 'active'
                ORDER BY u.full_name, s.subject_code
            ");
            
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'teacher_name' => 'string',
                'subject_code' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $teacher_id = $input['user_id'] ?? null;
            if (!$teacher_id && isset($input['teacher_name'])) {
                $stmt = $pdo->prepare("SELECT id FROM users WHERE full_name = ? AND role = 'teacher' LIMIT 1");
                $stmt->execute([$input['teacher_name']]);
                $teacher = $stmt->fetch();
                $teacher_id = $teacher['id'] ?? null;
            }
            
            if (!$teacher_id) {
                Response::error('Teacher not found', 404);
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM subjects WHERE subject_code = ? LIMIT 1");
            $stmt->execute([$input['subject_code']]);
            $subject = $stmt->fetch();
            $subject_id = $subject['id'] ?? null;
            
            if (!$subject_id) {
                Response::error('Subject not found', 404);
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM teacher_assignments WHERE teacher_id = ? AND subject_id = ? AND status = 'active'");
            $stmt->execute([$teacher_id, $subject_id]);
            if ($stmt->fetch()) {
                Response::error('This teacher is already assigned to this subject', 409);
            }
            
            
            $stmt = $pdo->prepare("INSERT INTO teacher_assignments (teacher_id, subject_id, status) VALUES (?, ?, 'active')");
            $stmt->execute([$teacher_id, $subject_id]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'Teacher assignment created');
            break;
            
        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("DELETE FROM teacher_assignments WHERE id = ?");
                $stmt->execute([$id]);
                Response::success(null, 'Assignment deleted');
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
