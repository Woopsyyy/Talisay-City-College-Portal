<?php
require_once 'config/db.php';
try {
    $pdo = Database::connect();
    
    
    try {
        $pdo->exec("ALTER TABLE schedules ADD COLUMN subject_code VARCHAR(50)");
        echo "Added subject_code.\n";
    } catch (Exception $e) {
        echo "subject_code might exist: " . $e->getMessage() . "\n";
    }

    
    try {
        $pdo->exec("ALTER TABLE schedules ADD COLUMN section_id INT");
        echo "Added section_id.\n";
    } catch (Exception $e) {
        echo "section_id might exist: " . $e->getMessage() . "\n";
    }

    
    try {
        $pdo->exec("ALTER TABLE schedules MODIFY COLUMN teacher_assignment_id INT NULL");
        echo "Modified teacher_assignment_id to NULL.\n";
    } catch (Exception $e) {
        echo "Modify failed: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}
