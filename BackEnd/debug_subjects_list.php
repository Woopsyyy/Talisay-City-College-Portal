<?php

require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::connect();
    $stmt = $pdo->query("SELECT * FROM subjects LIMIT 5");
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h1>Debug Subject List</h1>";
    if (empty($subjects)) {
        echo "No subjects found in DB.";
    } else {
        echo "<pre>" . print_r($subjects, true) . "</pre>";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
