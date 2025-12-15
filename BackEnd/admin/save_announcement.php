<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=announcements');

require_once __DIR__ . '/../database/db.php';

$title = trim($_POST['title'] ?? '');
$content = trim($_POST['content'] ?? '');
$year = $_POST['year'] ?? '';
$department = trim($_POST['department'] ?? '');
if (strtoupper($department) === 'BSEED') {
  $department = 'BSED';
}
$majorInput = trim($_POST['major'] ?? '');
$id = isset($_POST['id']) ? intval($_POST['id']) : 0;

if ($title === '' || $content === '') {
  header('Location: /TCC/public/admin_dashboard.php?section=announcements&error=missing'); exit();
}

$conn = Database::getInstance()->getConnection();
$courseMajors = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science']
];

try {
  $colCheck = $conn->query("SHOW COLUMNS FROM announcements LIKE 'major'");
  if ($colCheck && $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE announcements ADD COLUMN major VARCHAR(50) DEFAULT NULL AFTER department");
  }
  if ($colCheck) { $colCheck->close(); }
} catch (Throwable $th) {
  // ignore schema errors
}

$major = null;
if ($department !== '' && isset($courseMajors[$department])) {
  if ($majorInput === '' || !in_array($majorInput, $courseMajors[$department], true)) {
    header('Location: /TCC/public/admin_dashboard.php?section=announcements&error=invalid_major'); exit();
  }
  $major = $majorInput;
}

if ($id > 0) {
    $stmt = $conn->prepare("UPDATE announcements SET title=?, content=?, year=?, department=?, major=? WHERE id = ?");
    $stmt->bind_param('sssssi', $title, $content, $year, $department, $major, $id);
    $stmt->execute();
    log_audit($conn, 'update', 'announcements', $id, "updated announcement id=$id");
} else {
    $stmt = $conn->prepare("INSERT INTO announcements (title, content, year, department, major, date) VALUES (?,?,?,?,?,NOW())");
    $stmt->bind_param('sssss', $title, $content, $year, $department, $major);
    $stmt->execute();
    $newId = $stmt->insert_id;
    log_audit($conn, 'create', 'announcements', $newId, "created announcement id=$newId");
}

header('Location: /TCC/public/admin_dashboard.php?section=announcements&success=1');
exit();
