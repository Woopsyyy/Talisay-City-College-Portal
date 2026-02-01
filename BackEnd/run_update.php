<?php

require_once __DIR__ . '/config/db.php';

try {
    $pdo = Database::connect();
    echo "Updating payment values...\n";
    $pdo->exec("UPDATE user_assignments SET payment = 'owing' WHERE payment = 'unpaid'");
    $pdo->exec("UPDATE user_assignments SET payment = 'owing' WHERE payment = 'partial'"); 
    echo "Update complete.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
