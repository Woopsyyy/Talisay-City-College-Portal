<?php

require_once __DIR__ . '/../../../config/header.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/Response.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}






echo json_encode(['teachers' => []]);
?>
