<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=buildings');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

ensure_tables($conn, [
  'sections' => "CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_year_name (year, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  'section_assignments' => "CREATE TABLE IF NOT EXISTS section_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    section VARCHAR(100) NOT NULL,
    building VARCHAR(10) NOT NULL,
    floor INT DEFAULT 1,
    room VARCHAR(50) NOT NULL,
    UNIQUE KEY uniq_year_section (year, section)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

$action = $_POST['action'] ?? 'create';
$year = trim($_POST['year'] ?? '');
$sect = trim($_POST['section'] ?? '');
$building = strtoupper(trim($_POST['building'] ?? ''));
$floor = intval($_POST['floor'] ?? 1);
$room = trim($_POST['room'] ?? '');
$id = isset($_POST['id']) ? intval($_POST['id']) : 0;

if ($action === 'delete' && $id > 0) {
  // Delete section assignment
  $stmt = $conn->prepare("DELETE FROM section_assignments WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  
  // Also update JSON backup
  $path = __DIR__ . '/../../database/section_assignments.json';
  $data = [];
  if (file_exists($path)) { $data = json_decode(file_get_contents($path), true) ?: []; }
  // Find and remove from JSON
  foreach ($data as $key => $info) {
    if (isset($info['id']) && $info['id'] == $id) {
      unset($data[$key]);
      break;
    }
    // Also check by year|section key
    if (strpos($key, '|') !== false) {
      list($y, $s) = explode('|', $key, 2);
      if ($y === $year && $s === $sect) {
        unset($data[$key]);
        break;
      }
    }
  }
  file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
  
  header('Location: /TCC/public/admin_dashboard.php?section=buildings&success=deleted'); exit();
}

if ($action === 'update' && $id > 0) {
  // Update existing section assignment
  if ($year === '' || $sect === '' || $building === '' || $room === '') { 
    header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=missing'); 
    exit(); 
  }
  
  // Check if section exists in sections table
  $sectionCheck = $conn->prepare("SELECT id FROM sections WHERE year = ? AND name = ? LIMIT 1");
  $sectionCheck->bind_param('ss', $year, $sect);
  $sectionCheck->execute();
  $sectionResult = $sectionCheck->get_result();
  if ($sectionResult->num_rows === 0) {
    $sectionCheck->close();
    header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=section_not_found'); 
    exit();
  }
  $sectionCheck->close();
  
  $stmt = $conn->prepare("UPDATE section_assignments SET year=?, section=?, building=?, floor=?, room=? WHERE id=?");
  $stmt->bind_param('sssisi', $year, $sect, $building, $floor, $room, $id);
  $stmt->execute();
  
  // Also update JSON backup
  $path = __DIR__ . '/../../database/section_assignments.json';
  $data = [];
  if (file_exists($path)) { $data = json_decode(file_get_contents($path), true) ?: []; }
  $key = $year . '|' . $sect;
  $data[$key] = ['id'=>$id, 'year'=>$year, 'section'=>$sect, 'building'=>$building, 'floor'=>$floor, 'room'=>$room];
  file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
  
  header('Location: /TCC/public/admin_dashboard.php?section=buildings&success=updated'); exit();
}

// Default: Create new section assignment
if ($year === '' || $sect === '' || $building === '' || $room === '') { 
  header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=missing'); 
  exit(); 
}

// Check if section exists in sections table
$sectionCheck = $conn->prepare("SELECT id FROM sections WHERE year = ? AND name = ? LIMIT 1");
$sectionCheck->bind_param('ss', $year, $sect);
$sectionCheck->execute();
$sectionResult = $sectionCheck->get_result();
if ($sectionResult->num_rows === 0) {
  $sectionCheck->close();
  header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=section_not_found'); 
  exit();
}
$sectionCheck->close();

try {
  // Save to database
  $stmt = $conn->prepare("INSERT INTO section_assignments (year, section, building, floor, room) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE building=VALUES(building), floor=VALUES(floor), room=VALUES(room)");
  if (!$stmt) {
    throw new Exception("Failed to prepare statement: " . $conn->error);
  }
  
  $stmt->bind_param('sssis', $year, $sect, $building, $floor, $room);
  if (!$stmt->execute()) {
    throw new Exception("Failed to execute statement: " . $stmt->error);
  }

  // Get the ID of the inserted/updated record
  $insertId = $conn->insert_id;
  if ($insertId == 0) {
    // If it was an update due to duplicate key, fetch the ID
    $fetchStmt = $conn->prepare("SELECT id FROM section_assignments WHERE year = ? AND section = ? LIMIT 1");
    if ($fetchStmt) {
      $fetchStmt->bind_param('ss', $year, $sect);
      $fetchStmt->execute();
      $result = $fetchStmt->get_result();
      if ($row = $result->fetch_assoc()) {
        $insertId = $row['id'];
      }
      $fetchStmt->close();
    }
  }
  
  $stmt->close();

  // Also save to JSON as backup
  $path = __DIR__ . '/../../database/section_assignments.json';
  $data = [];
  if (file_exists($path)) { $data = json_decode(file_get_contents($path), true) ?: []; }
  $key = $year . '|' . $sect;
  $data[$key] = ['id'=>$insertId, 'year'=>$year, 'section'=>$sect, 'building'=>$building, 'floor'=>$floor, 'room'=>$room];
  file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));

  header('Location: /TCC/public/admin_dashboard.php?section=buildings&success=1'); exit();
} catch (Exception $e) {
  error_log("Section assignment error: " . $e->getMessage());
  header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=dberror'); exit();
}
