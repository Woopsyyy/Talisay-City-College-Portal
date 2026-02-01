<?php
require_once __DIR__ . '/config/database.php';
try {
    $pdo = Database::connect();
    $stmt = $pdo->query("DESCRIBE users");
    echo "<pre>" . print_r($stmt->fetchAll(PDO::FETCH_ASSOC), true) . "</pre>";
} catch (Exception $e) { echo $e->getMessage(); }
?>
