<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['section_id'])) {
    Response::error("Section ID required", 400);
}

try {
    $pdo = Database::connect();
    
    
    $stmt = $pdo->prepare("DELETE FROM schedules WHERE section_id = ?");
    $stmt->execute([$input['section_id']]);
    
    Response::success(null, "Study load cleared successfully");

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
