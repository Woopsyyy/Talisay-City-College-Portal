<?php
require_once __DIR__ . '/../helpers/admin_helpers.php';
require_admin_post('/TCC/public/admin_dashboard.php?section=projects');

$action = $_POST['action'] ?? 'create';

$path = __DIR__ . '/../../database/projects.json';
$list = [];
if (file_exists($path)) { $list = json_decode(file_get_contents($path), true) ?: []; }

if ($action === 'delete') {
  $index = isset($_POST['index']) ? intval($_POST['index']) : -1;
  if ($index >= 0 && $index < count($list)) {
    array_splice($list, $index, 1);
    file_put_contents($path, json_encode($list, JSON_PRETTY_PRINT));
    header('Location: /TCC/public/admin_dashboard.php?section=projects&success=deleted'); exit();
  } else {
    header('Location: /TCC/public/admin_dashboard.php?section=projects&error=invalid_index'); exit();
  }
}

// Create action
$name = trim($_POST['name'] ?? '');
$budget = trim($_POST['budget'] ?? '');
$started = $_POST['started'] ?? '';
$completed = $_POST['completed'] ?? 'no';

if ($name === '' || $budget === '' || $started === '') { header('Location: /TCC/public/admin_dashboard.php?section=projects&error=missing'); exit(); }

$entry = ['name'=>$name, 'budget'=>$budget, 'started'=>$started, 'completed'=>$completed];
array_push($list, $entry);
file_put_contents($path, json_encode($list, JSON_PRETTY_PRINT));

header('Location: /TCC/public/admin_dashboard.php?section=projects&success=1'); exit();
