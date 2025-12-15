<?php
require_once __DIR__ . '/../database/db.php';
$c = Database::getInstance()->getConnection();
echo "users:\n";
$r = $c->query('SELECT id, username, full_name FROM users LIMIT 20');
if ($r) {
  while ($a = $r->fetch_assoc()) {
    echo json_encode($a) . "\n";
  }
} else { echo "users query error: " . $c->error . "\n"; }

echo "assignments:\n";
$r2 = $c->query('SELECT id, username, user_id, year, section FROM user_assignments LIMIT 50');
if ($r2) {
  while ($b = $r2->fetch_assoc()) {
    echo json_encode($b) . "\n";
  }
} else { echo "assignments query error: " . $c->error . "\n"; }
