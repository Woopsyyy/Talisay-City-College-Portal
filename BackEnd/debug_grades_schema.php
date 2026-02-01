<?php

require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::connect();
    echo "--- Grade Columns ---\n";
    $stmt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'grades' AND COLUMN_NAME LIKE '%grade%'");
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
    print_r($cols);

    echo "\n--- Semester Column Type ---\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM grades LIKE 'semester'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($col);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
