<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=grade_system');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

ensure_tables($conn, [
  'student_grades' => "CREATE TABLE IF NOT EXISTS student_grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    username VARCHAR(255) NOT NULL,
    year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    instructor VARCHAR(255) DEFAULT NULL,
    prelim_grade DECIMAL(5,2) DEFAULT NULL,
    midterm_grade DECIMAL(5,2) DEFAULT NULL,
    finals_grade DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

$action = $_POST['action'] ?? 'create';

if ($action === 'delete') {
  // Delete grade record
  $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
  if ($id <= 0) { 
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=invalid_id'); 
    exit(); 
  }
  
  // Get grade info for audit log
  $sel = $conn->prepare("SELECT username, year, semester, subject FROM student_grades WHERE id = ? LIMIT 1");
  $sel->bind_param('i', $id);
  $sel->execute();
  $res = $sel->get_result();
  $gradeInfo = $res->fetch_assoc();
  $sel->close();
  
  // Delete the grade
  $stmt = $conn->prepare("DELETE FROM student_grades WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $stmt->close();
  
  $details = "deleted grade for " . ($gradeInfo['username'] ?? 'unknown') . " (subject: " . ($gradeInfo['subject'] ?? '') . ", year: " . ($gradeInfo['year'] ?? '') . ", semester: " . ($gradeInfo['semester'] ?? '') . ")";
  log_audit($conn, 'delete', 'student_grades', $id, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=grade_system&success=deleted'); 
  exit();
  
} else if ($action === 'delete_all') {
  // Delete all grades for a student
  $gradeIds = isset($_POST['grade_ids']) && is_array($_POST['grade_ids']) ? $_POST['grade_ids'] : [];
  $studentName = isset($_POST['student_name']) ? trim($_POST['student_name']) : 'unknown';
  
  if (empty($gradeIds)) {
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=no_grades'); 
    exit();
  }
  
  // Validate and sanitize grade IDs
  $validIds = [];
  foreach ($gradeIds as $id) {
    $id = intval($id);
    if ($id > 0) {
      $validIds[] = $id;
    }
  }
  
  if (empty($validIds)) {
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=invalid_ids'); 
    exit();
  }
  
  // Get grade info for audit log (get first grade for reference)
  $firstId = $validIds[0];
  $sel = $conn->prepare("SELECT username, year, semester, subject FROM student_grades WHERE id = ? LIMIT 1");
  $sel->bind_param('i', $firstId);
  $sel->execute();
  $res = $sel->get_result();
  $gradeInfo = $res->fetch_assoc();
  $sel->close();
  
  // Delete all grades
  $placeholders = str_repeat('?,', count($validIds) - 1) . '?';
  $stmt = $conn->prepare("DELETE FROM student_grades WHERE id IN ($placeholders)");
  $stmt->bind_param(str_repeat('i', count($validIds)), ...$validIds);
  $stmt->execute();
  $deletedCount = $stmt->affected_rows;
  $stmt->close();
  
  $details = "deleted all grades (" . $deletedCount . " records) for " . htmlspecialchars($studentName);
  log_audit($conn, 'delete', 'student_grades', implode(',', $validIds), $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=grade_system&success=deleted_all'); 
  exit();
  
} else if ($action === 'update') {
  // Update existing grade
  $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
  if ($id <= 0) { 
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=invalid_id'); 
    exit(); 
  }
  
  $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : null;
  $year = trim($_POST['year'] ?? '');
  $semester = trim($_POST['semester'] ?? '');
  $subject = trim($_POST['subject'] ?? '');
  $instructor = trim($_POST['instructor'] ?? '');
  $prelim_grade = !empty($_POST['prelim_grade']) ? floatval($_POST['prelim_grade']) : null;
  $midterm_grade = !empty($_POST['midterm_grade']) ? floatval($_POST['midterm_grade']) : null;
  $finals_grade = !empty($_POST['finals_grade']) ? floatval($_POST['finals_grade']) : null;
  
  if (empty($year) || empty($semester) || empty($subject)) {
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=missing'); 
    exit();
  }
  
  // Get username from user_id if provided
  $username = '';
  if ($user_id) {
    $u = $conn->prepare("SELECT username, full_name FROM users WHERE id = ? LIMIT 1");
    $u->bind_param('i', $user_id);
    $u->execute();
    $ur = $u->get_result();
    if ($urow = $ur->fetch_assoc()) {
      $username = $urow['username'] ?? $urow['full_name'] ?? '';
    }
    $u->close();
  }
  
  // Update grade
  $stmt = $conn->prepare("UPDATE student_grades SET user_id = ?, username = ?, year = ?, semester = ?, subject = ?, instructor = ?, prelim_grade = ?, midterm_grade = ?, finals_grade = ? WHERE id = ?");
  $stmt->bind_param('isssssdddi', $user_id, $username, $year, $semester, $subject, $instructor, $prelim_grade, $midterm_grade, $finals_grade, $id);
  $stmt->execute();
  $stmt->close();
  
  $details = "updated grade for " . $username . " (subject: " . $subject . ", year: " . $year . ", semester: " . $semester . ")";
  log_audit($conn, 'update', 'student_grades', $id, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=grade_system&success=updated'); 
  exit();
  
} else if ($action === 'create') {
  // Create new grade
  $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : null;
  $year = trim($_POST['year'] ?? '');
  $semester = trim($_POST['semester'] ?? '');
  $subject = trim($_POST['subject'] ?? '');
  $instructor = trim($_POST['instructor'] ?? '');
  $prelim_grade = !empty($_POST['prelim_grade']) ? floatval($_POST['prelim_grade']) : null;
  $midterm_grade = !empty($_POST['midterm_grade']) ? floatval($_POST['midterm_grade']) : null;
  $finals_grade = !empty($_POST['finals_grade']) ? floatval($_POST['finals_grade']) : null;
  
  if (empty($year) || empty($semester) || empty($subject) || empty($user_id)) {
    header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=missing'); 
    exit();
  }
  
  // Get username from user_id
  $username = '';
  if ($user_id) {
    $u = $conn->prepare("SELECT username, full_name FROM users WHERE id = ? LIMIT 1");
    $u->bind_param('i', $user_id);
    $u->execute();
    $ur = $u->get_result();
    if ($urow = $ur->fetch_assoc()) {
      $username = $urow['username'] ?? $urow['full_name'] ?? '';
    }
    $u->close();
  }
  
  // Insert grade
  $stmt = $conn->prepare("INSERT INTO student_grades (user_id, username, year, semester, subject, instructor, prelim_grade, midterm_grade, finals_grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  $stmt->bind_param('isssssddd', $user_id, $username, $year, $semester, $subject, $instructor, $prelim_grade, $midterm_grade, $finals_grade);
  $stmt->execute();
  $newId = $conn->insert_id;
  $stmt->close();
  
  $details = "created grade for " . $username . " (subject: " . $subject . ", year: " . $year . ", semester: " . $semester . ")";
  log_audit($conn, 'create', 'student_grades', $newId, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=grade_system&success=created'); 
  exit();
}

header('Location: /TCC/public/admin_dashboard.php?section=grade_system&error=unknown'); 
exit();
?>

