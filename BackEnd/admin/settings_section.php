<?php
require_once __DIR__ . '/../database/db.php';

$conn = Database::getInstance()->getConnection();

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

$projectRoot = dirname(__DIR__, 2);
$backendRoot = dirname(__DIR__);
$backupFolderName = 'backups';
$backupFolderRelative = 'BackEnd/' . $backupFolderName;
$backupFolderFs = $backendRoot . DIRECTORY_SEPARATOR . $backupFolderName;

$settingsRow = [
  'schedule_enabled' => 0,
  'schedule_time' => null,
  'last_backup_at' => null,
  'last_backup_path' => null,
  'last_scheduled_run' => null
];
$settingsRes = $conn->query("SELECT schedule_enabled, schedule_time, last_backup_at, last_backup_path, last_scheduled_run FROM backup_settings WHERE id = 1 LIMIT 1");
if ($settingsRes && $settingsRes->num_rows > 0) {
  $settingsRow = $settingsRes->fetch_assoc();
}

$scheduleEnabled = isset($settingsRow['schedule_enabled']) && (int)$settingsRow['schedule_enabled'] === 1;
$scheduleTimeRaw = $settingsRow['schedule_time'] ?? '';
$scheduleTimeValue = $scheduleTimeRaw ? substr($scheduleTimeRaw, 0, 5) : '';
$lastBackupAt = $settingsRow['last_backup_at'] ?? null;
$lastBackupPath = $settingsRow['last_backup_path'] ?? '';
$lastScheduledRun = $settingsRow['last_scheduled_run'] ?? null;

$lastBackupDownloadUrl = '';
if (!empty($lastBackupPath)) {
  $lastBackupRelative = ltrim(str_replace('\\', '/', $lastBackupPath), '/');
  $lastBackupFs = $projectRoot . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $lastBackupRelative);
  if (file_exists($lastBackupFs)) {
    $lastBackupDownloadUrl = '/TCC/' . str_replace('\\', '/', $lastBackupRelative);
  }
}

if (!is_dir($backupFolderFs)) {
  @mkdir($backupFolderFs, 0775, true);
}
$backupFolderDisplay = realpath($backupFolderFs);
if ($backupFolderDisplay === false) {
  $backupFolderDisplay = $backupFolderFs;
}

$availableBackups = [];
if (is_dir($backupFolderFs)) {
  $backupFiles = glob($backupFolderFs . DIRECTORY_SEPARATOR . '*.sql');
  if ($backupFiles !== false) {
    rsort($backupFiles);
    $backupFiles = array_slice($backupFiles, 0, 5);
    foreach ($backupFiles as $backupFile) {
      $size = @filesize($backupFile);
      $mtime = @filemtime($backupFile);
      $availableBackups[] = [
        'basename' => basename($backupFile),
        'size' => $size !== false ? $size : null,
        'created_at' => $mtime ? date('F j, Y g:i A', $mtime) : 'Unknown',
        'url' => '/TCC/BackEnd/backups/' . rawurlencode(basename($backupFile))
      ];
    }
  }
}

$settingsFeedback = $_SESSION['settings_feedback'] ?? null;
if (isset($_SESSION['settings_feedback'])) {
  unset($_SESSION['settings_feedback']);
}

