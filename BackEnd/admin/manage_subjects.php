<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=subjects');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$courseMajors = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science'],
  'HM' => ['General'],
  'BEED' => ['General'],
  'TOURISM' => ['General']
];
$semesterOptions = ['First Semester', 'Second Semester'];

ensure_tables($conn, [
  'subjects' => "CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    units INT DEFAULT 0,
    course VARCHAR(20) NOT NULL,
    major VARCHAR(50) NOT NULL,
    year_level INT NOT NULL,
    semester VARCHAR(20) NOT NULL DEFAULT 'First Semester',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_subject_code (subject_code),
    INDEX idx_course_major_year (course, major, year_level, semester)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

try {
  $colCheck = $conn->query("SHOW COLUMNS FROM subjects LIKE 'semester'");
  if ($colCheck && $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE subjects ADD COLUMN semester VARCHAR(20) NOT NULL DEFAULT 'First Semester' AFTER year_level");
  }
  if ($colCheck) { $colCheck->close(); }
} catch (Throwable $th) {
  // ignore schema migration issues
}

$action = $_POST['action'] ?? 'create';

$redirectBase = '/TCC/public/admin_dashboard.php?section=subjects';
function redirect_subjects(string $query): void {
  global $redirectBase;
  header('Location: ' . $redirectBase . '&' . $query);
  exit();
}

function validate_course_major(array $map, string $course, string $major): bool {
  if (!isset($map[$course])) {
    return false;
  }
  return in_array($major, $map[$course], true);
}

if ($action === 'delete') {
  $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
  if ($id <= 0) {
    redirect_subjects('error=invalid_id');
  }

  $infoStmt = $conn->prepare("SELECT subject_code, title FROM subjects WHERE id = ? LIMIT 1");
  $infoStmt->bind_param('i', $id);
  $infoStmt->execute();
  $info = $infoStmt->get_result()->fetch_assoc();
  $infoStmt->close();

  $del = $conn->prepare("DELETE FROM subjects WHERE id = ?");
  $del->bind_param('i', $id);
  $del->execute();
  $del->close();

  $details = sprintf(
    'deleted subject %s (%s)',
    $info['subject_code'] ?? '',
    $info['title'] ?? ''
  );
  log_audit($conn, 'delete', 'subjects', $id, $details);

  redirect_subjects('success=deleted');
}

$subjectCode = strtoupper(trim($_POST['subject_code'] ?? ''));
$title = trim($_POST['title'] ?? '');
$units = isset($_POST['units']) && is_numeric($_POST['units']) ? (int)$_POST['units'] : null;
$course = strtoupper(trim($_POST['course'] ?? ''));
$major = trim($_POST['major'] ?? '');
$yearLevel = isset($_POST['year_level']) && is_numeric($_POST['year_level']) ? (int)$_POST['year_level'] : null;
$semester = trim($_POST['semester'] ?? '');

if ($subjectCode === '' || $title === '' || $units === null || $course === '' || $major === '' || $yearLevel === null || $semester === '') {
  redirect_subjects('error=missing');
}

if ($yearLevel < 1 || $yearLevel > 4) {
  redirect_subjects('error=year_range');
}

if (!validate_course_major($courseMajors, $course, $major)) {
  redirect_subjects('error=invalid_major');
}

if (!in_array($semester, $semesterOptions, true)) {
  redirect_subjects('error=invalid_semester');
}

if ($action === 'update') {
  $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
  if ($id <= 0) {
    redirect_subjects('error=invalid_id');
  }

  $dup = $conn->prepare("SELECT id FROM subjects WHERE subject_code = ? AND id != ? LIMIT 1");
  $dup->bind_param('si', $subjectCode, $id);
  $dup->execute();
  $dupRes = $dup->get_result();
  if ($dupRes && $dupRes->num_rows > 0) {
    $dup->close();
    redirect_subjects('error=duplicate');
  }
  $dup->close();

  $stmt = $conn->prepare("UPDATE subjects SET subject_code = ?, title = ?, units = ?, course = ?, major = ?, year_level = ?, semester = ? WHERE id = ?");
  $stmt->bind_param('ssissisi', $subjectCode, $title, $units, $course, $major, $yearLevel, $semester, $id);
  $stmt->execute();
  $stmt->close();

  $details = sprintf('updated subject %s (%s)', $subjectCode, $title);
  log_audit($conn, 'update', 'subjects', $id, $details);

  redirect_subjects('success=updated');
}

// default create
$dup = $conn->prepare("SELECT id FROM subjects WHERE subject_code = ? LIMIT 1");
if (!$dup) {
  redirect_subjects('error=db_error');
}
$dup->bind_param('s', $subjectCode);
$dup->execute();
$dupRes = $dup->get_result();
if ($dupRes && $dupRes->num_rows > 0) {
  $dup->close();
  redirect_subjects('error=duplicate');
}
$dup->close();

$stmt = $conn->prepare("INSERT INTO subjects (subject_code, title, units, course, major, year_level, semester) VALUES (?,?,?,?,?,?,?)");
if (!$stmt) {
  redirect_subjects('error=db_error');
}
$stmt->bind_param('ssissis', $subjectCode, $title, $units, $course, $major, $yearLevel, $semester);
if (!$stmt->execute()) {
  $stmt->close();
  redirect_subjects('error=db_error');
}
$newId = $conn->insert_id;
$stmt->close();

if ($newId <= 0) {
  redirect_subjects('error=db_error');
}

$details = sprintf('created subject %s (%s)', $subjectCode, $title);
log_audit($conn, 'create', 'subjects', $newId, $details);

redirect_subjects('success=created');
?>

