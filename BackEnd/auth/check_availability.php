<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../database/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

type: $_POST['type'] ?? null; // poor man's annotation
$checkType = $_POST['type'] ?? null;
$value = trim($_POST['value'] ?? '');

if (!$checkType || $value === '') {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit();
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    if ($checkType === 'username') {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
        $stmt->bind_param('s', $value);
        $stmt->execute();
        $res = $stmt->get_result();
        $available = ($res->num_rows === 0);
        echo json_encode(['success' => true, 'available' => $available]);
        exit();
    } elseif ($checkType === 'full_name') {
        $stmt = $conn->prepare("SELECT id FROM users WHERE full_name = ? LIMIT 1");
        $stmt->bind_param('s', $value);
        $stmt->execute();
        $res = $stmt->get_result();
        $available = ($res->num_rows === 0);
        echo json_encode(['success' => true, 'available' => $available]);
        exit();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid check type']);
        exit();
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error']);
    exit();
}
