<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';


if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();

    
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'evaluation_enabled'");
    $stmt->execute();
    $val = $stmt->fetchColumn();
    $enabled = ($val === false) ? true : ($val === '1');
    echo json_encode(['enabled' => $enabled]);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
