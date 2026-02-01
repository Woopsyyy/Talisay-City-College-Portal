<?php
// cleanup.php
// Script to remove comments from PHP, JS, JSX, CSS files.

$extensions = ['php', 'js', 'jsx', 'css'];
$dirs = [
    __DIR__ . '/BackEnd',
    __DIR__ . '/FrontEnd/src'
];

function removePhpComments($source) {
    if (!function_exists('token_get_all')) return $source;
    $tokens = token_get_all($source);
    $output = '';
    foreach ($tokens as $token) {
        if (is_array($token)) {
            if ($token[0] === T_COMMENT || $token[0] === T_DOC_COMMENT) {
                // Skip comment
                // Preserve newline if it was a line comment to prevent syntax errors?
                // Usually T_COMMENT includes newline if it's // or #? No.
                // We'll just skip.
                continue;
            }
            $output .= $token[1];
        } else {
            $output .= $token;
        }
    }
    return $output;
}

function removeJsComments($source) {
    // Regex to match strings (", ', `) OR comments (//, /* */)
    // Group 1: Strings (preserved)
    // Group 2: Comments (stripped)
    $pattern = '/((?:"(?:[^"\\\\]|\\\.)*"|\'(?:[^\'\\\\]|\\\.)*\'|`(?:[^`\\\\]|\\\.)*`))|(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/';
    return preg_replace_callback($pattern, function($matches) {
        if (!empty($matches[1])) {
            return $matches[1]; // Return string as is
        }
        return ''; // Remove comment
    }, $source);
}

function removeCssComments($source) {
    // CSS only has /* */. Strings are " or '.
    $pattern = '/((?:"(?:[^"\\\\]|\\\.)*"|\'(?:[^\'\\\\]|\\\.)*\'))|(\/\*[\s\S]*?\*\/)/';
    return preg_replace_callback($pattern, function($matches) {
        if (!empty($matches[1])) {
            return $matches[1]; 
        }
        return ''; 
    }, $source);
}

function processUrl($dir) {
    global $extensions;
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($files as $file) {
        if ($file->isDir()) continue;
        
        $ext = strtolower($file->getExtension());
        // Skip node_modules, vendor, .git
        if (strpos($file->getPathname(), 'node_modules') !== false) continue;
        if (strpos($file->getPathname(), 'vendor') !== false) continue;
        if (strpos($file->getPathname(), '.git') !== false) continue;

        if (in_array($ext, $extensions)) {
            echo "Processing: " . $file->getPathname() . "\n";
            $content = file_get_contents($file->getPathname());
            $newContent = $content;
            
            if ($ext === 'php') {
                $newContent = removePhpComments($content);
            } elseif ($ext === 'js' || $ext === 'jsx') {
                $newContent = removeJsComments($content);
            } elseif ($ext === 'css') {
                $newContent = removeCssComments($content);
            }
            
            // Only write if changed
            if ($newContent !== $content) {
                // file_put_contents($file->getPathname(), $newContent); // DANGER: Testing first!
                // We will overwrite.
                file_put_contents($file->getPathname(), $newContent);
                echo "  Comments removed.\n";
            }
        }
    }
}

foreach ($dirs as $dir) {
    if (is_dir($dir)) {
        processUrl($dir);
    } else {
        echo "Directory not found: $dir\n";
    }
}
echo "Cleanup Complete.\n";
?>
