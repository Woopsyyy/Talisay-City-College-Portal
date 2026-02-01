<?php

echo "=== LARAGON MYSQL CONNECTION TEST ===\n\n";


echo "1. Checking PDO MySQL extension... ";
if (extension_loaded('pdo_mysql')) {
    echo "✓ INSTALLED\n";
} else {
    echo "✗ NOT INSTALLED - You need to enable pdo_mysql in php.ini\n";
    exit(1);
}


echo "\n2. Environment Variables:\n";
echo "   DB_HOST: " . (getenv('DB_HOST') ?: 'localhost (default)') . "\n";
echo "   DB_PORT: " . (getenv('DB_PORT') ?: '3306 (default)') . "\n";
echo "   DB_NAME: " . (getenv('DB_NAME') ?: 'tccportal (default)') . "\n";
echo "   DB_USER: " . (getenv('DB_USER') ?: 'root (default)') . "\n";


echo "\n3. Testing MySQL server connection... ";
try {
    $pdo = new PDO('mysql:host=localhost;port=3306', 'root', '');
    echo "✓ MySQL server is running\n";
} catch (PDOException $e) {
    echo "✗ FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    echo "\n⚠️  ACTION NEEDED: Start MySQL in Laragon (click 'Start All' button)\n";
    exit(1);
}


echo "\n4. Checking database 'tccportal'... ";
try {
    $stmt = $pdo->query("SHOW DATABASES LIKE 'tccportal'");
    if ($stmt->rowCount() > 0) {
        echo "✓ EXISTS\n";
    } else {
        echo "✗ NOT FOUND\n";
        echo "\n⚠️  ACTION NEEDED: Create database 'tccportal' in Laragon\n";
        echo "   - Open Laragon menu → Database → MySQL\n";
        echo "   - Or run: CREATE DATABASE tccportal;\n";
        exit(1);
    }
} catch (PDOException $e) {
    echo "✗ FAILED: " . $e->getMessage() . "\n";
    exit(1);
}


echo "\n5. Testing connection to tccportal database... ";
try {
    $pdo = new PDO('mysql:host=localhost;port=3306;dbname=tccportal;charset=utf8mb4', 'root', '');
    echo "✓ SUCCESS\n";
} catch (PDOException $e) {
    echo "✗ FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    exit(1);
}


echo "\n6. Testing basic query... ";
try {
    $stmt = $pdo->query("SELECT DATABASE() as current_db");
    $result = $stmt->fetch();
    echo "✓ Connected to: " . $result['current_db'] . "\n";
} catch (PDOException $e) {
    echo "✗ FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ All checks passed! Your backend should work.\n";
echo "\nTo access your backend, visit: http://localhost/TCC%20(react%20+%20postgres%20+%20php)/BackEnd/\n";
?>
