<?php
require_once 'config/db.php';
try {
    $pdo = Database::connect();
    
    
    $queries = [
        "ALTER TABLE schedules CHANGE start_time time_start TIME",
        "ALTER TABLE schedules CHANGE end_time time_end TIME"
    ];

    foreach ($queries as $sql) {
        try {
            $pdo->exec($sql);
            echo "Executed: $sql\n";
        } catch (Exception $e) {
            echo "Failed: $sql (" . $e->getMessage() . ")\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
