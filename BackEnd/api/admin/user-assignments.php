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
                    ua.id,
                    u.id AS user_id,
                    ua.year_level AS year,
                    ua.section,
                    ua.department,
                    ua.major,
                    ua.payment,
                    ua.amount_lacking,
                    ua.sanctions,
                    ua.sanction_reason,
                    ua.created_at,
                    u.username,
                    u.full_name,
                    u.role
                FROM users u
                LEFT JOIN user_assignments ua ON u.id = ua.user_id
                WHERE u.role = 'student'
                ORDER BY u.full_name
            ");
            
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'full_name' => 'required|string',
                'year' => 'required|integer',
                'section' => 'required|string'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $user_id = $input['user_id'] ?? null;
            
            if (!$user_id) {
                
                $stmt = $pdo->prepare("SELECT id FROM users WHERE full_name = ? LIMIT 1");
                $stmt->execute([$input['full_name']]);
                $user = $stmt->fetch();
                
                if ($user) {
                    $user_id = $user['id'];
                } else {
                    Response::error('User not found. Please create the user first.', 404);
                }
            }
            
            
            $stmt = $pdo->prepare("
                INSERT INTO user_assignments 
                (user_id, year_level, section, department, major, payment, amount_lacking, sanctions, sanction_reason) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $user_id,
                $input['year'],
                $input['section'],
                $input['department'] ?? null,
                $input['major'] ?? null,
                in_array($input['payment'] ?? '', ['paid', 'owing']) ? $input['payment'] : 'paid',
                $input['amount_lacking'] ?? null,
                $input['sanctions'] ?? false,
                $input['sanction_reason'] ?? null
            ]);
            
            Response::success(['id' => $pdo->lastInsertId()], 'User assignment created');
            break;
            
        case 'PUT':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1]; 
                
                
                
                
                
                
                
                $input = json_decode(file_get_contents('php://input'), true);
                
                
                
                
                
                
                
                $sql = "UPDATE user_assignments SET 
                        year_level = ?, 
                        section = ?, 
                        department = ?, 
                        major = ?, 
                        payment = ?, 
                        amount_lacking = ?, 
                        sanctions = ?, 
                        sanction_reason = ? 
                        WHERE id = ?";
                
                $stmt = $pdo->prepare($sql);
                
                
                $sanctionsValue = ($input['sanctions'] === true || $input['sanctions'] === 1) ? 1 : 0;
                $sanctionReason = $sanctionsValue === 1 ? ($input['sanction_reason'] ?? null) : null;
                
                $stmt->execute([
                    $input['year'],
                    $input['section'],
                    $input['department'] ?? null,
                    $input['major'] ?? null,
                    
                    
                    in_array($input['payment'] ?? '', ['paid', 'owing']) ? $input['payment'] : 'paid',
                    $input['amount_lacking'] ?? null,
                    $sanctionsValue,
                    $sanctionReason,
                    $id
                ]);
                
                Response::success(null, 'Assignment updated successfully');
            } else {
                Response::error('Invalid request', 400);
            }
            break;

        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("DELETE FROM user_assignments WHERE id = ?");
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
