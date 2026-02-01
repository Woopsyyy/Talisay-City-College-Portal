<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $sectionName = $_GET['section'] ?? '';
        $subjectCode = $_GET['subject'] ?? '';

        if (!$sectionName || !$subjectCode) {
            echo json_encode([]);
            exit;
        }

        
        $stmt = $pdo->prepare("SELECT id FROM sections WHERE section_name = ?");
        $stmt->execute([$sectionName]);
        $sectionId = $stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT id FROM subjects WHERE subject_code = ?");
        $stmt->execute([$subjectCode]);
        $subjectId = $stmt->fetchColumn();

        if (!$sectionId || !$subjectId) {
            
            echo json_encode([]);
            exit;
        }

        
        
        $query = "SELECT student_id, prelim_grade, midterm_grade, final_grade as finals_grade FROM grades WHERE section_id = ? AND subject_id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$sectionId, $subjectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $gradesMap = [];
        foreach ($rows as $r) {
            $gradesMap[$r['student_id']] = $r;
        }
        
        echo json_encode($gradesMap);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $data = $input['grade'] ?? $input;
        
        if (empty($data['student_id']) || empty($data['subject'])) {
             Response::error("Student ID and Subject required", 400);
        }

        $studentId = $data['student_id'];
        $subjectCode = $data['subject']; 
        
        
        $stmt = $pdo->prepare("SELECT id FROM subjects WHERE subject_code = ?");
        $stmt->execute([$subjectCode]);
        $subjectId = $stmt->fetchColumn();
        
        if (!$subjectId) {
             Response::error("Subject not found: $subjectCode", 404);
        }

        
        $stmt = $pdo->prepare("SELECT section FROM user_assignments WHERE user_id = ?");
        $stmt->execute([$studentId]);
        $sectionName = $stmt->fetchColumn();
        
        $sectionId = null;
        if ($sectionName) {
            $stmt = $pdo->prepare("SELECT id FROM sections WHERE section_name = ?");
            $stmt->execute([$sectionName]);
            $sectionId = $stmt->fetchColumn();
        }
        
        if (!$sectionId) {
             
             
             Response::error("Student section assignment not found", 404);
        }
        
        $teacherId = $_SESSION['user_id'];
        
        
        $stmt = $pdo->prepare("SELECT id FROM grades WHERE student_id = ? AND subject_id = ?");
        $stmt->execute([$studentId, $subjectId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $sql = "UPDATE grades SET 
                    prelim_grade = ?, midterm_grade = ?, final_grade = ?, 
                    teacher_id = ?, updated_at = NOW()
                    WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['prelim'] ?? null,
                $data['midterm'] ?? null,
                $data['finals'] ?? null, 
                $teacherId,
                $existing['id']
            ]);
        } else {
            $schoolYear = date('Y') . '-' . (date('Y') + 1);
            $semester = '1st'; 

            $sql = "INSERT INTO grades (student_id, subject_id, teacher_id, section_id, prelim_grade, midterm_grade, final_grade, school_year, semester, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $studentId,
                $subjectId,
                $teacherId,
                $sectionId,
                $data['prelim'] ?? null,
                $data['midterm'] ?? null,
                $data['finals'] ?? null,
                $schoolYear,
                $semester
            ]);
        }

        Response::success(null, 'Grade saved');
    }

} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
