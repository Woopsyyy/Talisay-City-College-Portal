<?php

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

try {
    $pdo = Database::connect();
    $stmt = $pdo->query("SELECT VERSION() as version, DATABASE() as current_db");
    $row = $stmt->fetch();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Connected to MySQL',
        'version' => $row['version'],
        'database' => $row['current_db']
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Connection failed: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
