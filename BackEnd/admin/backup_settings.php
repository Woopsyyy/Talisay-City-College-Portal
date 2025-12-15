<?php
declare(strict_types=1);

session_start();

if (!isset($_SESSION['username']) || ($_SESSION['role'] ?? '') !== 'admin') {
    if (php_sapi_name() === 'cli') {
        fwrite(STDERR, "Unauthorized\n");
    } else {
        http_response_code(403);
        echo 'Unauthorized';
    }
    exit();
}

require_once __DIR__ . '/../database/db.php';

$conn = Database::getInstance()->getConnection();
set_time_limit(0);

ensureBackupSettingsTable($conn);

$backupFolderRelative = 'BackEnd/backups';
$backendRoot = dirname(__DIR__);
$backupFolderName = 'backups';
$backupFolderRelative = 'BackEnd/' . $backupFolderName;
$backupFolderFs = $backendRoot . DIRECTORY_SEPARATOR . $backupFolderName;
if (!is_dir($backupFolderFs) && !mkdir($backupFolderFs, 0775, true) && !is_dir($backupFolderFs)) {
    handleRedirect('error', 'Unable to create backup directory. Please check folder permissions.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'manual_backup':
        try {
            $result = createDatabaseBackup($conn, $backupFolderFs);
            $relativePath = $backupFolderRelative . '/' . $result['filename'];
            updateBackupMetadata($conn, $relativePath, false);
            handleRedirect('success', 'Backup created successfully: ' . $result['filename']);
        } catch (Throwable $th) {
            handleRedirect('error', 'Backup failed: ' . $th->getMessage());
        }
        break;

    case 'update_schedule':
        $scheduleEnabled = isset($_POST['schedule_enabled']) ? 1 : 0;
        $scheduleTime = trim($_POST['schedule_time'] ?? '');
        if ($scheduleEnabled && !preg_match('/^(?:[01]\\d|2[0-3]):[0-5]\\d$/', $scheduleTime)) {
            handleRedirect('error', 'Please provide a valid backup time (HH:MM).');
        }
        $scheduleTimeStore = $scheduleEnabled ? ($scheduleTime . ':00') : null;

        try {
            if ($scheduleTimeStore === null) {
                $stmt = $conn->prepare("UPDATE backup_settings SET schedule_enabled = ?, schedule_time = NULL, last_scheduled_run = NULL, updated_at = NOW() WHERE id = 1");
                $stmt->bind_param('i', $scheduleEnabled);
            } else {
                $stmt = $conn->prepare("UPDATE backup_settings SET schedule_enabled = ?, schedule_time = ?, updated_at = NOW() WHERE id = 1");
                $stmt->bind_param('is', $scheduleEnabled, $scheduleTimeStore);
            }

            if (!$stmt || !$stmt->execute()) {
                throw new RuntimeException('Failed to update schedule preferences.');
            }

            handleRedirect('success', 'Backup schedule updated.');
        } catch (Throwable $th) {
            handleRedirect('error', 'Unable to update schedule: ' . $th->getMessage());
        }
        break;

    case 'run_schedule':
        $settings = fetchBackupSettings($conn);
        if (empty($settings) || (int)($settings['schedule_enabled'] ?? 0) !== 1) {
            respondJson(['status' => 'skipped', 'message' => 'Scheduling is disabled.']);
        }
        if (empty($settings['schedule_time'])) {
            respondJson(['status' => 'skipped', 'message' => 'No schedule time configured.']);
        }

        try {
            $result = createDatabaseBackup($conn, $backupFolderFs);
            $relativePath = $backupFolderRelative . '/' . $result['filename'];
            updateBackupMetadata($conn, $relativePath, true);
            respondJson(['status' => 'success', 'message' => 'Backup created.', 'filename' => $result['filename']]);
        } catch (Throwable $th) {
            respondJson(['status' => 'error', 'message' => $th->getMessage()], 500);
        }
        break;

    default:
        handleRedirect('error', 'Unknown action.');
}

function handleRedirect(string $type, string $message): void
{
    $_SESSION['settings_feedback'] = [
        'type' => $type,
        'message' => $message,
    ];
    header('Location: /TCC/public/admin_dashboard.php?section=settings');
    exit();
}

function respondJson(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit();
}

function ensureBackupSettingsTable(mysqli $conn): void
{
    $conn->query("CREATE TABLE IF NOT EXISTS backup_settings (
      id TINYINT UNSIGNED PRIMARY KEY,
      schedule_enabled TINYINT(1) NOT NULL DEFAULT 0,
      schedule_time TIME NULL,
      last_backup_at DATETIME NULL,
      last_backup_path VARCHAR(255) NULL,
      last_scheduled_run DATETIME NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $conn->query("INSERT IGNORE INTO backup_settings (id, schedule_enabled) VALUES (1, 0)");
    $columnCheck = $conn->query("SHOW COLUMNS FROM backup_settings LIKE 'last_scheduled_run'");
    if ($columnCheck && $columnCheck->num_rows === 0) {
        $conn->query("ALTER TABLE backup_settings ADD COLUMN last_scheduled_run DATETIME NULL AFTER last_backup_path");
    }
}

function fetchBackupSettings(mysqli $conn): array
{
    $result = $conn->query("SELECT schedule_enabled, schedule_time FROM backup_settings WHERE id = 1 LIMIT 1");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }

    return [];
}

function updateBackupMetadata(mysqli $conn, string $relativePath, bool $scheduledRun): void
{
    if ($scheduledRun) {
        $stmt = $conn->prepare("UPDATE backup_settings SET last_backup_at = NOW(), last_backup_path = ?, last_scheduled_run = NOW(), updated_at = NOW() WHERE id = 1");
    } else {
        $stmt = $conn->prepare("UPDATE backup_settings SET last_backup_at = NOW(), last_backup_path = ?, updated_at = NOW() WHERE id = 1");
    }

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare metadata update statement.');
    }

    $stmt->bind_param('s', $relativePath);
    if (!$stmt->execute()) {
        throw new RuntimeException('Failed to update backup metadata.');
    }
}

