<?php
require_once __DIR__ . '/database/db.php';

function setupAdminAccount() {
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // Admin credentials
        $username = 'admin';
        $password = 'admin123';
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $full_name = 'Administrator';
        
        echo "Starting admin account setup...<br>";
        
        // First, check if the users table exists
        $table_check = $conn->query("SHOW TABLES LIKE 'users'");
        if ($table_check->num_rows == 0) {
            echo "Creating users table...<br>";
            $sql = "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL UNIQUE,
                role ENUM('admin', 'teacher', 'student') NOT NULL,
                image_path VARCHAR(255) DEFAULT '/TCC/public/images/default.jpg'
            ) ENGINE=InnoDB;";
            $conn->query($sql);
        }
        
        // Check if admin exists
        $check_stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
        $check_stmt->bind_param("s", $username);
        $check_stmt->execute();
        $result = $check_stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Update existing admin
            $row = $result->fetch_assoc();
            echo "Admin account exists. Updating password...<br>";
            
            $stmt = $conn->prepare("UPDATE users SET password = ?, full_name = ? WHERE username = ?");
            $stmt->bind_param("sss", $hashed_password, $full_name, $username);
            $stmt->execute();
            
            // Verify the update
            $verify = password_verify($password, $hashed_password);
            echo $verify ? "Password updated and verified successfully!<br>" : "Warning: Password verification failed!<br>";
            
        } else {
            // Create new admin
            echo "Creating new admin account...<br>";
            $stmt = $conn->prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'admin')");
            $stmt->bind_param("sss", $username, $hashed_password, $full_name);
            $stmt->execute();
            
            // Verify the insert
            $verify = password_verify($password, $hashed_password);
            echo $verify ? "Admin account created and verified successfully!<br>" : "Warning: Password verification failed!<br>";
        }
        
        // Final verification
        $verify_stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
        $verify_stmt->bind_param("s", $username);
        $verify_stmt->execute();
        $verify_result = $verify_stmt->get_result();
        
        if ($verify_result->num_rows === 1) {
            $user = $verify_result->fetch_assoc();
            echo "<br>Account verification:<br>";
            echo "Username: " . htmlspecialchars($user['username']) . "<br>";
            echo "Role: " . htmlspecialchars($user['role']) . "<br>";
            echo "Full Name: " . htmlspecialchars($user['full_name']) . "<br>";
            echo "<br>You can now login with:<br>";
            echo "Username: admin<br>";
            echo "Password: admin123<br>";
        }
        
    } catch (Exception $e) {
        echo "Error: " . htmlspecialchars($e->getMessage()) . "<br>";
    }
}

setupAdminAccount();
?>