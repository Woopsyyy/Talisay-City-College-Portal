<?php
session_start();
if (!isset($_SESSION['username'])) {
  header('Location: /TCC/public/index.html');
  exit();
}

// Allow teachers and admins
$userRole = $_SESSION['role'] ?? 'student';
if ($userRole !== 'teacher' && $userRole !== 'admin') {
  header('Location: /TCC/public/home.php');
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Location: /TCC/public/teachers.php?view=schedule');
  exit();
}

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$redirectBase = '/TCC/public/teachers.php?view=schedule';

function redirect_teacher_schedule(string $query): void {
  global $redirectBase;
  header('Location: ' . $redirectBase . '&' . $query);
  exit();
}

// Ensure user is a teacher
$currentFullName = $_SESSION['full_name'] ?? '';
$currentUsername = $_SESSION['username'] ?? '';
$currentUserId = $_SESSION['user_id'] ?? null;

if (empty($currentFullName) && empty($currentUsername)) {
  redirect_teacher_schedule('error=unauthorized');
}

// Ensure schedules table has class_type column
try {
  $colCheck = $conn->query("SHOW COLUMNS FROM schedules LIKE 'class_type'");
  if ($colCheck && $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE schedules ADD COLUMN class_type ENUM('day', 'night') DEFAULT 'day' AFTER building");
  }
  if ($colCheck) { $colCheck->close(); }
} catch (Throwable $th) {
  // ignore
}

$action = $_POST['action'] ?? 'create';
$validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
$validClassTypes = ['day', 'night'];

if ($action === 'delete') {
  $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
  if ($id <= 0) {
    redirect_teacher_schedule('error=invalid_id');
  }

  // Verify the schedule belongs to this teacher
  $infoStmt = $conn->prepare("SELECT id FROM schedules WHERE id = ? AND (instructor = ? OR instructor = ?) LIMIT 1");
  if (!$infoStmt) {
    redirect_teacher_schedule('error=db_error');
  }
  $infoStmt->bind_param('iss', $id, $currentFullName, $currentUsername);
  if (!$infoStmt->execute()) {
    $infoStmt->close();
    redirect_teacher_schedule('error=db_error');
  }
  $info = $infoStmt->get_result()->fetch_assoc();
  $infoStmt->close();

  if (!$info) {
    redirect_teacher_schedule('error=unauthorized');
  }

  $stmt = $conn->prepare("DELETE FROM schedules WHERE id = ?");
  if (!$stmt) {
    redirect_teacher_schedule('error=db_error');
  }
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) {
    $stmt->close();
    redirect_teacher_schedule('error=db_error');
  }
  $stmt->close();

  redirect_teacher_schedule('success=deleted');
}

// Validate required fields
$year = trim($_POST['year'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$day = trim($_POST['day'] ?? '');
$timeStart = trim($_POST['time_start'] ?? '');
$timeEnd = trim($_POST['time_end'] ?? '');
$room = trim($_POST['room'] ?? '');
$section = trim($_POST['section'] ?? '');
$building = trim($_POST['building'] ?? '');
$classType = strtolower(trim($_POST['class_type'] ?? 'day'));

if ($year === '' || $subject === '' || $day === '' || $timeStart === '' || $timeEnd === '') {
  redirect_teacher_schedule('error=missing');
}

if (!in_array($day, $validDays, true)) {
  redirect_teacher_schedule('error=invalid_day');
}

if (!in_array($classType, $validClassTypes, true)) {
  $classType = 'day';
}

// Set instructor to current teacher
$instructor = $currentFullName ?: $currentUsername;

if ($action === 'update') {
  $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
  if ($id <= 0) {
    redirect_teacher_schedule('error=invalid_id');
  }

  // Verify the schedule belongs to this teacher
  $checkStmt = $conn->prepare("SELECT id FROM schedules WHERE id = ? AND (instructor = ? OR instructor = ?) LIMIT 1");
  if (!$checkStmt) {
    redirect_teacher_schedule('error=db_error');
  }
  $checkStmt->bind_param('iss', $id, $currentFullName, $currentUsername);
  if (!$checkStmt->execute()) {
    $checkStmt->close();
    redirect_teacher_schedule('error=db_error');
  }
  $check = $checkStmt->get_result()->fetch_assoc();
  $checkStmt->close();

  if (!$check) {
    redirect_teacher_schedule('error=unauthorized');
  }

  $stmt = $conn->prepare("UPDATE schedules SET year = ?, subject = ?, day = ?, time_start = ?, time_end = ?, room = ?, section = ?, building = ?, class_type = ?, instructor = ? WHERE id = ?");
  if (!$stmt) {
    redirect_teacher_schedule('error=db_error');
  }
  $roomValue = $room !== '' ? $room : null;
  $sectionValue = $section !== '' ? $section : null;
  $buildingValue = $building !== '' ? $building : null;
  $stmt->bind_param('ssssssssssi', $year, $subject, $day, $timeStart, $timeEnd, $roomValue, $sectionValue, $buildingValue, $classType, $instructor, $id);
  if (!$stmt->execute()) {
    $stmt->close();
    redirect_teacher_schedule('error=db_error');
  }
  $stmt->close();

  redirect_teacher_schedule('success=updated');
}

// Create new schedule
$stmt = $conn->prepare("INSERT INTO schedules (year, subject, day, time_start, time_end, room, section, building, class_type, instructor) VALUES (?,?,?,?,?,?,?,?,?,?)");
if (!$stmt) {
  redirect_teacher_schedule('error=db_error');
}
$roomValue = $room !== '' ? $room : null;
$sectionValue = $section !== '' ? $section : null;
$buildingValue = $building !== '' ? $building : null;
$stmt->bind_param('ssssssssss', $year, $subject, $day, $timeStart, $timeEnd, $roomValue, $sectionValue, $buildingValue, $classType, $instructor);
if (!$stmt->execute()) {
  $stmt->close();
  redirect_teacher_schedule('error=db_error');
}
$newId = $conn->insert_id;
$stmt->close();

if ($newId <= 0) {
  redirect_teacher_schedule('error=db_error');
}

redirect_teacher_schedule('success=created');
?>

