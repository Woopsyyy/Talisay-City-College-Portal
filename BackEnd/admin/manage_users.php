<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=manage_students');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$courseMajors = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science'],
  'HM' => ['General'],
  'BEED' => ['General'],
  'TOURISM' => ['General']
];

try {
  $colCheck = $conn->query("SHOW COLUMNS FROM user_assignments LIKE 'major'");
  if ($colCheck && $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE user_assignments ADD COLUMN major VARCHAR(100) DEFAULT NULL AFTER department");
  }
  if ($colCheck) { $colCheck->close(); }
} catch (Throwable $th) {
  // ignore
}

ensure_tables($conn, [
	'teacher_assignments' => "CREATE TABLE IF NOT EXISTS teacher_assignments (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT DEFAULT NULL,
		teacher_name VARCHAR(200) NOT NULL,
		subject_code VARCHAR(50) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		INDEX idx_user_id (user_id),
		INDEX idx_teacher_name (teacher_name),
		INDEX idx_subject_code (subject_code),
		UNIQUE KEY uniq_teacher_subject (teacher_name, subject_code)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'sections' => "CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_year_name (year, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

$action = $_POST['action'] ?? 'assign';

// Teacher assignment actions - check FIRST before default assign action
if ($action === 'assign_teacher') {
	// Assign teacher to year/subject
	$full_name = trim($_POST['full_name'] ?? '');
	$existingUserId = !empty($_POST['existing_user_id']) ? intval($_POST['existing_user_id']) : null;
	if (!empty($existingUserId)) {
		$p = $conn->prepare("SELECT id, full_name FROM users WHERE id = ? LIMIT 1");
		if ($p) { $p->bind_param('i', $existingUserId); $p->execute(); $gr = $p->get_result(); if ($g = $gr->fetch_assoc()) { $full_name = $g['full_name'] ?? $full_name; } $p->close(); }
	}
	$subject_code = strtoupper(trim($_POST['subject_code'] ?? ''));

	// Debug: Log what we received
	error_log("Teacher assignment attempt - full_name: '" . $full_name . "', subject_code: '" . $subject_code . "'");

	if ($full_name === '' || $subject_code === '') {
		$missingFields = [];
		if ($full_name === '') $missingFields[] = 'teacher name';
		if ($subject_code === '') $missingFields[] = 'subject code';
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=missing&fields=' . urlencode(implode(', ', $missingFields))); 
		exit(); 
	}

	// Validate that subject exists in subjects table
	$subjectCheck = $conn->prepare("SELECT subject_code, title FROM subjects WHERE subject_code = ? LIMIT 1");
	if (!$subjectCheck) {
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=db_error');
		exit();
	}
	$subjectCheck->bind_param('s', $subject_code);
	$subjectCheck->execute();
	$subjectResult = $subjectCheck->get_result();
	if ($subjectResult->num_rows === 0) {
		$subjectCheck->close();
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=subject_not_found');
		exit();
	}
	$subjectCheck->close();

	// Validate user exists and has teacher role if existing_user_id is provided
	if (!empty($existingUserId)) {
		$userCheck = $conn->prepare("SELECT id, full_name, username, role FROM users WHERE id = ? LIMIT 1");
		$userCheck->bind_param('i', $existingUserId);
		$userCheck->execute();
		$userResult = $userCheck->get_result();
		if ($userResult->num_rows === 0) {
			$userCheck->close();
			header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=user_not_found'); 
			exit();
		}
		$userRow = $userResult->fetch_assoc();
		if (($userRow['role'] ?? '') !== 'teacher') {
			$userCheck->close();
			header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=not_teacher');
			exit();
		}
		$userCheck->close();
	}

	// Try to resolve user id for this full_name (or use selected existing user)
	$user_id = !empty($existingUserId) ? $existingUserId : null;
	if (empty($user_id)) {
		$ps = $conn->prepare("SELECT id, role FROM users WHERE full_name = ? OR username = ? LIMIT 1");
		if ($ps) {
			$ps->bind_param('ss', $full_name, $full_name);
			$ps->execute();
			$gres = $ps->get_result();
			if ($g = $gres->fetch_assoc()) {
				// Verify the user has role='teacher'
				if (($g['role'] ?? '') !== 'teacher') {
					$ps->close();
					header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=not_teacher');
					exit();
				}
				$user_id = (int)$g['id'];
			}
			$ps->close();
		}
	} else {
		// Verify the selected user has role='teacher'
		$ps = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
		if ($ps) {
			$ps->bind_param('i', $user_id);
			$ps->execute();
			$gres = $ps->get_result();
			if ($g = $gres->fetch_assoc()) {
				if (($g['role'] ?? '') !== 'teacher') {
					$ps->close();
					header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=not_teacher');
					exit();
				}
			}
			$ps->close();
		}
	}

	// Check if table needs migration (old schema has 'username' and 'year', new has 'teacher_name')
	$colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
	$needsMigration = $colCheck && $colCheck->num_rows === 0;
	if ($colCheck) { $colCheck->close(); }
	
	if ($needsMigration) {
		// Migrate old schema to new schema
		@$conn->query("ALTER TABLE teacher_assignments ADD COLUMN teacher_name VARCHAR(200) NOT NULL DEFAULT '' AFTER user_id");
		@$conn->query("ALTER TABLE teacher_assignments ADD COLUMN subject_code VARCHAR(50) NOT NULL DEFAULT '' AFTER teacher_name");
		@$conn->query("UPDATE teacher_assignments SET teacher_name = username, subject_code = subject WHERE teacher_name = '' OR subject_code = ''");
		@$conn->query("ALTER TABLE teacher_assignments DROP COLUMN username");
		@$conn->query("ALTER TABLE teacher_assignments DROP COLUMN year");
		@$conn->query("ALTER TABLE teacher_assignments DROP COLUMN subject");
		// Check if unique key exists before adding
		$keyCheck = $conn->query("SHOW INDEX FROM teacher_assignments WHERE Key_name = 'uniq_teacher_subject'");
		if ($keyCheck && $keyCheck->num_rows === 0) {
			@$conn->query("ALTER TABLE teacher_assignments ADD UNIQUE KEY uniq_teacher_subject (teacher_name, subject_code)");
		}
		if ($keyCheck) { $keyCheck->close(); }
		// Add indexes if they don't exist
		$idxCheck1 = $conn->query("SHOW INDEX FROM teacher_assignments WHERE Key_name = 'idx_teacher_name'");
		if ($idxCheck1 && $idxCheck1->num_rows === 0) {
			@$conn->query("ALTER TABLE teacher_assignments ADD INDEX idx_teacher_name (teacher_name)");
		}
		if ($idxCheck1) { $idxCheck1->close(); }
		$idxCheck2 = $conn->query("SHOW INDEX FROM teacher_assignments WHERE Key_name = 'idx_subject_code'");
		if ($idxCheck2 && $idxCheck2->num_rows === 0) {
			@$conn->query("ALTER TABLE teacher_assignments ADD INDEX idx_subject_code (subject_code)");
		}
		if ($idxCheck2) { $idxCheck2->close(); }
	}

	// Ensure unique key exists for ON DUPLICATE KEY UPDATE to work
	$keyCheck = $conn->query("SHOW INDEX FROM teacher_assignments WHERE Key_name = 'uniq_teacher_subject'");
	$hasUniqueKey = $keyCheck && $keyCheck->num_rows > 0;
	if ($keyCheck) { $keyCheck->close(); }
	
	if (!$hasUniqueKey) {
		@$conn->query("ALTER TABLE teacher_assignments ADD UNIQUE KEY uniq_teacher_subject (teacher_name, subject_code)");
	}

	$stmt = $conn->prepare("INSERT INTO teacher_assignments (teacher_name, subject_code, user_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)");
	if (!$stmt) {
		error_log("Failed to prepare INSERT statement: " . $conn->error);
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=db_error');
		exit();
	}
	$user_id_for_insert = !empty($user_id) ? $user_id : null;
	$stmt->bind_param('ssi', $full_name, $subject_code, $user_id_for_insert);
	if (!$stmt->execute()) {
		error_log("Failed to execute INSERT statement: " . $stmt->error);
		$stmt->close();
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=db_error');
		exit();
	}
	$newId = $conn->insert_id;
	$stmt->close();

	$details = "assigned teacher $full_name to subject $subject_code";
	log_audit($conn, 'create', 'teacher_assignments', $newId > 0 ? $newId : 0, $details);

	header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&success=teacher_assigned'); exit();
	
} else if ($action === 'delete_teacher') {
	// Delete teacher assignment
	$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
	if ($id <= 0) { 
		header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&error=invalid_id'); 
		exit(); 
	}
	
	// Get assignment info for audit log (handle both old and new schema)
	$sel = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
	$hasNewSchema = $sel && $sel->num_rows > 0;
	if ($sel) { $sel->close(); }
	
	if ($hasNewSchema) {
		$sel = $conn->prepare("SELECT teacher_name, subject_code FROM teacher_assignments WHERE id = ? LIMIT 1");
	} else {
		$sel = $conn->prepare("SELECT username as teacher_name, subject FROM teacher_assignments WHERE id = ? LIMIT 1");
	}
	$sel->bind_param('i', $id);
	$sel->execute();
	$res = $sel->get_result();
	$assignmentInfo = $res->fetch_assoc();
	$sel->close();
	
	// Delete the assignment
	$stmt = $conn->prepare("DELETE FROM teacher_assignments WHERE id = ?");
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
	
	// Audit log
	$teacherName = $assignmentInfo['teacher_name'] ?? 'unknown';
	$subjectInfo = $assignmentInfo['subject_code'] ?? ($assignmentInfo['subject'] ?? 'unknown');
	$details = "deleted teacher_assignment for $teacherName (subject: $subjectInfo)";
	log_audit($conn, 'delete', 'teacher_assignments', $id, $details);
	
	header('Location: /TCC/public/admin_dashboard.php?section=teacher_management&success=teacher_deleted'); exit();
	
} else if ($action === 'delete') {
	// Delete user assignment
	$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
	if ($id <= 0) { header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=invalid_id'); exit(); }
	
	// Get assignment info for audit log
	$sel = $conn->prepare("SELECT username, year, section FROM user_assignments WHERE id = ? LIMIT 1");
	$sel->bind_param('i', $id);
	$sel->execute();
	$res = $sel->get_result();
	$assignmentInfo = $res->fetch_assoc();
	$sel->close();
	
	// Delete the assignment
	$stmt = $conn->prepare("DELETE FROM user_assignments WHERE id = ?");
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
	
	// Audit log
	$details = "deleted user_assignment for " . ($assignmentInfo['username'] ?? 'unknown') . " (year: " . ($assignmentInfo['year'] ?? '') . ", section: " . ($assignmentInfo['section'] ?? '') . ")";
	log_audit($conn, 'delete', 'user_assignments', $id, $details);
	
	header('Location: /TCC/public/admin_dashboard.php?section=manage_students&deleted=1'); exit();
	
} else if ($action === 'update') {
		// update existing user's payment/sanctions/department by full_name
		$full_name = trim($_POST['full_name'] ?? '');
		// If admin selected an existing user, prefer that canonical fullname and id
		$existingUserId = !empty($_POST['existing_user_id']) ? intval($_POST['existing_user_id']) : null;
		if (!empty($existingUserId)) {
			$p = $conn->prepare("SELECT id, full_name FROM users WHERE id = ? LIMIT 1");
			if ($p) { $p->bind_param('i', $existingUserId); $p->execute(); $gr = $p->get_result(); if ($g = $gr->fetch_assoc()) { $full_name = $g['full_name'] ?? $full_name; } $p->close(); }
		}
		if ($full_name === '') { header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=missing'); exit(); }

		$payment = trim($_POST['payment'] ?? 'paid'); // 'paid' or 'owing'
		$sanctions = trim($_POST['sanctions'] ?? '');
		$department = trim($_POST['department'] ?? '');
		if (strtoupper($department) === 'BSEED') { $department = 'BSED'; }
		$major = trim($_POST['major'] ?? '');
		if ($department !== '' && isset($courseMajors[$department])) {
			if ($major === '' || !in_array($major, $courseMajors[$department], true)) {
				header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=invalid_major'); exit();
			}
		} else {
			$major = null;
		}
		$owing_amount = trim($_POST['owing_amount'] ?? '');

		// validate owing amount when payment is owing
		if ($payment === 'owing') {
			if ($owing_amount === '' || !is_numeric($owing_amount) || floatval($owing_amount) <= 0) {
				header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=invalid_owing'); exit();
			}
		} else {
			// clear owing when not owing
			$owing_amount = '';
		}

		// try to resolve a users.id mapping for this full_name (unless existingUserId provided)
		$user_id = !empty($existingUserId) ? $existingUserId : null;
		if (empty($user_id)) {
			$ps = $conn->prepare("SELECT id FROM users WHERE full_name = ? OR username = ? LIMIT 1");
			if ($ps) {
				$ps->bind_param('ss', $full_name, $full_name);
				$ps->execute();
				$gres = $ps->get_result();
				if ($g = $gres->fetch_assoc()) { $user_id = (int)$g['id']; }
				$ps->close();
			}
		}

	// We don't update year/section here (admin edit modal is for payment/sanctions/department)
	// Try to fetch existing row to preserve year/section
	$sel = $conn->prepare("SELECT id, year, section, user_id FROM user_assignments WHERE username = ? LIMIT 1");
	$sel->bind_param('s', $full_name);
	$sel->execute();
	$res = $sel->get_result();
	$existing_id = null;
	$existing_user_id = null;
	if ($row = $res->fetch_assoc()) { 
		$existing_id = $row['id'];
		$existing_user_id = $row['user_id'];
	}
	
	// Use provided user_id or existing one
	$final_user_id = !empty($user_id) ? $user_id : $existing_user_id;
	
	// Update existing record or insert new one
	if ($existing_id) {
		// Update existing record
		$stmt = $conn->prepare("UPDATE user_assignments SET department=?, major=?, payment=?, sanctions=?, owing_amount=?, user_id=? WHERE id=?");
		$stmt->bind_param('ssssssi', $department, $major, $payment, $sanctions, $owing_amount, $final_user_id, $existing_id);
		$stmt->execute();
	} else {
		// Insert new record (shouldn't happen in update action, but handle it)
		$year = '';
		$section = '';
		$stmt = $conn->prepare("INSERT INTO user_assignments (username, year, section, department, major, payment, sanctions, owing_amount, user_id) VALUES (?,?,?,?,?,?,?,?,?)");
		$stmt->bind_param('ssssssssi', $full_name, $year, $section, $department, $major, $payment, $sanctions, $owing_amount, $final_user_id);
		$stmt->execute();
	}

		$id_s = $existing_id ? (string)$existing_id : ($conn->insert_id ? (string)$conn->insert_id : $full_name);
		$details = "updated user_assignment for $full_name: payment=$payment, sanctions=" . (empty($sanctions) ? 'none' : $sanctions) . ", owing=" . ($owing_amount ?: '0');
		log_audit($conn, 'update', 'user_assignments', $id_s, $details);
		header('Location: /TCC/public/admin_dashboard.php?section=manage_students&updated=1'); exit();

} else {
		// assign new user to year/section (and optional department)
		$full_name = trim($_POST['full_name'] ?? '');
		$existingUserId = !empty($_POST['existing_user_id']) ? intval($_POST['existing_user_id']) : null;
		if (!empty($existingUserId)) {
			$p = $conn->prepare("SELECT id, full_name FROM users WHERE id = ? LIMIT 1");
			if ($p) { $p->bind_param('i', $existingUserId); $p->execute(); $gr = $p->get_result(); if ($g = $gr->fetch_assoc()) { $full_name = $g['full_name'] ?? $full_name; } $p->close(); }
		}
		$year = trim($_POST['year'] ?? '');
		$section = trim($_POST['section'] ?? '');
		$department = trim($_POST['department'] ?? '');
		if (strtoupper($department) === 'BSEED') { $department = 'BSED'; }
		$major = trim($_POST['major'] ?? '');
		if ($department !== '' && isset($courseMajors[$department])) {
			if ($major === '' || !in_array($major, $courseMajors[$department], true)) {
				header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=invalid_major'); exit();
			}
		} else {
			$major = null;
		}

		if ($full_name === '' || $year === '' || $section === '') { header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=missing'); exit(); }

		// Validate section exists in sections table
		$sectionCheck = $conn->prepare("SELECT id FROM sections WHERE year = ? AND name = ? LIMIT 1");
		$sectionCheck->bind_param('ss', $year, $section);
		$sectionCheck->execute();
		$sectionResult = $sectionCheck->get_result();
		if ($sectionResult->num_rows === 0) {
			$sectionCheck->close();
			header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=section_not_found'); 
			exit();
		}
		$sectionCheck->close();

		// Validate user exists if existing_user_id is provided
		if (!empty($existingUserId)) {
			$userCheck = $conn->prepare("SELECT id, full_name, username FROM users WHERE id = ? LIMIT 1");
			$userCheck->bind_param('i', $existingUserId);
			$userCheck->execute();
			$userResult = $userCheck->get_result();
			if ($userResult->num_rows === 0) {
				$userCheck->close();
				header('Location: /TCC/public/admin_dashboard.php?section=manage_students&error=user_not_found'); 
				exit();
			}
			$userCheck->close();
		}

		$payment = 'paid'; $sanctions = ''; $owing_amount = '';

		// try to resolve user id for this full_name (or use selected existing user)
		$user_id = !empty($existingUserId) ? $existingUserId : null;
		if (empty($user_id)) {
			$ps = $conn->prepare("SELECT id FROM users WHERE full_name = ? OR username = ? LIMIT 1");
			if ($ps) {
				$ps->bind_param('ss', $full_name, $full_name);
				$ps->execute();
				$gres = $ps->get_result();
				if ($g = $gres->fetch_assoc()) { $user_id = (int)$g['id']; }
				$ps->close();
			}
		}

		$stmt = $conn->prepare("INSERT INTO user_assignments (username, year, section, department, major, payment, sanctions, owing_amount, user_id) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE year=VALUES(year), section=VALUES(section), department=VALUES(department), major=VALUES(major), payment=VALUES(payment), sanctions=VALUES(sanctions), owing_amount=VALUES(owing_amount), user_id=VALUES(user_id)");
		$user_id_for_insert = !empty($user_id) ? $user_id : null;
		$stmt->bind_param('ssssssssi', $full_name, $year, $section, $department, $major, $payment, $sanctions, $owing_amount, $user_id_for_insert);
		$stmt->execute();

		if (!empty($user_id)) {
			$up = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE username = ?");
			if ($up) { $up->bind_param('is', $user_id, $full_name); $up->execute(); }
		}

		$details = "assigned $full_name to $year/$section";
		log_audit($conn, 'create', 'user_assignments', $conn->insert_id, $details);
		header('Location: /TCC/public/admin_dashboard.php?section=manage_students&success=1'); exit();
}
