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
                SELECT id, title, content, target_role, priority, is_published, published_at, expires_at, created_at, author_id
                FROM announcements
                ORDER BY published_at DESC
            ");
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $title = $input['title'] ?? '';
            $content = $input['content'] ?? '';
            $target_role = $input['target_role'] ?? 'all';
            $priority = $input['priority'] ?? 'medium';
            $is_published = $input['is_published'] ?? true;
            $expires_at = !empty($input['expires_at']) ? $input['expires_at'] : null;
            $author_id = $_SESSION['user_id'];
            
            if (empty($title) || empty($content)) {
                http_response_code(400);
                echo json_encode(['error' => 'Title and content are required']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO announcements (title, content, target_role, priority, is_published, published_at, expires_at, author_id)
                VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
            ");
            
            $stmt->execute([$title, $content, $target_role, $priority, $is_published ? 1 : 0, $expires_at, $author_id]);
            
            echo json_encode([
                'success' => true,
                'id' => $pdo->lastInsertId(),
                'message' => 'Announcement created successfully'
            ]);
            break;
            
        case 'PUT':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $input = json_decode(file_get_contents('php://input'), true);
                
                $title = $input['title'] ?? '';
                $content = $input['content'] ?? '';
                $target_role = $input['target_role'] ?? 'all';
                $priority = $input['priority'] ?? 'medium';
                $is_published = isset($input['is_published']) ? $input['is_published'] : true;
                $expires_at = !empty($input['expires_at']) ? $input['expires_at'] : null;
                
                if (empty($title) || empty($content)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Title and content are required']);
                    exit;
                }
                
                $stmt = $pdo->prepare("
                    UPDATE announcements 
                    SET title = ?, content = ?, target_role = ?, priority = ?, is_published = ?, expires_at = ?
                    WHERE id = ?
                ");
                
                $stmt->execute([$title, $content, $target_role, $priority, $is_published ? 1 : 0, $expires_at, $id]);
                
                echo json_encode(['success' => true, 'message' => 'Announcement updated']);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
            }
            break;
            
        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Announcement deleted']);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
