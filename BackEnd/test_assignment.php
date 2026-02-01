<?php

require_once __DIR__ . '/config/db.php';

try {
    $pdo = Database::connect();
    
    
    echo "=== User Assignments Table Structure ===\n";
    $stmt = $pdo->query("DESCRIBE user_assignments");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . " - " . $col['Type'] . "\n";
    }
    
    echo "\n=== Sample Student Assignment Data ===\n";
    $stmt = $pdo->query("
        SELECT 
            ua.id,
            ua.user_id,
            ua.section_id,
            ua.year_level,
            ua.section,
            ua.payment,
            ua.amount_lacking,
            ua.sanctions,
            ua.sanction_reason,
            u.username,
            u.full_name
        FROM user_assignments ua
        JOIN users u ON ua.user_id = u.id
        WHERE u.role = 'student'
        LIMIT 3
    ");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($data);
    
    echo "\n=== Sections Table ===\n";
    $stmt = $pdo->query("SELECT * FROM sections LIMIT 5");
    $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($sections);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
