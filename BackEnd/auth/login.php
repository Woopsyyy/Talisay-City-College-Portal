<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../database/db.php';
require_once __DIR__ . '/../helpers/school_id.php';

class Auth {
    private $conn;

    public function __construct() {
        $this->conn = Database::getInstance()->getConnection();
    }

    public function login($username, $password) {
        error_log("Login attempt for username: " . $username);
        
        $sql = "SELECT * FROM users WHERE username = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            error_log("User found in database");
            
            if (password_verify($password, $user['password'])) {
                error_log("Password verified successfully");
                try {
                    $schoolId = ensure_school_id_for_user($this->conn, $user);
                } catch (Exception $e) {
                    error_log('Failed generating school ID: ' . $e->getMessage());
                    $schoolId = $user['school_id'] ?? null;
                }
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                // Store full name and image path in session to avoid extra DB queries on each page load
                $_SESSION['full_name'] = isset($user['full_name']) && !empty($user['full_name']) ? $user['full_name'] : $user['username'];
                $_SESSION['image_path'] = isset($user['image_path']) && !empty($user['image_path']) ? $user['image_path'] : '/TCC/public/images/sample.jpg';
                if (!empty($schoolId)) {
                    $_SESSION['school_id'] = $schoolId;
                }
                return true;
            } else {
                error_log("Password verification failed");
            }
        } else {
            error_log("No user found with username: " . $username);
        }
        return false;
    }

    public static function isAdmin() {
        return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
    }

    public static function checkAuth() {
        if (!isset($_SESSION['user_id'])) {
            header("Location: /TCC/public/index.html");
            exit();
        }
    }
}

// Only process login if this file is accessed directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        error_log("Login POST request received");
        
        if (!isset($_POST['username']) || !isset($_POST['password'])) {
            error_log("Missing username or password in POST data");
            header("Location: /TCC/public/index.html?error=missing");
            exit();
        }
        
        $auth = new Auth();
        $username = $_POST['username'];
        $password = $_POST['password'];
        
        error_log("Attempting login for user: " . $username);
        
        if ($auth->login($username, $password)) {
            error_log("Login successful, redirecting based on role");
            $userRole = $_SESSION['role'] ?? 'student';
            if ($userRole === 'admin') {
              header("Location: /TCC/public/admin_dashboard.php");
            } elseif ($userRole === 'teacher') {
              header("Location: /TCC/public/teachers.php");
            } else {
              header("Location: /TCC/public/home.php");
            }
        } else {
            error_log("Login failed, redirecting back to login page");
            header("Location: /TCC/public/index.html?error=1");
        }
        exit();
    } else {
        error_log("Non-POST request received");
    }
}
?>