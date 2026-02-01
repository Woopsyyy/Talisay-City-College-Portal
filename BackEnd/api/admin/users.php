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
                    id, 
                    username, 
                    email, 
                    full_name, 
                    role, 
                    school_id, 
                    image_path,
                    created_at,
                    updated_at
                FROM users
                ORDER BY role, full_name
            ");
            
            $users = $stmt->fetchAll();
            
            
            foreach ($users as &$user) {
                if ($user['role'] === 'student') {
                    $countStmt = $pdo->prepare("
                        SELECT COUNT(*) 
                        FROM user_assignments 
                        WHERE user_id = ? AND status = 'active'
                    ");
                    $countStmt->execute([$user['id']]);
                    $user['assignment_count'] = (int)$countStmt->fetchColumn();
                } elseif ($user['role'] === 'teacher') {
                    $countStmt = $pdo->prepare("
                        SELECT COUNT(*) 
                        FROM teacher_assignments 
                        WHERE teacher_id = ? AND status = 'active'
                    ");
                    $countStmt->execute([$user['id']]);
                    $user['assignment_count'] = (int)$countStmt->fetchColumn();
                } else {
                    $user['assignment_count'] = 0;
                }
            }
            
            echo json_encode($users);
            break;
            
        case 'POST':
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            $email = $input['email'] ?? '';
            $fullName = $input['full_name'] ?? '';
            $role = $input['role'] ?? 'student';
            $schoolId = $input['school_id'] ?? null;
            
            if (empty($username) || empty($password) || empty($email) || empty($fullName)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            
            $checkStmt = $pdo->prepare("
                SELECT COUNT(*) FROM users 
                WHERE username = ? OR email = ?
            ");
            $checkStmt->execute([$username, $email]);
            
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'Username or email already exists']);
                exit;
            }
            
            
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            
            
            $stmt = $pdo->prepare("
                INSERT INTO users (username, password, email, full_name, role, school_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([$username, $hashedPassword, $email, $fullName, $role, $schoolId]);
            $userId = $pdo->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'user_id' => $userId,
                'message' => 'User created successfully'
            ]);
            break;
            
        case 'PUT':
            
            
            $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
            
            if (preg_match('/\/(\d+)\/role/', $path, $matches)) {
                $userId = $matches[1];
                $input = json_decode(file_get_contents('php://input'), true);
                $newRole = $input['role'] ?? '';
                
                if (empty($newRole) || !in_array($newRole, ['student', 'teacher', 'admin', 'go'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid role']);
                    exit;
                }
                
                $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
                $stmt->execute([$newRole, $userId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User role updated successfully'
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid request']);
            }
            break;
            
        case 'DELETE':
            
            
            $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
            
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $userId = $matches[1];
                
                
                if ($userId == $_SESSION['user_id']) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Cannot delete your own account']);
                    exit;
                }
                
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User deleted successfully'
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
