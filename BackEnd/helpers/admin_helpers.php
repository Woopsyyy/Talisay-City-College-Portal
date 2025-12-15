<?php
if (!function_exists('require_admin_post')) {
    function require_admin_post(?string $redirectOnGet = null): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            header('HTTP/1.1 403 Forbidden');
            exit('Forbidden');
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            if ($redirectOnGet) {
                header('Location: ' . $redirectOnGet);
            } else {
                header('HTTP/1.1 405 Method Not Allowed');
            }
            exit();
        }
    }
}

if (!function_exists('ensure_tables')) {
    /**
     * Ensure the provided table creation statements have been executed.
     * Accepts a hash of table name => SQL to improve readability in callers.
     */
    function ensure_tables(mysqli $conn, array $tableDefinitions): void
    {
        foreach ($tableDefinitions as $sql) {
            if ($sql) {
                $conn->query($sql);
            }
        }
    }
}

if (!function_exists('log_audit')) {
    function log_audit(mysqli $conn, string $action, string $table, $targetId, string $details): void
    {
        $adminUser = $_SESSION['username'] ?? 'unknown';
        $idString = is_scalar($targetId) ? (string)$targetId : json_encode($targetId);

        $stmt = $conn->prepare(
            "INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES (?,?,?,?,?)"
        );
        if ($stmt) {
            $stmt->bind_param('sssss', $adminUser, $action, $table, $idString, $details);
            $stmt->execute();
            $stmt->close();
        }
    }
}
