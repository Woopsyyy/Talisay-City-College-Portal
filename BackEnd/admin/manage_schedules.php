<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
$fromSection = $_POST['from_section'] ?? 'schedule_management';
$redirectBase = '/TCC/public/admin_dashboard.php?section=' . $fromSection;
require_admin_post($redirectBase);

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

ensure_tables($conn, [
  'schedules' => "CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    day VARCHAR(20) NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    room VARCHAR(100) DEFAULT NULL,
    instructor VARCHAR(255) DEFAULT NULL,
    section VARCHAR(100) DEFAULT NULL,
    building VARCHAR(10) DEFAULT NULL,
    class_type ENUM('day', 'night') DEFAULT 'day',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year (year),
    INDEX idx_subject (subject),
    INDEX idx_day (day)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'sections' => "CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_year_name (year, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'buildings' => "CREATE TABLE IF NOT EXISTS buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(10) NOT NULL UNIQUE,
    floors INT DEFAULT 4,
    rooms_per_floor INT DEFAULT 4
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'teacher_assignments' => "CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    username VARCHAR(200) NOT NULL,
    year VARCHAR(10) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_username (username),
    INDEX idx_year (year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

// Ensure class_type column exists
$colCheck = $conn->query("SHOW COLUMNS FROM schedules LIKE 'class_type'");
if ($colCheck && $colCheck->num_rows === 0) {
  $conn->query("ALTER TABLE schedules ADD COLUMN class_type ENUM('day', 'night') DEFAULT 'day' AFTER building");
}
if ($colCheck) { $colCheck->close(); }

$action = $_POST['action'] ?? 'create';

function redirect_schedule(string $query): void {
  global $redirectBase;
  header('Location: ' . $redirectBase . '&' . $query);
  exit();
}

if ($action === 'delete') {
	// Delete schedule
	$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
	if ($id <= 0) { redirect_schedule('error=invalid_id'); }
	
	// Get schedule info for audit log
	$sel = $conn->prepare("SELECT year, subject, day FROM schedules WHERE id = ? LIMIT 1");
	$sel->bind_param('i', $id);
	$sel->execute();
	$res = $sel->get_result();
	$row = $res->fetch_assoc();
	$sel->close();
	
	if ($row) {
		$del = $conn->prepare("DELETE FROM schedules WHERE id = ?");
		$del->bind_param('i', $id);
		$del->execute();
		$del->close();
		
		$details = "Deleted schedule: " . ($row['subject'] ?? '') . " - " . ($row['day'] ?? '') . " (" . ($row['year'] ?? '') . ")";
		log_audit($conn, 'delete', 'schedules', $id, $details);
	}
	
	redirect_schedule('success=deleted');
}

// Validate required fields
$year = trim($_POST['year'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$day = trim($_POST['day'] ?? '');
$timeStart = trim($_POST['time_start'] ?? '');
$timeEnd = trim($_POST['time_end'] ?? '');

if (empty($year) || empty($subject) || empty($day) || empty($timeStart) || empty($timeEnd)) {
	redirect_schedule('error=missing');
}

$room = trim($_POST['room'] ?? '');
$instructor = trim($_POST['instructor'] ?? '');
$section = trim($_POST['section'] ?? '');
$building = trim($_POST['building'] ?? '');
$classType = strtolower(trim($_POST['class_type'] ?? 'day'));
$validClassTypes = ['day', 'night'];
if (!in_array($classType, $validClassTypes, true)) {
	$classType = 'day';
}

// Auto-find instructor from teacher_assignments based on subject code
// If instructor is not provided, look it up from teacher_assignments
if (empty($instructor) && !empty($subject)) {
	$teacherLookup = $conn->prepare("SELECT teacher_name FROM teacher_assignments WHERE subject_code = ? LIMIT 1");
	if ($teacherLookup) {
		$teacherLookup->bind_param('s', $subject);
		$teacherLookup->execute();
		$teacherResult = $teacherLookup->get_result();
		if ($teacherRow = $teacherResult->fetch_assoc()) {
			$instructor = $teacherRow['teacher_name'];
		}
		$teacherLookup->close();
	}
}

// Validate Instructor - must exist in teacher_assignments for the subject
if (empty($instructor)) {
	redirect_schedule('error=instructor_not_found');
}

// Verify the instructor is actually assigned to this subject
$instructorVerify = $conn->prepare("SELECT COUNT(*) as cnt FROM teacher_assignments WHERE subject_code = ? AND teacher_name = ?");
if ($instructorVerify) {
	$instructorVerify->bind_param('ss', $subject, $instructor);
	$instructorVerify->execute();
	$instructorVerifyRes = $instructorVerify->get_result();
	$instructorVerifyRow = $instructorVerifyRes->fetch_assoc();
	$instructorVerify->close();
	
	if (intval($instructorVerifyRow['cnt'] ?? 0) === 0) {
		redirect_schedule('error=instructor_not_found');
	}
}

// Validate Section if provided
if (!empty($section)) {
	$sectionCheck = $conn->prepare("SELECT COUNT(*) as cnt FROM sections WHERE year = ? AND name = ?");
	$sectionCheck->bind_param('ss', $year, $section);
	$sectionCheck->execute();
	$sectionRes = $sectionCheck->get_result();
	$sectionRow = $sectionRes->fetch_assoc();
	$sectionCheck->close();
	
	if (intval($sectionRow['cnt'] ?? 0) === 0) {
		redirect_schedule('error=section_not_found');
	}
}

// Validate Building if provided
if (!empty($building)) {
	// Check buildings table
	$buildingCheck = $conn->prepare("SELECT COUNT(*) as cnt FROM buildings WHERE name = ?");
	$buildingCheck->bind_param('s', $building);
	$buildingCheck->execute();
	$buildingRes = $buildingCheck->get_result();
	$buildingRow = $buildingRes->fetch_assoc();
	$buildingCheck->close();
	
	// Also check JSON fallback
	$buildingExists = false;
	if (intval($buildingRow['cnt'] ?? 0) > 0) {
		$buildingExists = true;
	} else {
		$buildingsPath = __DIR__ . '/../../database/buildings.json';
		if (file_exists($buildingsPath)) {
			$buildingsData = json_decode(file_get_contents($buildingsPath), true) ?: [];
			$buildingExists = isset($buildingsData[strtoupper($building)]);
		}
	}
	
	if (!$buildingExists) {
		redirect_schedule('error=building_not_found');
	}
}

if ($action === 'update') {
	$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
	if ($id <= 0) { redirect_schedule('error=invalid_id'); }
	
	$upd = $conn->prepare("UPDATE schedules SET year = ?, subject = ?, day = ?, time_start = ?, time_end = ?, room = ?, instructor = ?, section = ?, building = ?, class_type = ? WHERE id = ?");
	if (!$upd) {
		redirect_schedule('error=db_error');
	}
	$upd->bind_param('ssssssssssi', $year, $subject, $day, $timeStart, $timeEnd, $room, $instructor, $section, $building, $classType, $id);
	if (!$upd->execute()) {
		$upd->close();
		redirect_schedule('error=db_error');
	}
	$upd->close();
	
	$details = "Updated schedule: " . $subject . " - " . $day . " (" . $year . ")";
	log_audit($conn, 'update', 'schedules', $id, $details);
	
	redirect_schedule('success=updated');
} else {
	// Create new schedule
	$ins = $conn->prepare("INSERT INTO schedules (year, subject, day, time_start, time_end, room, instructor, section, building, class_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
	if (!$ins) {
		redirect_schedule('error=db_error');
	}
	$ins->bind_param('ssssssssss', $year, $subject, $day, $timeStart, $timeEnd, $room, $instructor, $section, $building, $classType);
	if (!$ins->execute()) {
		$ins->close();
		redirect_schedule('error=db_error');
	}
	$newId = $conn->insert_id;
	$ins->close();
	
	$details = "Created schedule: " . $subject . " - " . $day . " (" . $year . ")";
	log_audit($conn, 'create', 'schedules', $newId, $details);
	
	redirect_schedule('success=created');
}
?>
