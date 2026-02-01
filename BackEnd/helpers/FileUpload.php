<?php

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/Response.php';

class FileUpload {
    
    public static function upload($file, $subDir = '') {
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("File upload failed with error code " . $file['error']);
        }

        
        if ($file['size'] > UPLOAD_MAX_SIZE) {
            throw new Exception("File exceeds maximum allowed size of " . (UPLOAD_MAX_SIZE / 1024 / 1024) . "MB");
        }

        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, ALLOWED_FILE_TYPES)) {
            throw new Exception("File type not allowed. Allowed: " . implode(', ', ALLOWED_FILE_TYPES));
        }

        
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $basename = bin2hex(random_bytes(10)); 
        $filename = sprintf('%s.%0.8s', $basename, $extension);

        
        $targetDir = UPLOAD_DIR . $subDir;
        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                 throw new Exception("Failed to create upload directory");
            }
        }

        $targetPath = $targetDir . '/' . $filename;

        
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new Exception("Failed to move uploaded file");
        }

        
        return '/uploads/' . ($subDir ? $subDir . '/' : '') . $filename;
    }

    
    public static function delete($relativePath) {
        $path = __DIR__ . '/../public' . $relativePath;
        if (file_exists($path)) {
            unlink($path);
            return true;
        }
        return false;
    }
}
?>
