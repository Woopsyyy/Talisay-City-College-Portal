<?php

require_once __DIR__ . '/config/db.php';

$files = [
    __DIR__ . '/Database/migrations/fix_user_assignment_columns.sql'
];

try {
    $pdo = Database::connect();
    
    foreach ($files as $file) {
        echo "Running migration: " . basename($file) . "\n";
        $sql = file_get_contents($file);
        
        
        
        
        $queries = explode(';', $sql);
        
        foreach ($queries as $query) {
            $query = trim($query);
            if (empty($query)) continue;
            
            try {
                $pdo->exec($query);
                echo "Executed: " . substr($query, 0, 50) . "...\n";
            } catch (Exception $e) {
                echo "Error executing query: " . $e->getMessage() . "\n";
                
            }
        }
    }
    echo "Migration complete.\n";
    
} catch (Exception $e) {
    echo "Connection Error: " . $e->getMessage() . "\n";
}
?>
