<?php

session_start();
require_once 'config/database.php';

try {
    $pdo = Database::connect();
    
    $stmt = $pdo->query("SELECT id, full_name FROM users WHERE role = 'teacher' LIMIT 1");
    $teacher = $stmt->fetch();

    if (!$teacher) {
        $teacher = ['id' => 999, 'full_name' => 'Test Teacher']; 
    }

    $_SESSION['user_id'] = $teacher['id'];
    $_SESSION['role'] = 'teacher';

    
    $stmt = $pdo->query("SELECT DISTINCT section FROM user_assignments LIMIT 1");
    $section = $stmt->fetchColumn();

    if (!$section) {
        echo "No sections found.\n";
        exit;
    }

    $_GET['section'] = $section;

    echo "Simulating Request for Teacher ID: " . $teacher['id'] . "\n";
    echo "Fetching Students for Section: '$section'\n";
    
    
    $check = $pdo->prepare("SELECT COUNT(*) FROM user_assignments WHERE section = ?");
    $check->execute([$section]);
    echo "Direct Count for '$section': " . $check->fetchColumn() . "\n";

    
    include 'api/teacher/students.php';

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
