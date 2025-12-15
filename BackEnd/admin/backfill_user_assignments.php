<?php
// One-time backfill: try to populate user_assignments.user_id from users table
require_once __DIR__ . '/../database/db.php';
$db = Database::getInstance();
$conn = $db->getConnection();

echo "Starting backfill of user_assignments -> user_id\n";

$updated = 0;

// 1) exact match on full_name
$q1 = "UPDATE user_assignments ua JOIN users u ON ua.username = u.full_name SET ua.user_id = u.id WHERE (ua.user_id IS NULL OR ua.user_id = 0)";
if ($conn->query($q1)) { $c = $conn->affected_rows; echo "Exact full_name matches updated: $c\n"; $updated += $c; } else { echo "Q1 error: " . $conn->error . "\n"; }

// 2) exact match on username
$q2 = "UPDATE user_assignments ua JOIN users u ON ua.username = u.username SET ua.user_id = u.id WHERE (ua.user_id IS NULL OR ua.user_id = 0)";
if ($conn->query($q2)) { $c = $conn->affected_rows; echo "Exact username matches updated: $c\n"; $updated += $c; } else { echo "Q2 error: " . $conn->error . "\n"; }

// 3) try safe LIKE matches (only when a single user matches) - iterate rows
$res = $conn->query("SELECT id, username FROM user_assignments WHERE (user_id IS NULL OR user_id = 0)");
if ($res) {
    while ($r = $res->fetch_assoc()) {
        $aid = (int)$r['id'];
        $uname = $conn->real_escape_string($r['username']);
        if (trim($uname) === '') continue;
        $like = "%$uname%";
        $ps = $conn->prepare("SELECT id FROM users WHERE full_name LIKE ? OR username LIKE ?");
        if (!$ps) continue;
        $ps->bind_param('ss', $like, $like);
        $ps->execute();
        $gres = $ps->get_result();
        if ($gres->num_rows === 1) {
            $g = $gres->fetch_assoc();
            $uid = (int)$g['id'];
            $up = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE id = ?");
            if ($up) { $up->bind_param('ii', $uid, $aid); $up->execute(); if ($up->affected_rows>0) { echo "Backfilled assignment $aid -> user $uid (LIKE)\n"; $updated++; } $up->close(); }
        }
        $ps->close();
    }
}

echo "Backfill complete. Total updated: $updated\n";
