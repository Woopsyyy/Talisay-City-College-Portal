<?php

require_once __DIR__ . '/../../config/header.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    $pdo = Database::connect();
    $query = $_GET['q'] ?? '';
    
    if (strlen($query) < 2) {
        echo json_encode([]);
        exit;
    }
    
    $searchTerm = '%' . $query . '%';
    $stmt = $pdo->prepare("
        SELECT id, username, full_name, email, role
        FROM users
        WHERE (username LIKE ? OR full_name LIKE ? OR email LIKE ?)
        AND role IN ('student', 'teacher')
        ORDER BY full_name
        LIMIT 10
    ");
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
