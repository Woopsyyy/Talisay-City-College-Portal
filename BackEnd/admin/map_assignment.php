<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin/unmapped_assignments.php');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$assignmentId = isset($_POST['assignment_id']) ? intval($_POST['assignment_id']) : 0;
$userId = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;

if ($assignmentId <= 0 || $userId <= 0) {
    header('Location: /TCC/public/admin/unmapped_assignments.php?error=invalid'); exit();
}

// verify user exists
$ps = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
if (!$ps) { header('Location: /TCC/public/admin/unmapped_assignments.php?error=dberr'); exit(); }
$ps->bind_param('i', $userId); $ps->execute(); $gres = $ps->get_result();
if (!$gres || $gres->num_rows == 0) { header('Location: /TCC/public/admin/unmapped_assignments.php?error=usernotfound'); exit(); }
$ps->close();

// update assignment
$up = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE id = ?");
if (!$up) { header('Location: /TCC/public/admin/unmapped_assignments.php?error=dberr2'); exit(); }
$up->bind_param('ii', $userId, $assignmentId); $up->execute();

log_audit($conn, 'map_assignment', 'user_assignments', $assignmentId, "mapped assignment {$assignmentId} -> user_id {$userId}");

header('Location: /TCC/public/admin/unmapped_assignments.php?success=1'); exit();
