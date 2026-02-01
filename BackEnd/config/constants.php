<?php



define('APP_ENV', 'development'); 
define('APP_DEBUG', true);
define('TIMEZONE', 'Asia/Manila');


define('DB_HOST', 'localhost');
define('DB_NAME', 'tccportal');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');


define('HASH_ALGO', PASSWORD_ARGON2ID);
define('TOKEN_EXPIRY', 3600); 
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME', 900); 


define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); 
define('ALLOWED_FILE_TYPES', [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
define('UPLOAD_DIR', __DIR__ . '/../public/uploads/');


define('RATE_LIMIT_REQUESTS', 60); 
define('RATE_LIMIT_WINDOW', 60);   


define('GRADE_LEVELS', ['7', '8', '9', '10', '11', '12']);
define('USER_ROLES', ['admin', 'teacher', 'student', 'go']);
define('DEFAULT_PASSWORD', 'TCC_Student123'); 
?>
