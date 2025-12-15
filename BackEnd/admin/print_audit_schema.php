<?php
require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();
$dbName = $conn->real_escape_string($conn->query('SELECT DATABASE()')->fetch_row()[0]);
$q = $conn->prepare("SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema = ? AND table_name = 'audit_log'");
$q->bind_param('s', $dbName);
$q->execute();
$res = $q->get_result();
if ($res) {
    while ($r = $res->fetch_assoc()) {
        echo $r['COLUMN_NAME'] . " : " . $r['COLUMN_TYPE'] . "\n";
    }
} else {
    echo "No audit_log table or error: " . $conn->error . "\n";
}
