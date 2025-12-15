<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=manage_user');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$redirectBase = '/TCC/public/admin_dashboard.php?section=manage_user';

function redirect_manage_user(string $query): void {
  global $redirectBase;
  header('Location: ' . $redirectBase . '&' . $query);
  exit();
}

$action = $_POST['action'] ?? '';

if ($action !== 'update_role') {
  redirect_manage_user('error=missing');
}

$userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
$newRole = strtolower(trim($_POST['role'] ?? ''));

if ($userId <= 0) {
  redirect_manage_user('error=invalid_id');
}

$validRoles = ['admin', 'teacher', 'student'];
if (!in_array($newRole, $validRoles, true)) {
  redirect_manage_user('error=invalid_role');
}

// Prevent self-demotion (admin changing their own role)
$currentUserId = $_SESSION['user_id'] ?? null;
if ($currentUserId && (int)$currentUserId === $userId && $newRole !== 'admin') {
  redirect_manage_user('error=self_demote');
}

// Get current user info for audit log
$infoStmt = $conn->prepare("SELECT username, full_name, role FROM users WHERE id = ? LIMIT 1");
if (!$infoStmt) {
  redirect_manage_user('error=db_error');
}
$infoStmt->bind_param('i', $userId);
if (!$infoStmt->execute()) {
  $infoStmt->close();
  redirect_manage_user('error=db_error');
}
$userInfo = $infoStmt->get_result()->fetch_assoc();
$infoStmt->close();

if (!$userInfo) {
  redirect_manage_user('error=invalid_id');
}

// Don't update if role is the same
if ($userInfo['role'] === $newRole) {
  redirect_manage_user('success=updated');
}

// Update the role
$stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
if (!$stmt) {
  redirect_manage_user('error=db_error');
}
$stmt->bind_param('si', $newRole, $userId);
if (!$stmt->execute()) {
  $stmt->close();
  redirect_manage_user('error=db_error');
}
$stmt->close();

// Log the change
$details = sprintf(
  'changed role from %s to %s for user %s (%s)',
  $userInfo['role'],
  $newRole,
  $userInfo['username'],
  $userInfo['full_name'] ?? 'N/A'
);
log_audit($conn, 'update', 'users', $userId, $details);

// If updating own role, update session
if ($currentUserId && (int)$currentUserId === $userId) {
  $_SESSION['role'] = $newRole;
}

redirect_manage_user('success=updated');
?>

