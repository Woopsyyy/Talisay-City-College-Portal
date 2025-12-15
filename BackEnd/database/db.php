<?php
class Database {
    private $conn = null;
    private static $instance = null;
    private $servername = "localhost";
    private $username   = "root";
    private $password   = "";
    private $dbname     = "accountmanager";

    private function __construct() {
        $this->connect();
    }

    private function connect($database = null) {
        try {
            // Always use accountmanager database unless specifically told otherwise
            $db = $database ?? 'accountmanager';
            
            error_log("Attempting to connect to database: " . $db);
            
            // First, try to connect without specifying database to check if it exists
            $tempConn = new mysqli($this->servername, $this->username, $this->password);
            
            if ($tempConn->connect_error) {
                error_log("MySQL connection failed: " . $tempConn->connect_error);
                throw new Exception("MySQL Connection Error: " . $tempConn->connect_error);
            }
            
            // Check if database exists (escape database name for safety)
            $dbEscaped = $tempConn->real_escape_string($db);
            $result = $tempConn->query("SHOW DATABASES LIKE '{$dbEscaped}'");
            
            if ($result->num_rows == 0) {
                // Database doesn't exist, create it
                error_log("Database '{$db}' does not exist. Creating it...");
                if ($tempConn->query("CREATE DATABASE IF NOT EXISTS `{$dbEscaped}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
                    error_log("Database '{$db}' created successfully");
                } else {
                    error_log("Failed to create database: " . $tempConn->error);
                    throw new Exception("Failed to create database: " . $tempConn->error);
                }
            }
            
            $tempConn->close();
            
            // Now connect to the database
            // Create connection with database
            $this->conn = new mysqli($this->servername, $this->username, $this->password, $db);
            
            if ($this->conn->connect_error) {
                error_log("Database connection failed: " . $this->conn->connect_error);
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            
            error_log("Database connection successful");
            
            // Set UTF-8 charset
            $this->conn->set_charset("utf8mb4");
            
            // If database was just created, check if tables exist, if not, create them
            $this->ensureTablesExist();
            
        } catch (mysqli_sql_exception $e) {
            error_log("MySQL Error: " . $e->getMessage());
            // If it's a table doesn't exist error, try to create tables
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                error_log("Table missing, attempting to create tables...");
                $this->createAllTables();
                // Retry connection
                try {
                    $this->conn = new mysqli($this->servername, $this->username, $this->password, $db);
                    if ($this->conn->connect_error) {
                        throw new Exception("Connection failed after table creation: " . $this->conn->connect_error);
                    }
                    $this->conn->set_charset("utf8mb4");
                } catch (Exception $retryE) {
                    die("Database Connection Error: " . $retryE->getMessage());
                }
            } else {
                die("Database Connection Error: " . $e->getMessage());
            }
        } catch (Exception $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            die("Database Connection Error: " . $e->getMessage());
        }
    }
    
    private function ensureTablesExist() {
        // Check if users table exists
        $result = $this->conn->query("SHOW TABLES LIKE 'users'");
        if ($result->num_rows == 0) {
            error_log("Tables do not exist. Creating all tables automatically...");
            $this->createAllTables();
        } else {
            // Ensure school_id column exists on users table
            $schoolIdColumn = $this->conn->query("SHOW COLUMNS FROM users LIKE 'school_id'");
            if ($schoolIdColumn && $schoolIdColumn->num_rows === 0) {
                @$this->conn->query("ALTER TABLE users ADD COLUMN school_id VARCHAR(20) UNIQUE AFTER full_name");
            }
            // Ensure created_at column exists on users table
            $createdAtColumn = $this->conn->query("SHOW COLUMNS FROM users LIKE 'created_at'");
            if ($createdAtColumn && $createdAtColumn->num_rows === 0) {
                @$this->conn->query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            }
            // Check if student_grades table exists, create it if missing
            $gradesCheck = $this->conn->query("SHOW TABLES LIKE 'student_grades'");
            if ($gradesCheck->num_rows == 0) {
                error_log("student_grades table missing. Creating it...");
                $this->createStudentGradesTable();
            }

            // Ensure study_load_subjects table exists
            $studyLoadCheck = $this->conn->query("SHOW TABLES LIKE 'study_load_subjects'");
            if ($studyLoadCheck->num_rows == 0) {
                error_log("study_load_subjects table missing. Creating it...");
                $this->createStudyLoadTable();
            }
        }
    }
    
    private function createStudentGradesTable() {
        $query = "CREATE TABLE IF NOT EXISTS student_grades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            username VARCHAR(200) NOT NULL,
            year VARCHAR(10) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            instructor VARCHAR(255) DEFAULT NULL,
            prelim_grade DECIMAL(5,2) DEFAULT NULL,
            midterm_grade DECIMAL(5,2) DEFAULT NULL,
            finals_grade DECIMAL(5,2) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_username (username),
            INDEX idx_year_semester (year, semester),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        if (!$this->conn->query($query)) {
            error_log("Error creating student_grades table: " . $this->conn->error);
        } else {
            error_log("student_grades table created successfully");
        }
    }
    
    private function createStudyLoadTable() {
        $query = "CREATE TABLE IF NOT EXISTS study_load_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year_level VARCHAR(10) NOT NULL,
            section VARCHAR(100) NOT NULL,
            subject_code VARCHAR(50) NOT NULL,
            subject_name VARCHAR(255) NOT NULL,
            units DECIMAL(4,2) DEFAULT 0,
            teacher VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_year_section_code (year_level, section, subject_code),
            INDEX idx_year_section (year_level, section)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

        if (!$this->conn->query($query)) {
            error_log("Error creating study_load_subjects table: " . $this->conn->error);
        }
    }

    private function createAllTables() {
        $queries = [
            // Users table
            "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                school_id VARCHAR(20) UNIQUE,
                role ENUM('admin', 'teacher', 'student') NOT NULL,
                image_path VARCHAR(255) DEFAULT '/TCC/public/images/sample.jpg',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Announcements table
            "CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                year VARCHAR(10),
                department VARCHAR(50),
                date DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Projects table
            "CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                budget VARCHAR(64),
                started DATE,
                completed ENUM('yes','no') DEFAULT 'no'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Buildings table
            "CREATE TABLE IF NOT EXISTS buildings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(10) NOT NULL UNIQUE,
                floors INT DEFAULT 4,
                rooms_per_floor INT DEFAULT 4
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Sections table
            "CREATE TABLE IF NOT EXISTS sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year VARCHAR(10) NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_year_name (year, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Section assignments table
            "CREATE TABLE IF NOT EXISTS section_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year VARCHAR(10) NOT NULL,
                section VARCHAR(100) NOT NULL,
                building VARCHAR(10) NOT NULL,
                floor INT NOT NULL,
                room VARCHAR(50) NOT NULL,
                UNIQUE KEY uniq_year_section (year, section)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // User assignments table
            "CREATE TABLE IF NOT EXISTS user_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                username VARCHAR(200) NOT NULL,
                year VARCHAR(10) NOT NULL,
                section VARCHAR(100) NOT NULL,
                department VARCHAR(100) DEFAULT NULL,
                payment ENUM('paid','owing') DEFAULT 'paid',
                sanctions TEXT DEFAULT NULL,
                owing_amount VARCHAR(64) DEFAULT NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Teacher assignments table
            "CREATE TABLE IF NOT EXISTS teacher_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                username VARCHAR(200) NOT NULL,
                year VARCHAR(10) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_username (username),
                INDEX idx_year (year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Audit log table
            "CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_user VARCHAR(100),
                action VARCHAR(50),
                target_table VARCHAR(50),
                target_id VARCHAR(50),
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Student grades table
            "CREATE TABLE IF NOT EXISTS student_grades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                username VARCHAR(200) NOT NULL,
                year VARCHAR(10) NOT NULL,
                semester VARCHAR(20) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                instructor VARCHAR(255) DEFAULT NULL,
                prelim_grade DECIMAL(5,2) DEFAULT NULL,
                midterm_grade DECIMAL(5,2) DEFAULT NULL,
                finals_grade DECIMAL(5,2) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_username (username),
                INDEX idx_year_semester (year, semester),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            
            // Schedules table
            "CREATE TABLE IF NOT EXISTS schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year VARCHAR(10) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                day VARCHAR(20) NOT NULL,
                time_start TIME NOT NULL,
                time_end TIME NOT NULL,
                room VARCHAR(100) DEFAULT NULL,
                instructor VARCHAR(255) DEFAULT NULL,
                section VARCHAR(100) DEFAULT NULL,
                building VARCHAR(10) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_year (year),
                INDEX idx_subject (subject),
                INDEX idx_day (day)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

            // Study load subjects table
            "CREATE TABLE IF NOT EXISTS study_load_subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year_level VARCHAR(10) NOT NULL,
                section VARCHAR(100) NOT NULL,
                subject_code VARCHAR(50) NOT NULL,
                subject_name VARCHAR(255) NOT NULL,
                units DECIMAL(4,2) DEFAULT 0,
                teacher VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_year_section_code (year_level, section, subject_code),
                INDEX idx_year_section (year_level, section)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        ];
        
        foreach ($queries as $query) {
            if (!$this->conn->query($query)) {
                error_log("Error creating table: " . $this->conn->error);
                // Continue with other tables even if one fails
            }
        }
        
        // Add foreign key constraint for user_assignments if it doesn't exist
        $fkCheck = $this->conn->query("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_assignments' 
            AND CONSTRAINT_NAME = 'user_assignments_ibfk_1'");
        
        if ($fkCheck && $fkCheck->fetch_assoc()['cnt'] == 0) {
            // Try to add foreign key (may fail if users table doesn't have data yet, that's ok)
            @$this->conn->query("ALTER TABLE user_assignments 
                ADD CONSTRAINT user_assignments_ibfk_1 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
        }
        
        // Create default admin user if it doesn't exist
        $checkAdmin = $this->conn->query("SELECT id FROM users WHERE username = 'admin'");
        if ($checkAdmin->num_rows == 0) {
            $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $this->conn->prepare("INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, 'Administrator', 'admin', 'ADMIN - 0000')");
            $adminUsername = 'admin';
            $stmt->bind_param('ss', $adminUsername, $adminPassword);
            if ($stmt->execute()) {
                error_log("Default admin user created (username: admin, password: admin123)");
            }
            $stmt->close();
        }
        
        error_log("All tables created successfully");
    }

    public function reconnect($database = null) {
        if ($this->conn) {
            $this->conn->close();
        }
        $this->connect($database);
        return $this->conn;
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}
?>