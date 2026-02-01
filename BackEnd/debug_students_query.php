<?php

require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::connect();
    
    
    echo "--- User Assignments Sections ---\n";
    $stmt = $pdo->query("SELECT DISTINCT section, COUNT(*) as count FROM user_assignments GROUP BY section");
    $uaSections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($uaSections);
    
    
    echo "\n--- Sections Table ---\n";
    $stmt = $pdo->query("SELECT section_name FROM sections");
    $allSections = $stmt->fetchAll(PDO::FETCH_COLUMN);
    print_r($allSections);

    
    echo "\n--- Teachers ---\n";
    $stmt = $pdo->query("SELECT id, full_name, role FROM users WHERE role = 'teacher'");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
