<?php

require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::connect();
    $output = "";
    
    $output .= "=== STUDY LOAD DEBUG ===\n\n";
    
    
    $output .= "1. Students with assignments:\n";
    $stmt = $pdo->query("
        SELECT u.id, u.username, u.full_name, ua.section, ua.year_level 
        FROM users u 
        INNER JOIN user_assignments ua ON u.id = ua.user_id 
        WHERE u.role = 'student' 
        LIMIT 5
    ");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $output .= print_r($students, true) . "\n";
    
    if (empty($students)) {
        $output .= "ERROR: No students found!\n";
        file_put_contents(__DIR__ . '/debug_output.txt', $output);
        echo "Results written to debug_output.txt\n";
        exit;
    }
    
    $student = $students[0];
    $section = $student['section'];
    
    $output .= "2. Testing with: {$student['full_name']} - Section: $section\n\n";
    
    
    $output .= "3. Data for section '$section':\n";
    $stmt = $pdo->prepare("SELECT * FROM section_subjects WHERE section = ? LIMIT 3");
    $stmt->execute([$section]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $output .= print_r($data, true) . "\n";
    
    if (empty($data)) {
        $output .= "WARNING: No section_subjects data for '$section'\n\n";
        
        $output .= "4. All sections in section_subjects:\n";
        $stmt = $pdo->query("SELECT DISTINCT section FROM section_subjects");
        $sections = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $output .= print_r($sections, true) . "\n";
    }
    
    file_put_contents(__DIR__ . '/debug_output.txt', $output);
    echo "Debug completed. Results in debug_output.txt\n";
    
} catch (Exception $e) {
    $output = "ERROR: " . $e->getMessage() . "\n";
    file_put_contents(__DIR__ . '/debug_output.txt', $output);
    echo "Error logged to debug_output.txt\n";
}
?>
