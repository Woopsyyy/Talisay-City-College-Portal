<?php

require_once __DIR__ . '/constants.php';

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, 
                PDO::ATTR_PERSISTENT         => true,  
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true, 
            ];

            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            
            error_log("Database Connection Error: " . $e->getMessage());
            
            if (APP_ENV === 'production') {
                throw new Exception("Database connection failed.");
            } else {
                throw new Exception("Database connection failed: " . $e->getMessage());
            }
        }
    }

    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    
    public static function connect() {
        return self::getInstance()->getConnection();
    }
}
?>
