<?php

require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::connect();
    echo "DB Connected.\n";

    
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table verified.\n";

    
    $enabled = '1';
    $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) 
                           VALUES ('evaluation_enabled', :val) 
                           ON DUPLICATE KEY UPDATE setting_value = :val");
    $stmt->execute(['val' => $enabled]);
    echo "Update Success.\n";

    
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'evaluation_enabled'");
    $stmt->execute();
    $val = $stmt->fetchColumn();
    echo "Value is: " . $val . "\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>
