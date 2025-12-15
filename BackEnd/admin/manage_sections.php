<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=sections');

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

ensure_tables($conn, [
  'sections' => "CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_year_name (year, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
]);

$action = $_POST['action'] ?? 'create';

if ($action === 'delete') {
  // Delete section
  $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
  if ($id <= 0) { 
    header('Location: /TCC/public/admin_dashboard.php?section=sections&error=invalid_id'); 
    exit(); 
  }
  
  // Get section info for audit log
  $sel = $conn->prepare("SELECT year, name FROM sections WHERE id = ? LIMIT 1");
  $sel->bind_param('i', $id);
  $sel->execute();
  $res = $sel->get_result();
  $sectionInfo = $res->fetch_assoc();
  $sel->close();
  
  // Delete the section
  $stmt = $conn->prepare("DELETE FROM sections WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $stmt->close();
  
  $details = "deleted section: " . ($sectionInfo['name'] ?? 'unknown') . " (Year: " . ($sectionInfo['year'] ?? '') . ")";
  log_audit($conn, 'delete', 'sections', $id, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=sections&success=deleted'); 
  exit();
  
} else if ($action === 'update') {
  // Update existing section
  $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
  $year = trim($_POST['year'] ?? '');
  $name = trim($_POST['name'] ?? '');
  
  if ($id <= 0 || $year === '' || $name === '') { 
    header('Location: /TCC/public/admin_dashboard.php?section=sections&error=missing'); 
    exit();
  }
  
  // Check for duplicate (excluding current record)
  $check = $conn->prepare("SELECT id FROM sections WHERE year = ? AND name = ? AND id != ? LIMIT 1");
  $check->bind_param('ssi', $year, $name, $id);
  $check->execute();
  $checkRes = $check->get_result();
  if ($checkRes->num_rows > 0) {
    $check->close();
    header('Location: /TCC/public/admin_dashboard.php?section=sections&error=duplicate'); 
    exit();
  }
  $check->close();
  
  // Update section
  $stmt = $conn->prepare("UPDATE sections SET year = ?, name = ? WHERE id = ?");
  $stmt->bind_param('ssi', $year, $name, $id);
  $stmt->execute();
  $stmt->close();
  
  $details = "updated section: " . $name . " (Year: " . $year . ")";
  log_audit($conn, 'update', 'sections', $id, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=sections&success=updated'); 
  exit();
  
} else {
  // Create new section
  $year = trim($_POST['year'] ?? '');
  $name = trim($_POST['name'] ?? '');
  
  if ($year === '' || $name === '') { 
    header('Location: /TCC/public/admin_dashboard.php?section=sections&error=missing'); 
    exit();
  }
  
  // Check for duplicate
  $check = $conn->prepare("SELECT id FROM sections WHERE year = ? AND name = ? LIMIT 1");
  $check->bind_param('ss', $year, $name);
  $check->execute();
  $checkRes = $check->get_result();
  if ($checkRes->num_rows > 0) {
    $check->close();
    header('Location: /TCC/public/admin_dashboard.php?section=sections&error=duplicate'); 
    exit();
  }
  $check->close();
  
  // Insert section
  $stmt = $conn->prepare("INSERT INTO sections (year, name) VALUES (?, ?)");
  $stmt->bind_param('ss', $year, $name);
  $stmt->execute();
  $newId = $conn->insert_id;
  $stmt->close();
  
  $details = "created section: " . $name . " (Year: " . $year . ")";
  log_audit($conn, 'create', 'sections', $newId, $details);
  
  header('Location: /TCC/public/admin_dashboard.php?section=sections&success=created'); 
  exit();
}
?>

