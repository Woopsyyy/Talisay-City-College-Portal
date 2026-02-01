<?php

require_once __DIR__ . '/config/database.php';

$table = $_GET['table'] ?? 'section_subjects';

try {
    $pdo = Database::connect();
    echo "--- Schema for $table ---\n";
    $stmt = $pdo->prepare("DESCRIBE $table");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . " | " . $col['Type'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