function createDatabaseBackup(mysqli $conn, string $storageDir): array
{
    if (!is_dir($storageDir)) {
        throw new RuntimeException('Backup directory does not exist.');
    }
    if (!is_writable($storageDir)) {
        throw new RuntimeException('Backup directory is not writable.');
    }

    $timestamp = date('Ymd_His');
    $filename = 'accountmanager_backup_' . $timestamp . '.sql';
    $filepath = rtrim($storageDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;

    $databaseResult = $conn->query('SELECT DATABASE() AS db');
    $databaseRow = $databaseResult ? $databaseResult->fetch_assoc() : null;
    $databaseName = $databaseRow['db'] ?? 'accountmanager';

    $sqlChunks = [];
    $sqlChunks[] = '-- Database backup generated on ' . date('c');
    $sqlChunks[] = '-- Database: ' . $databaseName;
    $sqlChunks[] = 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";';
    $sqlChunks[] = 'SET time_zone = "+00:00";';
    $sqlChunks[] = 'SET FOREIGN_KEY_CHECKS=0;';
    $sqlChunks[] = '';

    $tablesResult = $conn->query('SHOW TABLES');
    if ($tablesResult === false) {
        throw new RuntimeException('Unable to retrieve table list: ' . $conn->error);
    }

    while ($tableRow = $tablesResult->fetch_array(MYSQLI_NUM)) {
        $tableName = $tableRow[0];
        $sqlChunks[] = '-- -------------------------------------------';
        $sqlChunks[] = '-- Table structure for `' . $tableName . '`';

        $createResult = $conn->query("SHOW CREATE TABLE `{$tableName}`");
        if ($createResult === false) {
            throw new RuntimeException('Unable to fetch schema for table ' . $tableName . ': ' . $conn->error);
        }
        $createRow = $createResult->fetch_assoc();
        $sqlChunks[] = 'DROP TABLE IF EXISTS `' . $tableName . '`;';
        $sqlChunks[] = $createRow['Create Table'] . ';';
        $sqlChunks[] = '';
        $createResult->free();

        $dataResult = $conn->query("SELECT * FROM `{$tableName}`");
        if ($dataResult === false) {
            throw new RuntimeException('Unable to fetch data for table ' . $tableName . ': ' . $conn->error);
        }

        if ($dataResult->num_rows > 0) {
            $fields = $dataResult->fetch_fields();
            $columns = array_map(static fn($field) => '`' . $field->name . '`', $fields);
            $batch = [];
            $batchSize = 0;
            $chunkLimit = 100;

            while ($row = $dataResult->fetch_assoc()) {
                $values = [];
                foreach ($fields as $field) {
                    $value = $row[$field->name] ?? null;
                    if ($value === null) {
                        $values[] = 'NULL';
                    } else {
                        $values[] = "'" . $conn->real_escape_string((string)$value) . "'";
                    }
                }
                $batch[] = '(' . implode(', ', $values) . ')';
                $batchSize++;

                if ($batchSize >= $chunkLimit) {
                    $sqlChunks[] = 'INSERT INTO `' . $tableName . '` (' . implode(', ', $columns) . ') VALUES';
                    $sqlChunks[] = implode(",\n", $batch) . ';';
                    $sqlChunks[] = '';
                    $batch = [];
                    $batchSize = 0;
                }
            }

            if (!empty($batch)) {
                $sqlChunks[] = 'INSERT INTO `' . $tableName . '` (' . implode(', ', $columns) . ') VALUES';
                $sqlChunks[] = implode(",\n", $batch) . ';';
                $sqlChunks[] = '';
            }
        }

        $dataResult->free();
    }

    $sqlChunks[] = 'SET FOREIGN_KEY_CHECKS=1;';
    $sqlChunks[] = '-- Backup completed on ' . date('c');

    $sqlContent = implode(PHP_EOL, $sqlChunks) . PHP_EOL;
    if (file_put_contents($filepath, $sqlContent) === false) {
        throw new RuntimeException('Failed to write backup file to disk.');
    }

    return [
        'filename' => $filename,
        'path' => $filepath,
    ];
}
