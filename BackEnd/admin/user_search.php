<?php
header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) session_start();
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
  http_response_code(403);
  echo json_encode(['error' => 'Forbidden']);
  exit();
}

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
$limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 12;
$role = isset($_GET['role']) ? trim($_GET['role']) : '';

if (strlen($q) < 2) {
  echo json_encode(['results' => []]);
  exit();
}

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

$like = '%' . $conn->real_escape_string($q) . '%';
$results = [];
$resultMap = [];

if ($role === 'teacher') {
  // Prefer teachers, but include any users that match for broader predictions
  $stmt = $conn->prepare(
    "SELECT id, username, full_name, role FROM users
     WHERE (username LIKE ? OR full_name LIKE ?)
     ORDER BY CASE WHEN role = 'teacher' THEN 0 ELSE 1 END, full_name, username LIMIT ?"
  );
  $stmt->bind_param('ssi', $like, $like, $limit * 2);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) {
    $key = strtolower(trim(($row['full_name'] ?? '') . '|' . $row['username']));
    if (!isset($resultMap[$key])) {
      $resultMap[$key] = [
        'id' => (int)$row['id'],
        'username' => $row['username'],
        'full_name' => $row['full_name'] ?? $row['username'],
        'role' => $row['role'] ?? '',
        'meta' => ''
      ];
    }
  }
  $stmt->close();

  // Include existing teacher assignments even if no linked user account
  $stmt = $conn->prepare(
    "SELECT user_id, username, subject, year FROM teacher_assignments
     WHERE username LIKE ? OR subject LIKE ?
     ORDER BY username LIMIT ?"
  );
  $stmt->bind_param('ssi', $like, $like, $limit * 2);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) {
    $displayName = $row['username'];
    $key = strtolower(trim($displayName));
    if (!isset($resultMap[$key])) {
      $metaParts = [];
      if (!empty($row['year'])) {
        $metaParts[] = 'Year ' . $row['year'];
      }
      if (!empty($row['subject'])) {
        $metaParts[] = $row['subject'];
      }
      $resultMap[$key] = [
        'id' => !empty($row['user_id']) ? (int)$row['user_id'] : null,
        'username' => $row['username'],
        'full_name' => $displayName,
        'role' => '',
        'meta' => implode(' · ', $metaParts)
      ];
    }
  }
  $stmt->close();

  $results = array_values($resultMap);
  if (count($results) > $limit) {
    $results = array_slice($results, 0, $limit);
  }
} else {
  $stmt = $conn->prepare("SELECT id, username, full_name, role FROM users WHERE username LIKE ? OR full_name LIKE ? ORDER BY full_name, username LIMIT ?");
  $stmt->bind_param('ssi', $like, $like, $limit);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) {
    $results[] = [
      'id' => (int)$row['id'],
      'username' => $row['username'],
      'full_name' => $row['full_name'] ?? $row['username'],
      'role' => $row['role'] ?? '',
      'meta' => ''
    ];
  }
  $stmt->close();
}

echo json_encode(['results' => $results]);
?>
