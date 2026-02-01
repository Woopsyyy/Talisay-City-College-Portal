<?php

require_once __DIR__ . '/config/database.php';

$students = [
    "Andre Roblon",
    "Bon Joey",
    "Earl Kenneth Canete",
    "Erichelle Rabago Aumentado",
    "Jeros Lechedo",
    "Jorge Klent D. Gemparo",
    "Joshua Rey Basubas",
    "Joyce Mae Apostol",
    "Renz Abalos"
];

$section = 'Altruism'; 
$year = 1;

try {
    $pdo = Database::connect();
    
    foreach ($students as $fullName) {
        $parts = explode(' ', trim($fullName));
        $firstName = strtolower($parts[0]);
        $username = $firstName;
        $password = $firstName . '123';
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        
        $schoolId = date('Y') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        
        $stmt = $pdo->prepare("SELECT id FROM users WHERE full_name = ?");
        $stmt->execute([$fullName]);
        $existing = $stmt->fetch();
        
        $userId = null;
        
        if ($existing) {
            echo "User exists: $fullName (ID: {$existing['id']})\n";
            $userId = $existing['id'];
        } else {
            
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetchColumn() > 0) {
                $username = $username . rand(10, 99); 
                echo "Username conflict resolved: $username\n";
            }
            
            $sql = "INSERT INTO users (username, password, full_name, role, school_id, image_path, email) 
                    VALUES (?, ?, ?, 'student', ?, '/images/sample.jpg', ?)";
            $stmt = $pdo->prepare($sql);
            
            $email = $username . '@student.tcc.edu.ph';
            
            $stmt->execute([$username, $hashedPassword, $fullName, $schoolId, $email]);
            $userId = $pdo->lastInsertId();
            echo "Created User: $fullName ($username)\n";
        }
        
        
        $stmt = $pdo->prepare("SELECT id FROM user_assignments WHERE user_id = ?");
        $stmt->execute([$userId]);
        if (!$stmt->fetch()) {
            $sql = "INSERT INTO user_assignments (user_id, year_level, section, department, payment, sanctions) 
                    VALUES (?, ?, ?, 'BSIT', 'paid', 0)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $year, $section]);
            echo "Assigned $fullName to $section\n";
        } else {
            
            $sql = "UPDATE user_assignments SET section = ? WHERE user_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$section, $userId]);
            echo "Updated assignment for $fullName to $section\n";
        }
    }
    
    echo "Done.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
