<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();

    
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'evaluation_enabled'");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        $enabled = ($val === false) ? true : ($val === '1');
        echo json_encode(['enabled' => $enabled]);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $enabled = isset($data['enabled']) && $data['enabled'] ? '1' : '0';
        
        
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) 
                               VALUES ('evaluation_enabled', :val1) 
                               ON DUPLICATE KEY UPDATE setting_value = :val2");
        $stmt->execute(['val1' => $enabled, 'val2' => $enabled]);
        
        echo json_encode(['success' => true, 'enabled' => $enabled === '1']);
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
