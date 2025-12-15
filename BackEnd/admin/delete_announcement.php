<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=announcements');

require_once __DIR__ . '/../database/db.php';

$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
if ($id <= 0) { header('Location: /TCC/public/admin_dashboard.php?section=announcements&error=missing'); exit(); }

$conn = Database::getInstance()->getConnection();
$stmt = $conn->prepare("DELETE FROM announcements WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();

log_audit($conn, 'delete', 'announcements', $id, "deleted announcement id=$id");

header('Location: /TCC/public/admin_dashboard.php?section=announcements&deleted=1');
exit();
