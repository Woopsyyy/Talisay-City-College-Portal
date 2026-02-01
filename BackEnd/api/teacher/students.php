<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

$section = $_GET['section'] ?? '';

if (empty($section)) {
    echo json_encode([]);
    exit;
}

try {
    $pdo = Database::connect();
    
    $query = "
        SELECT u.id, u.full_name, u.image_path, u.username, u.school_id
        FROM users u
        JOIN user_assignments ua ON u.id = ua.user_id
        WHERE ua.section = ? AND u.role = 'student'
        ORDER BY u.full_name
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$section]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
