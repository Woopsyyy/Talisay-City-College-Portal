<?php
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/response.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = Database::getInstance();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $backupsDir = __DIR__ . '/../../backups';
        if (!file_exists($backupsDir)) {
            mkdir($backupsDir, 0755, true);
        }

        $timestamp = date('Y-m-d_H-i-s');
        $filename = "backup_{$timestamp}.sql";
        $filepath = $backupsDir . '/' . $filename;

        // Use constants from config/constants.php (already loaded via database.php)
        $host = DB_HOST;
        $dbname = DB_NAME;
        $user = DB_USER;
        $password = DB_PASS;

        // Create temporary MySQL config file for secure password handling
        $tmpConfigFile = tempnam(sys_get_temp_dir(), 'mysql_');
        $configContent = "[client]\nuser={$user}\npassword=\"{$password}\"\nhost={$host}\n";
        file_put_contents($tmpConfigFile, $configContent);
        chmod($tmpConfigFile, 0600);

        // Use mysqldump with the config file
        $command = sprintf(
            'mysqldump --defaults-extra-file="%s" --single-transaction --routines --triggers %s > "%s" 2>&1',
            $tmpConfigFile,
            escapeshellarg($dbname),
            $filepath
        );

        exec($command, $output, $returnCode);
        
        // Clean up temp config file
        unlink($tmpConfigFile);

        if ($returnCode === 0 && file_exists($filepath) && filesize($filepath) > 0) {
            $filesize = filesize($filepath);
            Response::success([
                'message' => 'Database backup created successfully',
                'filename' => $filename,
                'size' => $filesize,
                'timestamp' => $timestamp,
                'path' => 'backups/' . $filename
            ]);
        } else {
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            $errorMsg = !empty($output) ? implode("\n", $output) : 'Unknown error';
            Response::error('Backup failed: ' . $errorMsg, 500);
        }
    } elseif ($method === 'GET') {
        $backupsDir = __DIR__ . '/../../backups';
        if (!file_exists($backupsDir)) {
            Response::success([
                'backups' => [],
                'total' => 0
            ]);
            exit;
        }

        $files = array_diff(scandir($backupsDir), ['.', '..']);
        $backups = [];

        foreach ($files as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
                $filepath = $backupsDir . '/' . $file;
                $backups[] = [
                    'filename' => $file,
                    'size' => filesize($filepath),
                    'created' => filemtime($filepath),
                    'path' => 'backups/' . $file
                ];
            }
        }

        usort($backups, function($a, $b) {
            return $b['created'] - $a['created'];
        });

        Response::success([
            'backups' => $backups,
            'total' => count($backups)
        ]);
    } else {
        Response::error("Method not allowed", 405);
    }
} catch (Exception $e) {
    Response::error("Server error: " . $e->getMessage(), 500);
}
