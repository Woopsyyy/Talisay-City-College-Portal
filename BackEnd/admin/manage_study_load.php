<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=study_load');

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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'study_load' => "CREATE TABLE IF NOT EXISTS study_load (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course VARCHAR(20) NOT NULL,
    major VARCHAR(50) NOT NULL,
    year_level INT NOT NULL,
    section VARCHAR(100) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_title VARCHAR(255) NOT NULL,
    units INT DEFAULT 0,
    semester VARCHAR(20) NOT NULL DEFAULT 'First Semester',
    teacher VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_load (course, major, year_level, section, semester, subject_code),
    INDEX idx_section (section)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

try {
  $colCheckSubjects = $conn->query("SHOW COLUMNS FROM subjects LIKE 'semester'");
  if ($colCheckSubjects && $colCheckSubjects->num_rows === 0) {
    $conn->query("ALTER TABLE subjects ADD COLUMN semester VARCHAR(20) NOT NULL DEFAULT 'First Semester' AFTER year_level");
  }
  if ($colCheckSubjects) { $colCheckSubjects->close(); }
} catch (Throwable $th) {
  // ignore
}

try {
  $colCheckLoad = $conn->query("SHOW COLUMNS FROM study_load LIKE 'semester'");
  if ($colCheckLoad && $colCheckLoad->num_rows === 0) {
    $conn->query("ALTER TABLE study_load ADD COLUMN semester VARCHAR(20) NOT NULL DEFAULT 'First Semester' AFTER units");
    $conn->query("ALTER TABLE study_load DROP INDEX uniq_load");
    $conn->query("ALTER TABLE study_load ADD UNIQUE KEY uniq_load (course, major, year_level, section, semester, subject_code)");
  }
  if ($colCheckLoad) { $colCheckLoad->close(); }
} catch (Throwable $th) {
  // ignore
}

$action = $_POST['action'] ?? 'create';
$course = strtoupper(trim($_POST['course'] ?? ''));
$major = trim($_POST['major'] ?? '');
$yearLevel = isset($_POST['year_level']) && is_numeric($_POST['year_level']) ? (int)$_POST['year_level'] : null;
$section = trim($_POST['section'] ?? '');
$subjectCode = strtoupper(trim($_POST['subject_code'] ?? ''));
$teacher = trim($_POST['teacher'] ?? '');
$semester = trim($_POST['semester'] ?? '');

$redirectBase = '/TCC/public/admin_dashboard.php?section=study_load';
if ($course !== '') {
  $redirectBase .= '&filter_course=' . urlencode($course);
}
if ($major !== '') {
  $redirectBase .= '&filter_major=' . urlencode($major);
}
if (!empty($yearLevel)) {
  $redirectBase .= '&filter_year=' . urlencode((string)$yearLevel);
}
if ($section !== '') {
  $redirectBase .= '&filter_section=' . urlencode($section);
}
if ($semester !== '') {
  $redirectBase .= '&filter_semester=' . urlencode($semester);
}

