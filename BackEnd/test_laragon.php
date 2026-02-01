<?php

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Laragon Apache is working!',
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'php_version' => PHP_VERSION,
    'access_method' => 'Laragon Apache (port 80)'
]);
?>
