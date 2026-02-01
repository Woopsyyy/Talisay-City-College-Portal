<?php

require_once __DIR__ . '/../../config/header.php';







Auth::require('admin');
$db = Database::connect();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::methodNotAllowed();
}

$input = json_decode(file_get_contents('php://input'), true);

$validator = new Validator($input);

if (!$validator->validate(['username' => 'required|string'])) {
    Response::validationError($validator->errors());
}

$username = $input['username'];

try {
    
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        
        
        Response::notFound("User with username '$username' not found.");
    }

    
    
    $randomStr = bin2hex(random_bytes(4)); 
    $newPassword = "TCC-" . $randomStr; 

    
    $hashedPassword = Auth::hashPassword($newPassword);

    
    $update = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update->execute([$hashedPassword, $user['id']]);

    
    Response::success([
        'username' => $username,
        'new_password' => $newPassword,
        'note' => 'Please share this credentials securely with the user.'
    ], "Password reset successfully.");

} catch (Exception $e) {
    Response::error("Reset password failed: " . $e->getMessage(), 500);
}
?>
