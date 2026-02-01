<?php

require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/Auth.php';


date_default_timezone_set(TIMEZONE);


$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

if (in_array($origin, $allowed_origins) || APP_ENV === 'development') {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");
}


if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");         
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}


header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Content-Type: application/json; charset=UTF-8");


if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax'); 
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    
    
    ini_set('session.gc_maxlifetime', TOKEN_EXPIRY * 24); 
    session_set_cookie_params([
        'lifetime' => TOKEN_EXPIRY * 24, 
        'path' => '/',
        
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    session_start();
}


if (!isset($_SESSION['rate_limit'])) {
    $_SESSION['rate_limit'] = ['requests' => 0, 'start_time' => time()];
}


if (time() - $_SESSION['rate_limit']['start_time'] > RATE_LIMIT_WINDOW) {
    $_SESSION['rate_limit'] = ['requests' => 0, 'start_time' => time()];
}

$_SESSION['rate_limit']['requests']++;

if ($_SESSION['rate_limit']['requests'] > RATE_LIMIT_REQUESTS) {
    Response::error("Rate limit exceeded. Please try again later.", 429);
}
?>
