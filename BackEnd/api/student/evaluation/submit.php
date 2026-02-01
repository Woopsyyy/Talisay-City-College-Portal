<?php

require_once __DIR__ . '/../../../config/header.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/Response.php';

if (!isset($_SESSION['user_id'])) {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $student_id = $_SESSION['user_id'];
    $data = json_decode(file_get_contents('php://input'), true);

    
    $pdo->exec("CREATE TABLE IF NOT EXISTS evaluations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        teacher_id VARCHAR(255),
        teacher_name VARCHAR(255),
        section VARCHAR(100),
        subject VARCHAR(255),
        ratings TEXT, 
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $stmt = $pdo->prepare("INSERT INTO evaluations (student_id, teacher_id, teacher_name, section, subject, ratings, comments) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    
    $ratings = [];
    foreach($data as $k => $v) {
        if (strpos($k, 'part') === 0 || strpos($k, 'satisfaction') === 0 || strpos($k, 'recommend') === 0) {
            $ratings[$k] = $v;
        }
    }

    $stmt->execute([
        $student_id,
        $data['teacher_id'] ?? null,
        $data['teacher_name'] ?? null,
        $data['student_section'] ?? null,
        $data['subject'] ?? null,
        json_encode($ratings),
        $data['comments'] ?? ''
    ]);

    echo json_encode(['success' => true, 'message' => 'Evaluation submitted successfully']);

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
