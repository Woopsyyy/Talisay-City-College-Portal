<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../database/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /TCC/public/settings.php');
    exit();
}

$conn = Database::getInstance()->getConnection();

if (!isset($_SESSION['user_id'])) {
    header('Location: /TCC/public/index.html');
    exit();
}

$userId = $_SESSION['user_id'];

$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';

if (empty($username) || empty($full_name)) {
    header('Location: /TCC/public/settings.php?error=missing');
    exit();
}

// check duplicates (username or full_name) excluding current user
$sql = "SELECT id FROM users WHERE (username = ? OR full_name = ?) AND id != ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ssi', $username, $full_name, $userId);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
    header('Location: /TCC/public/settings.php?error=duplicate');
    exit();
}

$fields = [];
$types = '';
$values = [];

$fields[] = 'username = ?'; $types .= 's'; $values[] = $username;
$fields[] = 'full_name = ?'; $types .= 's'; $values[] = $full_name;

if (!empty($password)) {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $fields[] = 'password = ?'; $types .= 's'; $values[] = $hash;
}

// handle profile picture upload
if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = rtrim($_SERVER['DOCUMENT_ROOT'], DIRECTORY_SEPARATOR) . "/TCC/database/pictures/";
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $tmp = $_FILES['profile_image']['tmp_name'];
    $orig = basename($_FILES['profile_image']['name']);
    $ext = pathinfo($orig, PATHINFO_EXTENSION);
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($full_name));
    $filename = $safe . '_' . time() . '.' . $ext;
    $dest = $uploadDir . $filename;

    if (move_uploaded_file($tmp, $dest)) {
        $webPath = '/TCC/database/pictures/' . $filename;
        $fields[] = 'image_path = ?'; $types .= 's'; $values[] = $webPath;
    }
}

// build update statement
$types .= 'i'; // for where id
$values[] = $userId;

$sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ? LIMIT 1';
$stmt = $conn->prepare($sql);

// bind parameters dynamically
$bindNames = [];
$bindNames[] = &$types;
for ($i = 0; $i < count($values); $i++) {
    $bindNames[] = &$values[$i];
}
call_user_func_array([$stmt, 'bind_param'], $bindNames);

if ($stmt->execute()) {
    // update session values
    $_SESSION['username'] = $username;
    $_SESSION['full_name'] = $full_name;
    if (isset($webPath)) $_SESSION['image_path'] = $webPath;
    header('Location: /TCC/public/settings.php?success=1');
    exit();
} else {
    header('Location: /TCC/public/settings.php?error=update');
    exit();
}

?>
