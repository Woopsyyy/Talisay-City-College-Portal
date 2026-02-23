import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  HardDrive,
  Image as ImageIcon,
  Info,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import Toast from "../../common/Toast";
import { AdminAPI } from "../../../services/api";

type ToastType = "success" | "error" | "info" | "warning";

type AnyRecord = Record<string, any>;

const formatBytes = (bytes: number) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const dateInputValue = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const SettingsView = () => {
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: "",
    type: "success",
  });

  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [pictureResult, setPictureResult] = useState<AnyRecord | null>(null);
  const [storageResult, setStorageResult] = useState<AnyRecord | null>(null);
  const [dbResult, setDbResult] = useState<AnyRecord | null>(null);
  const [suiteResult, setSuiteResult] = useState<AnyRecord | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<AnyRecord | null>(null);

  const [clearLogsFrom, setClearLogsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return dateInputValue(d);
  });
  const [clearLogsTo, setClearLogsTo] = useState(() => dateInputValue(new Date()));
  const [clearLogsCategory, setClearLogsCategory] = useState("");
  const [clearLogsResult, setClearLogsResult] = useState<AnyRecord | null>(null);

  const [backups, setBackups] = useState<AnyRecord[]>([]);
  const [backupResult, setBackupResult] = useState<AnyRecord | null>(null);
  const [restorePath, setRestorePath] = useState("");
  const [restoreGraceDays, setRestoreGraceDays] = useState("30");
  const [restoreResult, setRestoreResult] = useState<AnyRecord | null>(null);

  const [largeThresholdMb, setLargeThresholdMb] = useState("5");
  const [spikeThresholdMb, setSpikeThresholdMb] = useState("100");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleDay, setScheduleDay] = useState("monday");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [schedulerResult, setSchedulerResult] = useState<AnyRecord | null>(null);
  const [reportResult, setReportResult] = useState<AnyRecord | null>(null);

  const setLoading = (key: string, value: boolean) => {
    setBusy((prev) => ({ ...prev, [key]: value }));
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    setLoading(key, true);
    try {
      await action();
    } catch (error: any) {
      showToast(error?.message || "Operation failed.", "error");
    } finally {
      setLoading(key, false);
    }
  };

  const loadBackups = async () => {
    const rows = await AdminAPI.getBackups();
    setBackups(Array.isArray(rows) ? rows : []);
  };

  const loadScheduler = async () => {
    const data = await AdminAPI.getMaintenanceScheduler();
    setScheduleEnabled(Boolean(data?.enabled));
    setScheduleFrequency(String(data?.frequency || "weekly"));
    setScheduleDay(String(data?.day || "monday"));
    setScheduleTime(String(data?.time || "08:00"));
    setSchedulerResult(data);
  };

  const handleCleanupPictures = () =>
    runAction("cleanupPictures", async () => {
      const response = await AdminAPI.cleanupPictures();
      setPictureResult(response);
      const removed = Number(response?.deleted || 0);
      showToast(
        removed > 0
          ? `Removed ${removed} unused profile image${removed === 1 ? "" : "s"}.`
          : "No unused profile images found.",
        removed > 0 ? "success" : "info",
      );
    });

  const handleCheckStorage = () =>
    runAction("checkStorage", async () => {
      const response = await AdminAPI.getStorageHealth({
        large_file_threshold_mb: Number(largeThresholdMb || 5),
        spike_threshold_mb: Number(spikeThresholdMb || 100),
      });
      setStorageResult(response);

      if (response?.spike_detected) {
        showToast("Storage spike detected. Check large files section.", "warning");
      } else if ((response?.large_files || []).length > 0) {
        showToast("Large files detected in storage.", "info");
      } else {
        showToast("Storage health check completed.", "success");
      }
    });

  const handleCheckDatabase = () =>
    runAction("checkDatabase", async () => {
      const response = await AdminAPI.getDatabaseHealth();
      setDbResult(response);
      showToast(response?.healthy ? "Database health check passed." : "Database health has issues.", response?.healthy ? "success" : "warning");
    });

  const handleFindDuplicates = () =>
    runAction("findDuplicates", async () => {
      const response = await AdminAPI.findDuplicateUsers();
      setDuplicateResult(response);
      const groups = Number(response?.duplicate_groups || 0);
      showToast(
        groups > 0 ? `Found ${groups} duplicate group(s).` : "No duplicate users found.",
        groups > 0 ? "warning" : "success",
      );
    });

  const handleClearLogs = () =>
    runAction("clearLogs", async () => {
      const response = await AdminAPI.clearStatusLogsByDateRange({
        date_from: clearLogsFrom,
        date_to: clearLogsTo,
        category: clearLogsCategory.trim() || null,
      });
      setClearLogsResult(response);
      showToast(`Deleted ${Number(response?.deleted || 0)} status log record(s).`, "success");
    });

  const handleCreateBackup = () =>
    runAction("createBackup", async () => {
      const response = await AdminAPI.createBackup();
      setBackupResult(response);
      showToast("Backup created successfully.", "success");
      await loadBackups();
    });

  const handleLoadBackups = () =>
    runAction("loadBackups", async () => {
      await loadBackups();
      showToast("Backup list refreshed.", "success");
    });

  const handleRestoreBackup = () =>
    runAction("restoreBackup", async () => {
      if (!restorePath.trim()) {
        throw new Error("Select a backup path first.");
      }
      const response = await AdminAPI.restoreBackup(restorePath.trim(), {
        grace_days: Number(restoreGraceDays || 30),
      });
      setRestoreResult(response);
      showToast("Backup restore completed.", "success");
    });

  const handleRunMaintenanceSuite = () =>
    runAction("maintenanceSuite", async () => {
      const response = await AdminAPI.runMaintenanceSuite({
        large_file_threshold_mb: Number(largeThresholdMb || 5),
        spike_threshold_mb: Number(spikeThresholdMb || 100),
        clear_logs: Boolean(clearLogsFrom && clearLogsTo),
        logs_date_from: clearLogsFrom,
        logs_date_to: clearLogsTo,
        logs_category: clearLogsCategory.trim() || null,
      });
      setSuiteResult(response);
      setPictureResult(response?.cleanup_pictures || null);
      setStorageResult(response?.storage_health || null);
      setDbResult(response?.database_health || null);
      setDuplicateResult(response?.duplicate_users || null);
      if (response?.logs_cleanup) setClearLogsResult(response.logs_cleanup);
      showToast("Maintenance suite completed.", "success");
      await loadBackups();
    });

  const handleLoadScheduler = () =>
    runAction("loadScheduler", async () => {
      await loadScheduler();
      showToast("Maintenance scheduler loaded.", "success");
    });

  const handleSaveScheduler = () =>
    runAction("saveScheduler", async () => {
      const payload = {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        day: scheduleDay,
        time: scheduleTime,
      };
      const response = await AdminAPI.updateMaintenanceScheduler(payload);
      setSchedulerResult((prev) => ({
        ...(prev || {}),
        ...response,
      }));
      showToast("Maintenance scheduler saved.", "success");
    });

  const handleSendReportNow = () =>
    runAction("sendReportNow", async () => {
      const response = await AdminAPI.sendMaintenanceReportNow({
        large_file_threshold_mb: Number(largeThresholdMb || 5),
        spike_threshold_mb: Number(spikeThresholdMb || 100),
      });
      setReportResult(response);
      setSuiteResult(response?.report || null);
      setPictureResult(response?.report?.cleanup_pictures || null);
      setStorageResult(response?.report?.storage_health || null);
      setDbResult(response?.report?.database_health || null);
      setDuplicateResult(response?.report?.duplicate_users || null);
      await loadScheduler();
      showToast("Maintenance report sent to admins.", "success");
    });

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        const [backupRows, scheduler] = await Promise.all([
          AdminAPI.getBackups(),
          AdminAPI.getMaintenanceScheduler(),
        ]);
        if (!active) return;
        setBackups(Array.isArray(backupRows) ? backupRows : []);
        setScheduleEnabled(Boolean(scheduler?.enabled));
        setScheduleFrequency(String(scheduler?.frequency || "weekly"));
        setScheduleDay(String(scheduler?.day || "monday"));
        setScheduleTime(String(scheduler?.time || "08:00"));
        setSchedulerResult(scheduler || null);
      } catch (_) {}
    };

    boot();
    return () => {
      active = false;
    };
  }, []);

  const largeFiles = useMemo(() => (Array.isArray(storageResult?.large_files) ? storageResult.large_files : []), [storageResult]);

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2>
            <Settings size={30} /> Server Maintenance
          </h2>
          <p>Run cleanup, health checks, backups, restore, and monitoring tasks.</p>
        </div>
        <PrimaryButton onClick={handleRunMaintenanceSuite} disabled={Boolean(busy.maintenanceSuite)}>
          <Wrench size={16} /> {busy.maintenanceSuite ? "Running..." : "Run Full Maintenance"}
        </PrimaryButton>
      </HeaderSection>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <Grid>
        <Card>
          <CardHeader>
            <ImageIcon size={18} />
            <h3>Profile Pictures</h3>
          </CardHeader>
          <CardBody>
            <p>Delete orphaned profile images in storage with no matching active user profile reference.</p>
            <ButtonRow>
              <ActionButton onClick={handleCleanupPictures} disabled={Boolean(busy.cleanupPictures)}>
                <Trash2 size={14} /> {busy.cleanupPictures ? "Cleaning..." : "Clean Unused Pictures"}
              </ActionButton>
            </ButtonRow>
            <ResultBlock>
              {pictureResult ? (
                <>
                  <StatLine>
                    <span>Deleted</span>
                    <strong>{Number(pictureResult?.deleted || 0)}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Scanned Files</span>
                    <strong>{Number(pictureResult?.scanned_files || 0)}</strong>
                  </StatLine>
                  {Array.isArray(pictureResult?.files) && pictureResult.files.length > 0 && (
                    <Details>
                      <summary>Deleted Files</summary>
                      <List>
                        {pictureResult.files.map((path: string) => (
                          <li key={path}>{path}</li>
                        ))}
                      </List>
                    </Details>
                  )}
                </>
              ) : (
                <Placeholder>Run cleanup to see results.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <HardDrive size={18} />
            <h3>Storage Optimization & Alerts</h3>
          </CardHeader>
          <CardBody>
            <p>Check storage usage, detect large files, and flag sudden storage growth.</p>
            <InlineInputs>
              <label>
                Large file (MB)
                <input value={largeThresholdMb} onChange={(e) => setLargeThresholdMb(e.target.value)} type="number" min="1" />
              </label>
              <label>
                Spike alert (MB)
                <input value={spikeThresholdMb} onChange={(e) => setSpikeThresholdMb(e.target.value)} type="number" min="10" />
              </label>
            </InlineInputs>
            <ButtonRow>
              <ActionButton onClick={handleCheckStorage} disabled={Boolean(busy.checkStorage)}>
                <Search size={14} /> {busy.checkStorage ? "Checking..." : "Check Storage Health"}
              </ActionButton>
            </ButtonRow>
            <ResultBlock>
              {storageResult ? (
                <>
                  <StatLine>
                    <span>Avatar Bucket</span>
                    <strong>{formatBytes(Number(storageResult?.avatar_bucket?.total_bytes || 0))}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Backup Bucket</span>
                    <strong>{formatBytes(Number(storageResult?.backup_bucket?.total_bytes || 0))}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Total</span>
                    <strong>{formatBytes(Number(storageResult?.total_bytes || 0))}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Spike Detected</span>
                    <strong>{storageResult?.spike_detected ? "Yes" : "No"}</strong>
                  </StatLine>
                  {largeFiles.length > 0 && (
                    <Details>
                      <summary>Large Files ({largeFiles.length})</summary>
                      <List>
                        {largeFiles.slice(0, 30).map((file: AnyRecord) => (
                          <li key={`${file.bucket}:${file.path}`}>
                            [{file.bucket}] {file.path} ({formatBytes(Number(file.size || 0))})
                          </li>
                        ))}
                      </List>
                    </Details>
                  )}
                </>
              ) : (
                <Placeholder>Run storage health check to view usage and alerts.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Database size={18} />
            <h3>System Logs & DB Health</h3>
          </CardHeader>
          <CardBody>
            <p>Check database health and clear status logs safely within a chosen date range.</p>
            <ButtonRow>
              <ActionButton onClick={handleCheckDatabase} disabled={Boolean(busy.checkDatabase)}>
                <RefreshCcw size={14} /> {busy.checkDatabase ? "Checking..." : "Check Database Health"}
              </ActionButton>
            </ButtonRow>

            <InlineInputs>
              <label>
                Start Date
                <input type="date" value={clearLogsFrom} onChange={(e) => setClearLogsFrom(e.target.value)} />
              </label>
              <label>
                End Date
                <input type="date" value={clearLogsTo} onChange={(e) => setClearLogsTo(e.target.value)} />
              </label>
              <label>
                Category (optional)
                <input
                  type="text"
                  value={clearLogsCategory}
                  onChange={(e) => setClearLogsCategory(e.target.value)}
                  placeholder="system, request, account..."
                />
              </label>
            </InlineInputs>

            <ButtonRow>
              <DangerButton onClick={handleClearLogs} disabled={Boolean(busy.clearLogs)}>
                <Trash2 size={14} /> {busy.clearLogs ? "Clearing..." : "Clear Status Logs"}
              </DangerButton>
            </ButtonRow>

            <ResultBlock>
              {dbResult ? (
                <>
                  <StatLine>
                    <span>Healthy</span>
                    <strong>{dbResult?.healthy ? "Yes" : "No"}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Latency</span>
                    <strong>{Number(dbResult?.latency_ms || 0)} ms</strong>
                  </StatLine>
                </>
              ) : (
                <Placeholder>Run DB health check to see connection status.</Placeholder>
              )}
              {clearLogsResult && (
                <InfoStrip>
                  <Info size={14} /> Deleted <strong>{Number(clearLogsResult?.deleted || 0)}</strong> logs between
                  <strong> {formatDateTime(clearLogsResult?.date_from)} </strong>and
                  <strong> {formatDateTime(clearLogsResult?.date_to)}</strong>.
                </InfoStrip>
              )}
            </ResultBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Save size={18} />
            <h3>Backups & Restore</h3>
          </CardHeader>
          <CardBody>
            <p>Create backups, list available backups, and restore within a grace period.</p>
            <ButtonRow>
              <ActionButton onClick={handleCreateBackup} disabled={Boolean(busy.createBackup)}>
                <Save size={14} /> {busy.createBackup ? "Creating..." : "Create Backup"}
              </ActionButton>
              <ActionButton onClick={handleLoadBackups} disabled={Boolean(busy.loadBackups)}>
                <RefreshCcw size={14} /> {busy.loadBackups ? "Refreshing..." : "Refresh Backup List"}
              </ActionButton>
            </ButtonRow>

            <InlineInputs>
              <label style={{ gridColumn: "1 / -1" }}>
                Backup Path
                <select value={restorePath} onChange={(e) => setRestorePath(e.target.value)}>
                  <option value="">Select backup to restore</option>
                  {backups.map((backup) => (
                    <option key={backup.path} value={backup.path}>
                      {backup.path} ({formatBytes(Number(backup.size || 0))})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Grace Period (days)
                <input
                  type="number"
                  min="1"
                  value={restoreGraceDays}
                  onChange={(e) => setRestoreGraceDays(e.target.value)}
                />
              </label>
            </InlineInputs>

            <ButtonRow>
              <DangerButton onClick={handleRestoreBackup} disabled={Boolean(busy.restoreBackup)}>
                <Upload size={14} /> {busy.restoreBackup ? "Restoring..." : "Restore Backup"}
              </DangerButton>
            </ButtonRow>

            <ResultBlock>
              {backupResult && (
                <InfoStrip>
                  <CheckCircle size={14} /> Backup created: <strong>{backupResult?.path}</strong>
                </InfoStrip>
              )}
              {restoreResult && (
                <InfoStrip>
                  <CheckCircle size={14} /> Restore done from: <strong>{restoreResult?.path}</strong>
                </InfoStrip>
              )}
              {backups.length > 0 ? (
                <Details>
                  <summary>Available Backups ({backups.length})</summary>
                  <List>
                    {backups.slice(0, 50).map((backup) => (
                      <li key={backup.path}>
                        {backup.path} | {formatBytes(Number(backup.size || 0))} | {formatDateTime(backup.created_at)}
                      </li>
                    ))}
                  </List>
                </Details>
              ) : (
                <Placeholder>No backups loaded.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Users size={18} />
            <h3>User Integrity Checks</h3>
          </CardHeader>
          <CardBody>
            <p>Find duplicate users by username, school ID, and auth UID.</p>
            <ButtonRow>
              <ActionButton onClick={handleFindDuplicates} disabled={Boolean(busy.findDuplicates)}>
                <Search size={14} /> {busy.findDuplicates ? "Scanning..." : "Find Duplicate Users"}
              </ActionButton>
            </ButtonRow>
            <ResultBlock>
              {duplicateResult ? (
                <>
                  <StatLine>
                    <span>Total Users</span>
                    <strong>{Number(duplicateResult?.total_users || 0)}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Duplicate Groups</span>
                    <strong>{Number(duplicateResult?.duplicate_groups || 0)}</strong>
                  </StatLine>
                  <Details>
                    <summary>Duplicate Details</summary>
                    <List>
                      {(duplicateResult?.username_duplicates || []).map((group: AnyRecord) => (
                        <li key={`u-${group.key}`}>username: {group.key} ({group.count})</li>
                      ))}
                      {(duplicateResult?.school_id_duplicates || []).map((group: AnyRecord) => (
                        <li key={`s-${group.key}`}>school_id: {group.key} ({group.count})</li>
                      ))}
                      {(duplicateResult?.auth_uid_duplicates || []).map((group: AnyRecord) => (
                        <li key={`a-${group.key}`}>auth_uid: {group.key} ({group.count})</li>
                      ))}
                    </List>
                  </Details>
                </>
              ) : (
                <Placeholder>Run duplicate scan to view results.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Wrench size={18} />
            <h3>Automated Maintenance</h3>
          </CardHeader>
          <CardBody>
            <p>
              One-click suite runs image cleanup, storage alerts, DB health checks, duplicate detection, and optional
              date-range log cleanup.
            </p>
            <InfoStrip>
              <Info size={14} /> Weekly or monthly scheduling can be attached to this suite through cron/edge function
              trigger, while all execution details are recorded in status logs.
            </InfoStrip>
            {suiteResult ? (
              <ResultBlock>
                <StatLine>
                  <span>Generated At</span>
                  <strong>{formatDateTime(suiteResult?.generated_at)}</strong>
                </StatLine>
                <StatLine>
                  <span>Pictures Deleted</span>
                  <strong>{Number(suiteResult?.cleanup_pictures?.deleted || 0)}</strong>
                </StatLine>
                <StatLine>
                  <span>Storage Spike</span>
                  <strong>{suiteResult?.storage_health?.spike_detected ? "Yes" : "No"}</strong>
                </StatLine>
                <StatLine>
                  <span>DB Healthy</span>
                  <strong>{suiteResult?.database_health?.healthy ? "Yes" : "No"}</strong>
                </StatLine>
                <StatLine>
                  <span>Duplicate Groups</span>
                  <strong>{Number(suiteResult?.duplicate_users?.duplicate_groups || 0)}</strong>
                </StatLine>
              </ResultBlock>
            ) : (
              <Placeholder>Run Full Maintenance to generate a full report.</Placeholder>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <AlertTriangle size={18} />
            <h3>Scheduler & Admin Reports</h3>
          </CardHeader>
          <CardBody>
            <p>Configure weekly/monthly maintenance schedule and trigger an immediate admin report.</p>
            <InlineInputs>
              <label>
                Scheduler Enabled
                <select
                  value={scheduleEnabled ? "true" : "false"}
                  onChange={(e) => setScheduleEnabled(e.target.value === "true")}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label>
                Frequency
                <select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                Day
                {scheduleFrequency === "weekly" ? (
                  <select value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)}>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={scheduleDay}
                    onChange={(e) => setScheduleDay(e.target.value)}
                  />
                )}
              </label>
              <label>
                Time (HH:mm)
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </label>
            </InlineInputs>
            <ButtonRow>
              <ActionButton onClick={handleLoadScheduler} disabled={Boolean(busy.loadScheduler)}>
                <RefreshCcw size={14} /> {busy.loadScheduler ? "Loading..." : "Load Scheduler"}
              </ActionButton>
              <ActionButton onClick={handleSaveScheduler} disabled={Boolean(busy.saveScheduler)}>
                <Save size={14} /> {busy.saveScheduler ? "Saving..." : "Save Scheduler"}
              </ActionButton>
              <PrimaryButton onClick={handleSendReportNow} disabled={Boolean(busy.sendReportNow)}>
                <Info size={14} /> {busy.sendReportNow ? "Sending..." : "Send Report Now"}
              </PrimaryButton>
            </ButtonRow>
            <ResultBlock>
              {schedulerResult ? (
                <>
                  <StatLine>
                    <span>Enabled</span>
                    <strong>{schedulerResult?.enabled ? "Yes" : "No"}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Frequency</span>
                    <strong>{String(schedulerResult?.frequency || scheduleFrequency)}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Schedule</span>
                    <strong>
                      {String(schedulerResult?.day || scheduleDay)} @ {String(schedulerResult?.time || scheduleTime)}
                    </strong>
                  </StatLine>
                  <StatLine>
                    <span>Last Report</span>
                    <strong>{formatDateTime(schedulerResult?.last_report_at)}</strong>
                  </StatLine>
                </>
              ) : (
                <Placeholder>Load scheduler to see saved values.</Placeholder>
              )}
              {reportResult && (
                <InfoStrip>
                  <CheckCircle size={14} /> Report sent at <strong>{formatDateTime(reportResult?.sent_at)}</strong> to
                  <strong> {reportResult?.recipient_group || "admins"}</strong>.
                </InfoStrip>
              )}
            </ResultBlock>
          </CardBody>
        </Card>
      </Grid>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  color: var(--text-primary);
`;

const HeaderSection = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  h2 {
    font-size: 1.9rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 4px;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }

  @media (max-width: 860px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 0.9rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;

  h3 {
    font-size: 1rem;
    margin: 0;
  }
`;

const CardBody = styled.div`
  padding: 1rem;

  p {
    margin: 0 0 0.8rem;
    color: var(--text-secondary);
    font-size: 0.92rem;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
`;

const buttonBase = `
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.62rem 0.86rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const ActionButton = styled.button`
  ${buttonBase}
  background: var(--accent-primary);
  color: var(--text-inverse);

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
  }
`;

const PrimaryButton = styled.button`
  ${buttonBase}
  background: var(--accent-primary);
  color: var(--text-inverse);

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
  }
`;

const DangerButton = styled.button`
  ${buttonBase}
  background: #dc2626;
  color: white;

  &:hover:not(:disabled) {
    background: #b91c1c;
  }
`;

const InlineInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.8rem;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  input,
  select {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ResultBlock = styled.div`
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 0.7rem;
  background: var(--bg-primary);
`;

const Placeholder = styled.div`
  color: var(--text-secondary);
  font-size: 0.86rem;
`;

const StatLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 0.35rem 0;
  border-bottom: 1px dashed var(--border-color);
  font-size: 0.86rem;

  &:last-child {
    border-bottom: none;
  }

  strong {
    color: var(--text-primary);
  }
`;

const Details = styled.details`
  margin-top: 0.55rem;

  summary {
    cursor: pointer;
    font-size: 0.84rem;
    color: var(--text-secondary);
  }
`;

const List = styled.ul`
  margin: 0.5rem 0 0 1rem;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding-right: 0.4rem;
`;

const InfoStrip = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
  }

  svg {
    color: var(--accent-primary);
  }
`;

export default SettingsView;
