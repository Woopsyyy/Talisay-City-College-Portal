<?php

require_once __DIR__ . '/config/database.php';

$teachers = [
    'Sam Nopal',
    'Michael Abe',
    'Mimi San',
    'Rio Jake T. Mamac',
    'John Dapat',
    'RJ Abucejo'
];

try {
    $pdo = Database::connect();
    
    echo "<h1>Seeding Teachers...</h1>";
    
    foreach ($teachers as $fullName) {
        
        $parts = explode(' ', trim($fullName));
        $firstName = $parts[0];
        
        
        $username = strtolower($firstName);
        $passwordPlain = $firstName . '123'; 
        $passwordHash = password_hash($passwordPlain, PASSWORD_DEFAULT);
        
        echo "Processing: $fullName | User: $username | Pass: $passwordPlain... ";
        
        
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo "Already exists. Skipping.<br>";
            continue;
        }
        
        
        $schoolId = 'TCH-' . strtoupper(substr(md5($username), 0, 6));
        $email = $username . '@tcc.edu.ph';
        $imagePath = '/images/sample.jpg';

        try {
            
            $stmt = $pdo->prepare("
                INSERT INTO users (full_name, username, password, role, image_path, email, school_id) 
                VALUES (?, ?, ?, 'teacher', ?, ?, ?)
            ");
            $stmt->execute([$fullName, $username, $passwordHash, $imagePath, $email, $schoolId]);
            echo "Created (Full Fields)!<br>";
        } catch (Exception $e1) {
            
             try {
                $stmt = $pdo->prepare("
                    INSERT INTO users (full_name, username, password, role, image_path) 
                    VALUES (?, ?, ?, 'teacher', ?)
                ");
                $stmt->execute([$fullName, $username, $passwordHash, $imagePath]);
                echo "Created (Minimal)!<br>";
             } catch (Exception $e2) {
                 echo "Failed: " . $e1->getMessage() . " / " . $e2->getMessage() . "<br>";
             }
        }
    }
    
    echo "<h2>Done!</h2>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
