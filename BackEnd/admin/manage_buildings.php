<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=buildings');

$action = $_POST['action'] ?? 'create';
$building = strtoupper(trim($_POST['building'] ?? ''));

if ($action === 'delete') {
  // Delete building
  if ($building === '') { header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=missing'); exit(); }
  
  $path = __DIR__ . '/../../database/buildings.json';
  $data = [];
  if (file_exists($path)) { $data = json_decode(file_get_contents($path), true) ?: []; }
  
  if (isset($data[$building])) {
    unset($data[$building]);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
    header('Location: /TCC/public/admin_dashboard.php?section=buildings&success=deleted'); exit();
  } else {
    header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=notfound'); exit();
  }
}

// Default: Create/Update building
$floors = intval($_POST['floors'] ?? 4);
$rooms = intval($_POST['rooms'] ?? 4);

if ($building === '') { header('Location: /TCC/public/admin_dashboard.php?section=buildings&error=missing'); exit(); }

$path = __DIR__ . '/../../database/buildings.json';
$data = [];
if (file_exists($path)) { $data = json_decode(file_get_contents($path), true) ?: []; }

$data[$building] = ['floors'=>$floors, 'rooms'=>$rooms];
file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));

header('Location: /TCC/public/admin_dashboard.php?section=buildings&success=1'); exit();
