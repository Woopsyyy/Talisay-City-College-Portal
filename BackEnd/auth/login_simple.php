<?php
session_start();
error_log("Starting login process...");

require_once __DIR__ . '/../database/db.php';
require_once __DIR__ . '/../helpers/school_id.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    error_log("Login attempt - Username: $username");
    
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // Check if we can find the user
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
            header("Location: /TCC/public/index.html?error=1&reason=dberror");
            exit();
        }
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            error_log("Found user in database. Username: " . $user['username']);
            
            // Verify the password
            if (password_verify($password, $user['password'])) {
                error_log("Password verified successfully!");
                try {
                    $schoolId = ensure_school_id_for_user($conn, $user);
                } catch (Exception $e) {
                    error_log("Failed generating school ID: " . $e->getMessage());
                    $schoolId = $user['school_id'] ?? null;
                }
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                // store display name and image in session to avoid DB query on each page
                $_SESSION['full_name'] = $user['full_name'] ?? $user['username'];
                $_SESSION['image_path'] = $user['image_path'] ?? '/TCC/public/images/sample.jpg';
                if (!empty($schoolId)) {
                    $_SESSION['school_id'] = $schoolId;
                }

                error_log("Session variables set. Role: " . $user['role']);
                $userRole = $user['role'] ?? 'student';
                if ($userRole === 'admin') {
                  header("Location: /TCC/public/admin_dashboard.php");
                } elseif ($userRole === 'teacher') {
                  header("Location: /TCC/public/teachers.php");
                } else {
                  header("Location: /TCC/public/home.php");
                }
                exit();
            } else {
                error_log("Password verification failed for user: " . $username);
                header("Location: /TCC/public/index.html?error=1&reason=password");
                exit();
            }
        } else {
            error_log("No user found with username: $username");
            header("Location: /TCC/public/index.html?error=1&reason=username");
            exit();
        }
    } catch (Exception $e) {
        error_log("Database error during login: " . $e->getMessage());
        header("Location: /TCC/public/index.html?error=1&reason=dberror");
        exit();
    }
}

error_log("No POST data received");
header("Location: /TCC/public/index.html?error=1&reason=nopost");
exit();
?> 