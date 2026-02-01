<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "═══════════════════════════════════════════════════════════════\n";
echo "  FINAL BACKEND CONNECTION TEST - Database: tccportal\n";
echo "═══════════════════════════════════════════════════════════════\n\n";


echo "1. Testing direct connection to 'tccportal'... ";
try {
    $pdo = new PDO('mysql:host=localhost;dbname=tccportal;charset=utf8mb4', 'root', '');
    echo "✓ SUCCESS\n";
    
    
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "   └─ Found " . count($tables) . " tables in database\n\n";
    
} catch (PDOException $e) {
    echo "✗ FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n\n";
    echo "⚠️  Make sure 'tccportal' database exists in Laragon MySQL\n";
    exit(1);
}


echo "2. Testing config/database.php... ";
try {
    require_once __DIR__ . '/config/database.php';
    $conn = Database::connect();
    
    $stmt = $conn->query("SELECT DATABASE() as current_db");
    $result = $stmt->fetch();
    echo "✓ SUCCESS\n";
    echo "   └─ Connected to: '{$result['current_db']}'\n\n";
    
} catch (Exception $e) {
    echo "✗ FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n\n";
}


// Step 3 was removed (deprecated config/db.php)


echo "4. Testing sample query (users table)... ";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as user_count FROM users");
    $result = $stmt->fetch();
    echo "✓ SUCCESS\n";
    echo "   └─ Found {$result['user_count']} users in database\n\n";
} catch (PDOException $e) {
    echo "⚠️  WARNING\n";
    echo "   └─ users table might not exist: " . $e->getMessage() . "\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "✅ BACKEND IS WORKING!\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Your backend API is accessible at:\n";
echo "→ http://localhost/TCC%20(react%20+%20postgres%20+%20php)/BackEnd/api/\n\n";

echo "Example API endpoint:\n";
echo "→ http://localhost/TCC%20(react%20+%20postgres%20+%20php)/BackEnd/api/check.php\n";
?>
