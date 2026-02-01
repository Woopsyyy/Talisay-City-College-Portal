<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Response.php';

class Auth {
    
    public static function check() {
        return isset($_SESSION['user_id']);
    }

    
    public static function require($role = null) {
        if (!self::check()) {
            Response::unauthorized('Authentication required');
        }

        if ($role) {
            $userRole = $_SESSION['role'] ?? null;
            if ($userRole !== $role && $userRole !== 'admin') { 
                Response::forbidden('Insufficient permissions');
            }
        }
    }

    public static function userId() {
        return $_SESSION['user_id'] ?? null;
    }

    public static function user() {
        if (!self::check()) return null;
        return [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role' => $_SESSION['role'],
            'full_name' => $_SESSION['full_name']
        ];
    }

    public static function login($user) {
        session_regenerate_id(true); 
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['created_at'] = time();
    }

    public static function logout() {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }

    public static function hashPassword($password) {
        return password_hash($password, HASH_ALGO);
    }

    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
}
?>
