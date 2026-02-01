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
                    sa.id,
                    sa.section_id,
                    sa.building_id,
                    sa.floor_number AS floor,
                    sa.room_number AS room,
                    sa.school_year,
                    sa.status,
                    sec.section_name AS section,
                    sec.grade_level AS year,
                    b.building_name AS building
                FROM section_assignments sa
                JOIN sections sec ON sa.section_id = sec.id
                JOIN buildings b ON sa.building_id = b.id
                WHERE sa.status = 'active'
                ORDER BY b.building_name, sa.floor_number, sa.room_number
            ");
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'section' => 'required|string',
                'building' => 'required|string',
                'floor' => 'required|integer',
                'room' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $stmt = $pdo->prepare("SELECT id FROM sections WHERE section_name = ? LIMIT 1");
            $stmt->execute([$input['section']]);
            $section = $stmt->fetch();
            if (!$section) {
                Response::error('Section not found', 404);
            }
            $section_id = $section['id'];
            
            
            $stmt = $pdo->prepare("SELECT id FROM buildings WHERE building_name = ? LIMIT 1");
            $stmt->execute([$input['building']]);
            $building = $stmt->fetch();
            if (!$building) {
                Response::error('Building not found', 404);
            }
            $building_id = $building['id'];
            
            
            $stmt = $pdo->prepare("SELECT id FROM section_assignments WHERE section_id = ? AND status = 'active'");
            $stmt->execute([$section_id]);
            if ($stmt->fetch()) {
                Response::error('This section is already assigned to a room', 409);
            }
            
            $school_year = $input['school_year'] ?? date('Y') . '-' . (date('Y') + 1);
            
            $stmt = $pdo->prepare("
                INSERT INTO section_assignments (section_id, building_id, floor_number, room_number, school_year, status)
                VALUES (?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$section_id, $building_id, $input['floor'], $input['room'], $school_year]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'Section assigned successfully');
            break;
            
        case 'PUT':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $input = json_decode(file_get_contents('php://input'), true);
                
                $validator = new Validator($input);
                $rules = [
                    'building' => 'required|string',
                    'floor' => 'required|integer',
                    'room' => 'required|string'
                ];
                
                if (!$validator->validate($rules)) {
                    Response::validationError($validator->errors());
                }
                
                
                $stmt = $pdo->prepare("SELECT id FROM buildings WHERE building_name = ? LIMIT 1");
                $stmt->execute([$input['building']]);
                $building = $stmt->fetch();
                if (!$building) {
                    Response::error('Building not found', 404);
                }
                $building_id = $building['id'];
                
                $stmt = $pdo->prepare("
                    UPDATE section_assignments 
                    SET building_id = ?, floor_number = ?, room_number = ?
                    WHERE id = ?
                ");
                $stmt->execute([$building_id, $input['floor'], $input['room'], $id]);
                
                Response::success(null, 'Assignment updated successfully');
            } else {
                Response::error('Invalid request', 400);
            }
            break;
            
        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("UPDATE section_assignments SET status = 'inactive' WHERE id = ?");
                $stmt->execute([$id]);
                Response::success(null, 'Assignment deleted successfully');
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
