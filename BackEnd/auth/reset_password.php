<?php
require_once __DIR__ . '/../database/db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username'] ?? '');
    
    if (empty($username)) {
        header("Location: /TCC/public/forgot_password.php?error=missing");
        exit();
    }
    
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // Check if username exists
        $stmt = $conn->prepare("SELECT id, username FROM users WHERE username = ? LIMIT 1");
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
            header("Location: /TCC/public/forgot_password.php?error=dberror");
            exit();
        }
        
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            
            // Generate a secure random password (12 characters minimum)
            // Format: Starts with uppercase, contains uppercase, lowercase, numbers
            $uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude confusing letters
            $lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Exclude confusing letters
            $numbers = '23456789'; // Exclude 0 and 1
            $all = $uppercase . $lowercase . $numbers;
            
            // Generate password: Start with uppercase, then mix of uppercase, lowercase, numbers
            $newPassword = '';
            // First character must be uppercase
            $newPassword .= $uppercase[random_int(0, strlen($uppercase) - 1)];
            
            // Add more uppercase (2 more)
            $newPassword .= $uppercase[random_int(0, strlen($uppercase) - 1)];
            $newPassword .= $uppercase[random_int(0, strlen($uppercase) - 1)];
            
            // Add lowercase (3 characters)
            $newPassword .= $lowercase[random_int(0, strlen($lowercase) - 1)];
            $newPassword .= $lowercase[random_int(0, strlen($lowercase) - 1)];
            $newPassword .= $lowercase[random_int(0, strlen($lowercase) - 1)];
            
            // Add numbers (3 characters)
            $newPassword .= $numbers[random_int(0, strlen($numbers) - 1)];
            $newPassword .= $numbers[random_int(0, strlen($numbers) - 1)];
            $newPassword .= $numbers[random_int(0, strlen($numbers) - 1)];
            
            // Add 3 more random characters to make it 12 characters total
            for ($i = 0; $i < 3; $i++) {
                $newPassword .= $all[random_int(0, strlen($all) - 1)];
            }
            
            // Shuffle the password string (but keep first character uppercase)
            $firstChar = $newPassword[0];
            $rest = str_shuffle(substr($newPassword, 1));
            $newPassword = $firstChar . $rest;
            
            // Hash the new password
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Update the password in database
            $updateStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            if (!$updateStmt) {
                error_log("Failed to prepare update statement: " . $conn->error);
                header("Location: /TCC/public/forgot_password.php?error=dberror");
                exit();
            }
            
            $updateStmt->bind_param("si", $hashedPassword, $user['id']);
            
            if ($updateStmt->execute()) {
                error_log("Password reset successful for user: " . $username);
                // Redirect with the new password (in production, you might want to email this instead)
                header("Location: /TCC/public/forgot_password.php?success=1&password=" . urlencode($newPassword));
                exit();
            } else {
                error_log("Failed to update password: " . $updateStmt->error);
                header("Location: /TCC/public/forgot_password.php?error=dberror");
                exit();
            }
            
            $updateStmt->close();
        } else {
            error_log("Password reset attempted for non-existent username: " . $username);
            header("Location: /TCC/public/forgot_password.php?error=notfound");
            exit();
        }
        
        $stmt->close();
    } catch (Exception $e) {
        error_log("Error during password reset: " . $e->getMessage());
        header("Location: /TCC/public/forgot_password.php?error=dberror");
        exit();
    }
} else {
    header("Location: /TCC/public/forgot_password.php");
    exit();
}
?>

