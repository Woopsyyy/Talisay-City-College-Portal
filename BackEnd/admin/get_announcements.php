<?php
require_once __DIR__ . '/../database/db.php';
header('Content-Type: application/json; charset=utf-8');

$conn = Database::getInstance()->getConnection();
$year = isset($_GET['year']) ? trim($_GET['year']) : '';
$dept = isset($_GET['department']) ? trim($_GET['department']) : '';

$sql = "SELECT id, title, content, year, department, date FROM announcements";
$params = [];
if ($year !== '' || $dept !== '') {
    $clauses = [];
    if ($year !== '') { $clauses[] = 'year = ?'; $params[] = $year; }
    if ($dept !== '') { $clauses[] = 'department = ?'; $params[] = $dept; }
    $sql .= ' WHERE ' . implode(' AND ', $clauses);
}
$sql .= ' ORDER BY date DESC';

$stmt = $conn->prepare($sql);
if ($params) {
    $types = str_repeat('s', count($params));
    $bind = array_merge([$types], $params);
    $tmp = [];
    foreach ($bind as $k => $v) { $tmp[$k] = &$bind[$k]; }
    call_user_func_array([$stmt, 'bind_param'], $tmp);
}
$stmt->execute();
$res = $stmt->get_result();
$out = [];
while ($row = $res->fetch_assoc()) { $out[] = $row; }

echo json_encode(['success'=>true, 'announcements'=>$out]);
