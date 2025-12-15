<?php
require_once __DIR__ . '/database/db.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // First, let's see what's in the database
    echo "<h2>Current Database State:</h2>";
    $result = $conn->query("SELECT id, username, password, role FROM users");
    if ($result->num_rows > 0) {
        echo "<h3>Existing Users:</h3>";
        while ($row = $result->fetch_assoc()) {
            echo "ID: " . $row['id'] . "<br>";
            echo "Username: " . $row['username'] . "<br>";
            echo "Password Hash: " . $row['password'] . "<br>";
            echo "Role: " . $row['role'] . "<br><br>";
        }
    } else {
        echo "No users found in database.<br><br>";
    }
    
    // Now let's create/update the admin account
    echo "<h2>Updating Admin Account:</h2>";
    
    $username = 'admin';
    $password = 'admin123';
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // First try to update existing admin
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE username = ?");
    $stmt->bind_param("ss", $password_hash, $username);
    $stmt->execute();
    
    if ($stmt->affected_rows === 0) {
        // If no update happened, insert new admin
        $stmt = $conn->prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, 'Administrator', 'admin')");
        $stmt->bind_param("ss", $username, $password_hash);
        $stmt->execute();
        echo "Created new admin account<br>";
    } else {
        echo "Updated existing admin account<br>";
    }
    
    // Verify the password hash
    echo "<h2>Verification:</h2>";
    echo "New password hash: " . $password_hash . "<br>";
    
    // Test the password verification
    if (password_verify('admin123', $password_hash)) {
        echo "Password verification test: SUCCESS<br>";
    } else {
        echo "Password verification test: FAILED<br>";
    }
    
    // Show the final state
    $result = $conn->query("SELECT * FROM users WHERE username = 'admin'");
    if ($row = $result->fetch_assoc()) {
        echo "<br>Final admin account state:<br>";
        echo "Username: admin<br>";
        echo "Password Hash: " . $row['password'] . "<br>";
        echo "Role: " . $row['role'] . "<br>";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>