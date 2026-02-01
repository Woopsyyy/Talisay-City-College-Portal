<?php

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = Database::connect();
    
    echo "Adding course and major columns to sections table...\n";
    
    
    try {
        $pdo->exec("ALTER TABLE sections ADD COLUMN course VARCHAR(100) DEFAULT NULL");
        echo "✓ Added 'course' column\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "- 'course' column already exists\n";
        } else {
            throw $e;
        }
    }
    
    
    try {
        $pdo->exec("ALTER TABLE sections ADD COLUMN major VARCHAR(100) DEFAULT NULL");
        echo "✓ Added 'major' column\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "- 'major' column already exists\n";
        } else {
            throw $e;
        }
    }
    
    echo "\n✓ Migration completed successfully!\n";
    echo "Sections table now has course and major columns.\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
