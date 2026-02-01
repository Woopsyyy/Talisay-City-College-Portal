<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Step 1: PHP Extensions\n";
echo "PDO: " . (extension_loaded('pdo') ? 'YES' : 'NO') . "\n";
echo "PDO MySQL: " . (extension_loaded('pdo_mysql') ? 'YES' : 'NO') . "\n\n";

echo "Step 2: Try MySQL Connection\n";
try {
    $pdo = new PDO('mysql:host=localhost', 'root', '');
    echo "MySQL Server: RUNNING\n\n";
    
    echo "Step 3: Check Databases\n";
    $stmt = $pdo->query("SHOW DATABASES");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Available databases:\n";
    foreach ($databases as $db) {
        echo "  - $db\n";
    }
    
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "\nProbable causes:\n";
    echo "1. Laragon MySQL is not started\n";
    echo "2. Port 3306 is blocked or used by another program\n";
    echo "3. MySQL root user has a password set\n";
}
?>
