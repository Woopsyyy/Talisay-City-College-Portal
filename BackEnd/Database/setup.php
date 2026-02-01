<?php


require_once __DIR__ . '/../config/database.php';

class DatabaseSetup {
    private $pdo;
    
    public function __construct() {
        
        try {
            $this->pdo = Database::connect();
        } catch (Exception $e) {
            
            $this->handleConnectionError($e);
        }
    }
    
    private function handleConnectionError($e) {
        $msg = $e->getMessage();
        
        if (strpos($msg, 'Unknown database') !== false || strpos($msg, '1049') !== false) {
            echo "Database 'tccportal' does not exist. Attempting to create it...\n";
            $this->createDatabase();
            
            $this->pdo = Database::connect();
        } else {
            throw $e;
        }
    }

    private function createDatabase() {
        $host = getenv('DB_HOST') ?: 'localhost';
        $port = getenv('DB_PORT') ?: '3306';
        $dbname = getenv('DB_NAME') ?: 'tccportal';
        $user = getenv('DB_USER') ?: 'root';
        $password = getenv('DB_PASSWORD') ?: '';

        try {
            
            $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            
            
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            echo "Database '$dbname' created successfully.\n";
        } catch (PDOException $e) {
            die("Failed to create database: " . $e->getMessage() . "\n");
        }
    }
    
    
    public function executeSqlFile($filePath) {
        if (!file_exists($filePath)) {
            throw new Exception("SQL file not found: $filePath");
        }
        
        $sql = file_get_contents($filePath);
        
        
        $lines = explode("\n", $sql);
        $cleanSql = "";
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || substr($line, 0, 2) === '--' || substr($line, 0, 1) === '#') {
                continue;
            }
            $cleanSql .= $line . "\n";
        }
        
        
        $statements = explode(';', $cleanSql);
        
        $executed = 0;
        $errors = [];
        
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (empty($statement)) {
                continue;
            }
            
            try {
                $this->pdo->exec($statement);
                $executed++;
            } catch (PDOException $e) {
                
                $errors[] = [
                    'statement' => substr($statement, 0, 100) . '...',
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return [
            'success' => count($errors) === 0,
            'executed' => $executed,
            'errors' => $errors
        ];
    }
    
    
    public function initializeSchema() {
        $schemaFile = __DIR__ . '/../Database/schema.sql';
        return $this->executeSqlFile($schemaFile);
    }
    
    
    public function checkConnection() {
        try {
            $this->pdo->query('SELECT 1');
            return ['success' => true, 'message' => 'Database connection successful'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    
    public function getDatabaseInfo() {
        try {
            $version = $this->pdo->query('SELECT VERSION()')->fetchColumn();
            $database = $this->pdo->query('SELECT DATABASE()')->fetchColumn();
            
            $tables = $this->pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
            
            return [
                'success' => true,
                'version' => $version,
                'database' => $database,
                'tables' => $tables,
                'table_count' => count($tables)
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    
    public function createUser($username, $password, $email, $fullName, $role = 'student', $schoolId = null) {
        try {
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            
            $stmt = $this->pdo->prepare(
                "INSERT INTO users (username, password, email, full_name, role, school_id) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            
            $stmt->execute([$username, $hashedPassword, $email, $fullName, $role, $schoolId]);
            
            return [
                'success' => true,
                'user_id' => $this->pdo->lastInsertId(),
                'message' => 'User created successfully'
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}


if (php_sapi_name() === 'cli') {
    echo "=== TCC Database Setup Utility (MySQL) ===\n\n";
    
    $setup = new DatabaseSetup();
    
    
    echo "Checking database connection...\n";
    $connResult = $setup->checkConnection();
    echo $connResult['success'] ? "✓ Connected\n" : "✗ Failed: {$connResult['message']}\n";
    
    if (!$connResult['success']) {
        exit(1);
    }
    
    
    echo "\nDatabase Information:\n";
    $info = $setup->getDatabaseInfo();
    if ($info['success']) {
        echo "  Version: {$info['version']}\n";
        echo "  Database: {$info['database']}\n";
        echo "  Tables: {$info['table_count']}\n";
    }
    
    
    echo "\nInitializing schema...\n";
    $result = $setup->initializeSchema();
    
    if ($result['success']) {
        echo "✓ Schema initialized successfully!\n";
        echo "  Executed: {$result['executed']} statements\n";
    } else {
        echo "✗ Schema initialization had errors:\n";
        foreach ($result['errors'] as $error) {
            echo "  - {$error['error']}\n";
        }
        echo "  Executed: {$result['executed']} statements (with errors)\n";
    }
    
    
    echo "\nFinal Database State:\n";
    $finalInfo = $setup->getDatabaseInfo();
    if ($finalInfo['success']) {
        echo "  Tables: {$finalInfo['table_count']}\n";
        echo "  Table list:\n";
        foreach ($finalInfo['tables'] as $table) {
            echo "    - $table\n";
        }
    }
    
    echo "\nSetup complete!\n";
}
?>
