<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    
    $stmt = $pdo->query("SELECT * FROM campus_projects ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