function redirect_study_load(string $base, string $query): void {
  header('Location: ' . $base . '&' . $query);
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
    redirect_study_load($redirectBase, 'error=invalid_id');
  }

  $infoStmt = $conn->prepare("SELECT course, major, year_level, section, semester, subject_code FROM study_load WHERE id = ? LIMIT 1");
  if (!$infoStmt) {
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $infoStmt->bind_param('i', $id);
  if (!$infoStmt->execute()) {
    $infoStmt->close();
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $info = $infoStmt->get_result()->fetch_assoc();
  $infoStmt->close();

  $stmt = $conn->prepare("DELETE FROM study_load WHERE id = ?");
  if (!$stmt) {
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) {
    $stmt->close();
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $stmt->close();

  $details = sprintf(
    'removed %s for %s | %s | Y%s | %s | %s',
    $info['subject_code'] ?? '',
    $info['course'] ?? '',
    $info['major'] ?? '',
    $info['year_level'] ?? '',
    $info['section'] ?? '',
    $info['semester'] ?? ''
  );
  log_audit($conn, 'delete', 'study_load', $id, $details);

  redirect_study_load($redirectBase, 'success=deleted');
}

if ($course === '' || $major === '' || $yearLevel === null || $yearLevel < 1 || $yearLevel > 4 || $section === '' || $semester === '') {
  redirect_study_load($redirectBase, 'error=missing_context');
}

if (!validate_course_major($courseMajors, $course, $major)) {
  redirect_study_load($redirectBase, 'error=invalid_major');
}

if (!in_array($semester, $semesterOptions, true)) {
  redirect_study_load($redirectBase, 'error=invalid_semester');
}

if ($action !== 'delete' && $subjectCode === '') {
  redirect_study_load($redirectBase, 'error=missing_subject');
}

$subjectStmt = $conn->prepare("SELECT subject_code, title, units FROM subjects WHERE subject_code = ? AND course = ? AND major = ? AND year_level = ? AND semester = ? LIMIT 1");
if (!$subjectStmt) {
  redirect_study_load($redirectBase, 'error=db_error');
}
$subjectStmt->bind_param('sssis', $subjectCode, $course, $major, $yearLevel, $semester);
if (!$subjectStmt->execute()) {
  $subjectStmt->close();
  redirect_study_load($redirectBase, 'error=db_error');
}
$subjectRow = $subjectStmt->get_result()->fetch_assoc();
$subjectStmt->close();

if (!$subjectRow) {
  redirect_study_load($redirectBase, 'error=subject_missing');
}

// Auto-fetch teacher from teacher_assignments if not provided
if (empty($teacher)) {
  $colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
  $hasNewSchema = $colCheck && $colCheck->num_rows > 0;
  if ($colCheck) { $colCheck->close(); }
  
  if ($hasNewSchema) {
    $teacherStmt = $conn->prepare("SELECT teacher_name FROM teacher_assignments WHERE subject_code = ? LIMIT 1");
  } else {
    $teacherStmt = $conn->prepare("SELECT username as teacher_name FROM teacher_assignments WHERE subject = ? LIMIT 1");
  }
  if ($teacherStmt) {
    $teacherStmt->bind_param('s', $subjectCode);
    $teacherStmt->execute();
    $teacherRes = $teacherStmt->get_result();
    if ($teacherRow = $teacherRes->fetch_assoc()) {
      $teacher = $teacherRow['teacher_name'] ?? '';
    }
    $teacherStmt->close();
  }
}

if ($action === 'update') {
  $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
  if ($id <= 0) {
    redirect_study_load($redirectBase, 'error=invalid_id');
  }

  $dup = $conn->prepare("SELECT id FROM study_load WHERE course = ? AND major = ? AND year_level = ? AND section = ? AND semester = ? AND subject_code = ? AND id != ? LIMIT 1");
  if (!$dup) {
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $dup->bind_param('ssisssi', $course, $major, $yearLevel, $section, $semester, $subjectCode, $id);
  $dup->execute();
  $dupRes = $dup->get_result();
  if ($dupRes && $dupRes->num_rows > 0) {
    $dup->close();
    redirect_study_load($redirectBase, 'error=duplicate');
  }
  $dup->close();

  $stmt = $conn->prepare("UPDATE study_load SET course = ?, major = ?, year_level = ?, section = ?, subject_code = ?, subject_title = ?, units = ?, semester = ?, teacher = ? WHERE id = ?");
  if (!$stmt) {
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $subjectUnits = (int)$subjectRow['units'];
  $teacherValue = $teacher !== '' ? $teacher : null;
  $stmt->bind_param('ssisssissi', $course, $major, $yearLevel, $section, $subjectCode, $subjectRow['title'], $subjectUnits, $semester, $teacherValue, $id);
  if (!$stmt->execute()) {
    $stmt->close();
    redirect_study_load($redirectBase, 'error=db_error');
  }
  $stmt->close();

  $details = sprintf(
    'updated study load %s for %s %s Y%s %s %s',
    $subjectCode,
    $course,
    $major,
    $yearLevel,
    $section,
    $semester
  );
  log_audit($conn, 'update', 'study_load', $id, $details);

  redirect_study_load($redirectBase, 'success=updated');
}

// create
$dup = $conn->prepare("SELECT id FROM study_load WHERE course = ? AND major = ? AND year_level = ? AND section = ? AND semester = ? AND subject_code = ? LIMIT 1");
if (!$dup) {
  redirect_study_load($redirectBase, 'error=db_error');
}
$dup->bind_param('ssisss', $course, $major, $yearLevel, $section, $semester, $subjectCode);
$dup->execute();
$dupRes = $dup->get_result();
if ($dupRes && $dupRes->num_rows > 0) {
  $dup->close();
  redirect_study_load($redirectBase, 'error=duplicate');
}
$dup->close();

$stmt = $conn->prepare("INSERT INTO study_load (course, major, year_level, section, subject_code, subject_title, units, semester, teacher) VALUES (?,?,?,?,?,?,?,?,?)");
if (!$stmt) {
  redirect_study_load($redirectBase, 'error=db_error');
}
$subjectUnits = (int)$subjectRow['units'];
$teacherValue = $teacher !== '' ? $teacher : null;
$stmt->bind_param('ssisssiss', $course, $major, $yearLevel, $section, $subjectCode, $subjectRow['title'], $subjectUnits, $semester, $teacherValue);
if (!$stmt->execute()) {
  $stmt->close();
  redirect_study_load($redirectBase, 'error=db_error');
}
$newId = $conn->insert_id;
$stmt->close();

if ($newId <= 0) {
  redirect_study_load($redirectBase, 'error=db_error');
}

$details = sprintf(
  'added subject %s to %s %s Y%s %s %s',
  $subjectCode,
  $course,
  $major,
  $yearLevel,
  $section,
  $semester
);
log_audit($conn, 'create', 'study_load', $newId, $details);

redirect_study_load($redirectBase, 'success=created');
?>

