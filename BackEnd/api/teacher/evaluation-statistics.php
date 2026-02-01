<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Response.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    Response::unauthorized();
}

try {
    
    $stats = [
        'average_rating' => 0,
        'total_evaluations' => 0,
        'comments' => []
    ];
    echo json_encode($stats);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
