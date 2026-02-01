<?php


$apiDir = __DIR__ . '/../api';
$baseUrl = 'http://localhost:8000/api';

function getPhpFiles($dir) {
    $results = [];
    $files = scandir($dir);
    foreach ($files as $key => $value) {
        if (!in_array($value, [".", ".."])) {
            $path = $dir . DIRECTORY_SEPARATOR . $value;
            if (is_dir($path)) {
                $results = array_merge($results, getPhpFiles($path));
            } else {
                if (pathinfo($path, PATHINFO_EXTENSION) === 'php') {
                    $results[] = $path;
                }
            }
        }
    }
    return $results;
}

$files = getPhpFiles($apiDir);
$endpoints = [];

foreach ($files as $file) {
    if (basename($file) === 'simple_test.php' || basename($file) === 'simple_mysql_test.php') continue;

    $content = file_get_contents($file);
    $relativePath = str_replace($apiDir, '', $file);
    $relativePath = str_replace('\\', '/', $relativePath);
    $endpointPath = $baseUrl . substr($relativePath, 0, -4); 

    
    
    
    
    
    $methods = [];
    if (preg_match("/case 'GET':/i", $content)) $methods[] = 'GET';
    if (preg_match("/case 'POST':/i", $content)) $methods[] = 'POST';
    if (preg_match("/case 'PUT':/i", $content)) $methods[] = 'PUT';
    if (preg_match("/case 'DELETE':/i", $content)) $methods[] = 'DELETE';
    
    
    if (empty($methods)) {
        if (basename($file) === 'login.php') $methods[] = 'POST';
        elseif (basename($file) === 'signup.php') $methods[] = 'POST';
        elseif (basename($file) === 'logout.php') $methods[] = 'POST';
        elseif (basename($file) === 'check.php') $methods[] = 'GET';
        elseif (basename($file) === 'update-profile.php') $methods[] = 'POST';
        elseif (basename($file) === 'reset-password.php') $methods[] = 'POST';
        else $methods[] = 'GET'; 
    }

    $endpoints[] = [
        'path' => $endpointPath,
        'methods' => array_unique($methods)
    ];
}

echo "# API Endpoints for Postman\n\n";
echo "Base URL: `$baseUrl`\n\n";
echo "| Method | Endpoint | Description |\n";
echo "|--------|----------|-------------|\n";

foreach ($endpoints as $ep) {
    $methods = implode(', ', $ep['methods']);
    $url = $ep['path'];
    $desc = "Manage " . basename($url);
    
    
    if (strpos($url, 'auth/login')) $desc = "User Login";
    if (strpos($url, 'auth/signup')) $desc = "User Registration";
    if (strpos($url, 'auth/check')) $desc = "Check Session";
    
    echo "| **$methods** | `$url` | $desc |\n";
}

echo "\n\n## Postman Collection Import\n";
echo "You can manually add these to Postman. Ensure you set `Content-Type: application/json` header.\n";
?>
