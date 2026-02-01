<?php
require_once 'config/db.php';
try {
    $pdo = Database::connect();
    
    
    $sql = "CREATE TABLE IF NOT EXISTS section_subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        major VARCHAR(100) NOT NULL,
        year_level INT NOT NULL,
        section VARCHAR(50) NOT NULL,
        subject_code VARCHAR(20) NOT NULL,
        subject_title VARCHAR(200) NOT NULL,
        units DECIMAL(3,1) DEFAULT 3.0,
        semester VARCHAR(20) NOT NULL,
        teacher VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_section_subject (course, major, year_level, section, subject_code, semester)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "Table 'section_subjects' created successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
