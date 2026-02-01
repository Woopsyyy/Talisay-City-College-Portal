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
                    b.id,
                    b.building_name AS name,
                    b.num_floors AS floors,
                    b.rooms_per_floor,
                    COUNT(DISTINCT sa.id) AS assigned_rooms
                FROM buildings b
                LEFT JOIN section_assignments sa ON b.id = sa.building_id AND sa.status = 'active'
                GROUP BY b.id, b.building_name, b.num_floors, b.rooms_per_floor
                ORDER BY b.building_name
            ");
            
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $name = $input['name'] ?? ''; 
            
            
            
            
            
            if (empty($name)) $name = $input['building_name'] ?? '';
            
            $floors = $input['floors'] ?? $input['num_floors'] ?? 0;
            $rooms = $input['rooms_per_floor'] ?? 0;
            
            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['error' => 'Building name is required']);
                exit;
            }
            
            
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM buildings WHERE building_name = ?");
            $checkStmt->execute([$name]);
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'Building already exists']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO buildings (building_name, num_floors, rooms_per_floor)
                VALUES (?, ?, ?)
            ");
            
            $stmt->execute([$name, $floors, $rooms]);
            
            echo json_encode([
                'success' => true,
                'building_id' => $pdo->lastInsertId(),
                'message' => 'Building created successfully'
            ]);
            break;
            
        case 'DELETE':
            
            
            
            
            $path = $_SERVER['PATH_INFO'] ?? '';
            $name = trim($path, '/');
            $name = urldecode($name);
            
            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
                exit;
            }
            
            
            $checkStmt = $pdo->prepare("
                SELECT COUNT(*) FROM section_assignments 
                WHERE building_id = (SELECT id FROM buildings WHERE building_name = ?)
                AND status = 'active'
            ");
            $checkStmt->execute([$name]);
            
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete building with active room assignments']);
                exit;
            }
            
            $stmt = $pdo->prepare("DELETE FROM buildings WHERE building_name = ?");
            $stmt->execute([$name]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Building deleted successfully'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Building not found']);
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
