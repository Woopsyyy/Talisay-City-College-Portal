<?php
session_start();
require_once __DIR__ . '/database/db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = $_POST['password'];

    $sql = "SELECT * FROM users WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
           
            switch($user['role']) {
                case 'admin':
                    header("Location: ../public/admin_dashboard.php");
                    break;
                case 'teacher':
                    header("Location: ../public/teacher_dashboard.php");
                    break;
                case 'student':
                    header("Location: ../public/student_dashboard.php");
                    break;
                default:
                    header("Location: ../public/home.php");
            }
            exit();
        }
    }
    
    header("Location: ../public/index.html?error=1");
    exit();
}
?>