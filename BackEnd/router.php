<?php


$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);


if (file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false; 
}







$apiPos = strpos($uri, '/api/');
if ($apiPos !== false) {
    
    $relativePath = substr($uri, $apiPos); 
    
    
    $script = __DIR__ . $relativePath . '.php';
    if (file_exists($script)) {
        require $script;
        return;
    }
    
    
    $pathParts = explode('/', ltrim($relativePath, '/')); 
    
    
    
    $currentPath = '';
    $pathInfo = '';
    
    
    
    
    
    
    
    
    $parts = explode('/', $relativePath); 
    
    $parts = array_values(array_filter($parts)); 
    
    for ($i = count($parts); $i > 0; $i--) {
        $candidatePath = '/' . implode('/', array_slice($parts, 0, $i));
        $candidateScript = __DIR__ . $candidatePath . '.php';
        
        if (file_exists($candidateScript)) {
            
            
            $remaining = array_slice($parts, $i);
            if (!empty($remaining)) {
                $_SERVER['PATH_INFO'] = '/' . implode('/', $remaining);
            } else {
                $_SERVER['PATH_INFO'] = '';
            }
            
            require $candidateScript;
            return;
        }
    }
}


http_response_code(404);
echo json_encode(['error' => 'Route not found: ' . $uri]);
?>