$formatFilesize = function ($bytes) {
  if ($bytes === null || $bytes === false) {
    return 'Unknown size';
  }
  $units = ['B', 'KB', 'MB', 'GB', 'TB'];
  $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
  $power = min($power, count($units) - 1);
  $size = $bytes / pow(1024, $power);
  return number_format($size, 2) . ' ' . $units[$power];
};
?>
<div class="records-container">
  <div class="records-header">
    <h2 class="records-title">
      <i class="bi bi-gear-fill"></i> Settings
    </h2>
    <p class="records-subtitle">Manage database backups and automation preferences.</p>
  </div>
  <div class="records-main">
    <?php if ($settingsFeedback): ?>
      <div class="alert alert-<?php echo (($settingsFeedback['type'] ?? 'info') === 'success') ? 'success' : 'danger'; ?> alert-dismissible fade show" role="alert">
        <?php echo htmlspecialchars($settingsFeedback['message'] ?? ''); ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    <?php endif; ?>
    <div class="info-card">
      <div class="card-header-modern">
        <i class="bi bi-hdd-stack"></i>
        <h3>Database Backups</h3>
        <p class="text-muted mb-0">Keep a current copy of your records.</p>
      </div>
      <div class="card-body">
        <div class="d-flex flex-column flex-lg-row gap-4">
          <div class="p-4 border rounded-4 bg-light flex-fill h-100">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div>
                <h4 class="mb-1 fs-5">Manual Backup</h4>
                <span class="text-muted small">Capture a snapshot any time.</span>
              </div>
              <i class="bi bi-cloud-arrow-down-fill text-primary fs-4"></i>
            </div>
            <form action="/TCC/BackEnd/admin/backup_settings.php" method="post" class="d-grid gap-3">
              <input type="hidden" name="action" value="manual_backup" />
              <button type="submit" class="btn btn-primary btn-lg">
                <i class="bi bi-play-fill me-2"></i>Run Backup
              </button>
            </form>
            <ul class="list-unstyled mt-4 mb-0 small text-muted">
              <li>
                <i class="bi bi-clock-history me-1"></i>
                Last backup: <?php echo $lastBackupAt ? htmlspecialchars(date('F j, Y g:i A', strtotime($lastBackupAt))) : 'Not yet created'; ?>
              </li>
              <?php if ($lastBackupDownloadUrl): ?>
                <li class="mt-2">
                  <i class="bi bi-download me-1"></i>
                  <a href="<?php echo htmlspecialchars($lastBackupDownloadUrl); ?>" class="link-primary" target="_blank" rel="noopener">Download latest file</a>
                </li>
              <?php endif; ?>
            </ul>
          </div>
          <div class="p-4 border rounded-4 bg-white flex-fill h-100">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div>
                <h4 class="mb-1 fs-5">Scheduled Backup</h4>
                <span class="text-muted small">Run automatically once per day.</span>
              </div>
              <i class="bi bi-alarm text-primary fs-4"></i>
            </div>
            <form action="/TCC/BackEnd/admin/backup_settings.php" method="post" class="d-grid gap-3">
              <input type="hidden" name="action" value="update_schedule" />
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="scheduleEnabledToggle" name="schedule_enabled" value="1" <?php echo $scheduleEnabled ? 'checked' : ''; ?> />
                <label class="form-check-label" for="scheduleEnabledToggle">Enable daily backup</label>
              </div>
              <div>
                <label class="form-label" for="scheduleTimeInput">Backup time</label>
                <input type="time" class="form-control form-control-lg" id="scheduleTimeInput" name="schedule_time" value="<?php echo htmlspecialchars($scheduleTimeValue); ?>" <?php echo $scheduleEnabled ? '' : 'disabled'; ?> />
              </div>
              <button type="submit" class="btn btn-outline-primary btn-lg">
                <i class="bi bi-save me-2"></i>Save Changes
              </button>
              <?php if ($lastScheduledRun): ?>
                <div class="small text-muted">
                  <i class="bi bi-clock me-1"></i>Last automatic run: <?php echo htmlspecialchars(date('F j, Y g:i A', strtotime($lastScheduledRun))); ?>
                </div>
              <?php endif; ?>
            </form>
          </div>
        </div>
        <div class="mt-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h4 class="fs-6 text-uppercase text-muted fw-bold mb-0">Recent Backups</h4>
            <?php if (!empty($availableBackups)): ?>
              <span class="small text-muted">Showing latest <?php echo count($availableBackups); ?></span>
            <?php endif; ?>
          </div>
          <?php if (empty($availableBackups)): ?>
            <p class="text-muted mb-0">No backups yet.</p>
          <?php else: ?>
            <ul class="list-group list-group-flush border rounded-4 overflow-hidden">
              <?php foreach ($availableBackups as $backupInfo): ?>
                <li class="list-group-item d-flex align-items-center justify-content-between flex-column flex-md-row gap-2">
                  <div>
                    <span class="fw-semibold d-block"><?php echo htmlspecialchars($backupInfo['basename']); ?></span>
                    <span class="text-muted small"><?php echo htmlspecialchars($backupInfo['created_at']); ?> · <?php echo htmlspecialchars($formatFilesize($backupInfo['size'])); ?></span>
                  </div>
                  <a href="<?php echo htmlspecialchars($backupInfo['url']); ?>" class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener">
                    <i class="bi bi-box-arrow-in-down"></i> Download
                  </a>
                </li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    const toggle = document.getElementById('scheduleEnabledToggle');
    const timeInput = document.getElementById('scheduleTimeInput');
    if (!toggle || !timeInput) {
      return;
    }
    const sync = () => {
      const isChecked = toggle.checked;
      timeInput.disabled = !isChecked;
      if (!isChecked) {
        timeInput.setAttribute('aria-disabled', 'true');
      } else {
        timeInput.removeAttribute('aria-disabled');
      }
    };
    toggle.addEventListener('change', sync);
    sync();
  })();
</script>
