<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../helpers/Validator.php';
require_once __DIR__ . '/../../helpers/Response.php';

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
                    id, 
                    name, 
                    status, 
                    budget, 
                    start_date as started, 
                    description, 
                    created_at 
                FROM campus_projects 
                ORDER BY created_at DESC
            ");
            echo json_encode($stmt->fetchAll());
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            $rules = [
                'name' => 'required|string',
                'status' => 'required|string',
                'budget' => 'required|string',
                'started' => 'required|date'
            ];
            
            if (!$validator->validate($rules)) {
                 Response::validationError($validator->errors());
            }

            $stmt = $pdo->prepare("INSERT INTO campus_projects (name, status, budget, start_date) VALUES (?, ?, ?, ?)");
            
            $stmt->execute([
                $input['name'],
                $input['status'],
                $input['budget'],
                $input['started']
            ]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'Project created successfully');
            break;
            
        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            
            
            
            
            $id = null;
            if (isset($_GET['id'])) {
                $id = $_GET['id'];
            } elseif (preg_match('/\/(\d+)$/', $_SERVER['PATH_INFO'] ?? '', $matches)) {
                $id = $matches[1];
            }
            
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM campus_projects WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            } else {
                 http_response_code(400);
                 echo json_encode(['error' => 'Missing ID']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
