import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Bot,
  CalendarClock,
  ChevronRight,
  CheckCircle,
  Database,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Info,
  PieChart,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Plus,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Toast from "../../common/Toast";
import { AdminAPI } from 'services/apis/admin';
import { supabase } from "../../../supabaseClient";
import {
  ADMIN_RUNTIME_GUARD,
  computeAdaptiveBackoffMs,
} from "../../../config/runtimeGuards";
import PageSkeleton from "../../loaders/PageSkeleton";
import {
  clearLocalPortalOutageState,
  fetchPortalOutageSimulationState,
  setPortalOutageSimulationState,
  writeLocalPortalOutageState,
} from "../../../services/portalOutage";

type ToastType = "success" | "error" | "info" | "warning";

type AnyRecord = Record<string, any>;
type FocusSection =
  | "cleanup"
  | "storage"
  | "database"
  | "backups"
  | "integrity"
  | "automation"
  | "scheduler"
  | "incidents"
  | "ip_blocker";
type IncidentScenario = "supabase_offline" | "sensor_backend_offline" | "database_latency_spike";

const INCIDENT_PRESETS: Record<
  IncidentScenario,
  {
    title: string;
    description: string;
    severity: "warning" | "critical";
    expectedResponse: string;
  }
> = {
  supabase_offline: {
    title: "Supabase offline",
    description: "Simulate auth/database outage from Supabase platform.",
    severity: "critical",
    expectedResponse:
      "Portal should keep a controlled error state with incident details instead of a blank page.",
  },
  sensor_backend_offline: {
    title: "Sensor backend offline",
    description: "Simulate monitor sensor ingestion endpoint outage.",
    severity: "warning",
    expectedResponse:
      "Dashboard should show stale-data warning while keeping the admin console interactive.",
  },
  database_latency_spike: {
    title: "Database latency spike",
    description: "Simulate severe query delay and queue pressure.",
    severity: "warning",
    expectedResponse:
      "UI should surface degraded-performance alerts and defer non-critical background actions.",
  },
};

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

const isMissingStatusLogRpc = (error: any) => {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").toLowerCase();
  if (code === "42883") return true;
  return (
    message.includes("could not find the function") ||
    (message.includes("function") && message.includes("does not exist"))
  );
};

const buildLinePath = (values: number[], width: number, height: number, padding = 12): string => {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);

  return values
    .map((value, index) => {
      const x =
        padding +
        (values.length <= 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth);
      const y = padding + innerHeight - ((value - min) / span) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
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
  const [focusSection, setFocusSection] = useState<FocusSection>("cleanup");
  const [incidentScenario, setIncidentScenario] = useState<IncidentScenario>("supabase_offline");
  const [incidentDurationMinutes, setIncidentDurationMinutes] = useState("10");
  const [incidentResult, setIncidentResult] = useState<AnyRecord | null>(null);
  const [blockedIps, setBlockedIps] = useState<AnyRecord[]>([]);
  const [ipBlockModalOpen, setIpBlockModalOpen] = useState(false);
  const [featureDrawerOpen, setFeatureDrawerOpen] = useState(false);
  const [ipBlockForm, setIpBlockForm] = useState({ ip: "", reason: "" });
  const [runtimeSyncing, setRuntimeSyncing] = useState(false);
  const [runtimeLastSyncAt, setRuntimeLastSyncAt] = useState<string | null>(null);
  const [runtimeThrottleCount, setRuntimeThrottleCount] = useState(0);
  const [runtimeFailureCount, setRuntimeFailureCount] = useState(0);
  const [runtimeBackoffMs, setRuntimeBackoffMs] = useState(0);
  const runtimeSyncRef = useRef<{
    inFlight: boolean;
    lastRunAt: number;
    pending: boolean;
    blockedUntil: number;
    failureCount: number;
    timer: number | null;
  }>({
    inFlight: false,
    lastRunAt: 0,
    pending: false,
    blockedUntil: 0,
    failureCount: 0,
    timer: null,
  });

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

  const applySchedulerSnapshot = useCallback((data: AnyRecord | null) => {
    setScheduleEnabled(Boolean(data?.enabled));
    setScheduleFrequency(String(data?.frequency || "weekly"));
    setScheduleDay(String(data?.day || "monday"));
    setScheduleTime(String(data?.time || "08:00"));
    setSchedulerResult(data || null);
  }, []);

  const performRuntimeSync = useCallback(async () => {
    const syncState = runtimeSyncRef.current;
    setRuntimeSyncing(true);
    try {
      const [backupRows, scheduler, blockedIpRows] = await Promise.all([
        AdminAPI.getBackups(),
        AdminAPI.getMaintenanceScheduler(),
        AdminAPI.getBlockedIpList(),
      ]);
      setBackups(Array.isArray(backupRows) ? backupRows : []);
      applySchedulerSnapshot((scheduler || null) as AnyRecord | null);
      setBlockedIps(Array.isArray(blockedIpRows) ? blockedIpRows : []);
      setRuntimeLastSyncAt(new Date().toISOString());
      syncState.failureCount = 0;
      syncState.blockedUntil = 0;
      setRuntimeFailureCount(0);
      setRuntimeBackoffMs(0);
      return true;
    } catch (_) {
      syncState.failureCount += 1;
      const backoffMs = computeAdaptiveBackoffMs(syncState.failureCount, {
        baseMs: ADMIN_RUNTIME_GUARD.retryBaseMs,
        maxMs: ADMIN_RUNTIME_GUARD.retryMaxMs,
        multiplier: ADMIN_RUNTIME_GUARD.retryMultiplier,
        jitterMs: ADMIN_RUNTIME_GUARD.retryJitterMs,
      });
      syncState.blockedUntil = Date.now() + backoffMs;
      syncState.pending = true;
      setRuntimeFailureCount(syncState.failureCount);
      setRuntimeBackoffMs(backoffMs);
      return false;
    } finally {
      setRuntimeSyncing(false);
    }
  }, [applySchedulerSnapshot]);

  const queueRuntimeSync = useCallback(
    (immediate = false) => {
      const syncState = runtimeSyncRef.current;
      const now = Date.now();
      const waitByGap = immediate
        ? 0
        : Math.max(0, ADMIN_RUNTIME_GUARD.minGapMs - (now - syncState.lastRunAt));
      const waitByBackoff = Math.max(0, syncState.blockedUntil - now);
      const waitMs = Math.max(waitByGap, waitByBackoff);

      if (syncState.inFlight) {
        syncState.pending = true;
        setRuntimeThrottleCount((prev) => prev + 1);
        return;
      }

      if (syncState.timer != null) {
        if (!immediate) {
          setRuntimeThrottleCount((prev) => prev + 1);
          return;
        }
        clearTimeout(syncState.timer);
        syncState.timer = null;
      }

      if (waitMs > 0) {
        setRuntimeThrottleCount((prev) => prev + 1);
      }

      syncState.timer = window.setTimeout(async () => {
        syncState.timer = null;
        if (syncState.inFlight) {
          syncState.pending = true;
          return;
        }

        syncState.inFlight = true;
        syncState.lastRunAt = Date.now();
        const succeeded = await performRuntimeSync();
        syncState.inFlight = false;

        if (syncState.pending || !succeeded) {
          syncState.pending = false;
          queueRuntimeSync(false);
        }
      }, waitMs);
    },
    [performRuntimeSync],
  );

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
      queueRuntimeSync(true);
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
      queueRuntimeSync(true);
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
      queueRuntimeSync(true);
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
      queueRuntimeSync(true);
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
      showToast("Maintenance report sent to admins.", "success");
      queueRuntimeSync(true);
    });

  const handleSimulateIncident = () =>
    runAction("simulateIncident", async () => {
      const preset = INCIDENT_PRESETS[incidentScenario];
      const durationMinutes = Math.max(1, Math.min(180, Number(incidentDurationMinutes || 10)));
      const startedAt = new Date().toISOString();
      const message = `Simulated incident: ${preset.title} for ${durationMinutes} minute(s).`;
      const metadata = {
        simulated: true,
        scenario: incidentScenario,
        severity: preset.severity,
        duration_minutes: durationMinutes,
        expected_response: preset.expectedResponse,
      };

      const { error } = await supabase.rpc("app_log_status_event", {
        p_action: "incident_simulation_started",
        p_category: "incident",
        p_message: message,
        p_metadata: metadata,
      });

      if (error && !isMissingStatusLogRpc(error)) {
        throw new Error(error?.message || "Failed to record incident simulation.");
      }

      if (incidentScenario === "supabase_offline") {
        const outageState = {
          active: true,
          scenario: "supabase_offline",
          started_at: startedAt,
          duration_minutes: durationMinutes,
          severity: preset.severity,
          resolved_at: null,
          source: "incident_simulation_lab",
        };
        await setPortalOutageSimulationState(outageState);
        writeLocalPortalOutageState(outageState);
      }

      setIncidentResult({
        scenario: incidentScenario,
        title: preset.title,
        description: preset.description,
        severity: preset.severity,
        started_at: startedAt,
        duration_minutes: durationMinutes,
        expected_response: preset.expectedResponse,
        status: "active",
        logged: !error,
      });
      showToast(`Simulation started: ${preset.title}.`, preset.severity === "critical" ? "warning" : "info");
      queueRuntimeSync(false);
    });

  const handleResolveIncident = () =>
    runAction("resolveIncident", async () => {
      if (!incidentResult || incidentResult?.status !== "active") {
        showToast("No active simulated incident to resolve.", "info");
        return;
      }

      const resolvedAt = new Date().toISOString();
      const { error } = await supabase.rpc("app_log_status_event", {
        p_action: "incident_simulation_resolved",
        p_category: "incident",
        p_message: `Resolved simulated incident: ${incidentResult?.title || "Unknown scenario"}.`,
        p_metadata: {
          scenario: incidentResult?.scenario || null,
          severity: incidentResult?.severity || null,
          resolved_at: resolvedAt,
          simulated: true,
        },
      });

      if (error && !isMissingStatusLogRpc(error)) {
        throw new Error(error?.message || "Failed to record incident resolution.");
      }

      if (incidentResult?.scenario === "supabase_offline") {
        const outageState = {
          active: false,
          scenario: "supabase_offline",
          started_at: incidentResult?.started_at || null,
          duration_minutes: Number(incidentResult?.duration_minutes || 0) || null,
          severity: incidentResult?.severity || null,
          resolved_at: resolvedAt,
          source: "incident_simulation_lab",
        };
        await setPortalOutageSimulationState(outageState);
        clearLocalPortalOutageState();
      }

      setIncidentResult((prev) =>
        prev
          ? {
              ...prev,
              resolved_at: resolvedAt,
              status: "resolved",
            }
          : prev,
      );
      showToast("Incident simulation marked as resolved.", "success");
      queueRuntimeSync(false);
    });

  const closeIpBlockModal = () => {
    if (busy.blockIp) return;
    setIpBlockModalOpen(false);
    setIpBlockForm({ ip: "", reason: "" });
  };

  const closeFeatureDrawer = () => {
    setFeatureDrawerOpen(false);
  };

  const handleSelectFeature = (section: FocusSection) => {
    setFocusSection(section);
    setFeatureDrawerOpen(true);
  };

  const handleBlockIpAddress = () =>
    runAction("blockIp", async () => {
      const ip = String(ipBlockForm.ip || "").trim();
      if (!ip) {
        throw new Error("IP address is required.");
      }
      const response = await AdminAPI.blockIpAddress({
        ip,
        reason: String(ipBlockForm.reason || "").trim() || null,
      });
      const nextBlocked = Array.isArray(response?.blocked_ips) ? response.blocked_ips : [];
      setBlockedIps(nextBlocked);
      closeIpBlockModal();
      showToast(`IP ${ip} is now blocked from login.`, "warning");
      queueRuntimeSync(false);
    });

  const handleUnblockIpAddress = (ipValue: string) =>
    runAction("unblockIp", async () => {
      const ip = String(ipValue || "").trim();
      if (!ip) return;
      const response = await AdminAPI.unblockIpAddress(ip);
      const nextBlocked = Array.isArray(response?.blocked_ips) ? response.blocked_ips : [];
      setBlockedIps(nextBlocked);
      showToast(`IP ${ip} was removed from block list.`, "success");
      queueRuntimeSync(false);
    });

  useEffect(() => {
    let mounted = true;

    const syncOutageSimulation = async () => {
      try {
        const state = await fetchPortalOutageSimulationState();
        if (!mounted) return;

        if (state.active && state.scenario === "supabase_offline") {
          const preset = INCIDENT_PRESETS.supabase_offline;
          writeLocalPortalOutageState(state);
          setIncidentResult((prev) =>
            prev?.status === "active"
              ? prev
              : {
                  scenario: "supabase_offline",
                  title: preset.title,
                  description: preset.description,
                  severity: state.severity || preset.severity,
                  started_at: state.started_at || new Date().toISOString(),
                  duration_minutes: state.duration_minutes || Number(incidentDurationMinutes || 10),
                  expected_response: preset.expectedResponse,
                  status: "active",
                  logged: true,
                },
          );
        } else {
          clearLocalPortalOutageState();
        }
      } catch (_) {
        // skip if settings cannot be read
      }
    };

    void syncOutageSimulation();

    return () => {
      mounted = false;
    };
  }, [incidentDurationMinutes]);

  useEffect(() => {
    queueRuntimeSync(true);

    const interval = window.setInterval(() => {
      queueRuntimeSync(false);
    }, ADMIN_RUNTIME_GUARD.intervalMs);

    const handleFocus = () => queueRuntimeSync(true);
    const handleVisibility = () => {
      if (!document.hidden) queueRuntimeSync(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    const realtimeChannel = supabase
      .channel("server-actions-runtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evaluation_settings" },
        () => queueRuntimeSync(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_logs" },
        () => queueRuntimeSync(false),
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (runtimeSyncRef.current.timer != null) {
        clearTimeout(runtimeSyncRef.current.timer);
        runtimeSyncRef.current.timer = null;
      }
      supabase.removeChannel(realtimeChannel);
    };
  }, [queueRuntimeSync]);

  const largeFiles = useMemo(() => (Array.isArray(storageResult?.large_files) ? storageResult.large_files : []), [storageResult]);

  const storageSummary = useMemo(() => {
    const avatarBytes = Number(storageResult?.avatar_bucket?.total_bytes || 0);
    const backupBytes = Number(storageResult?.backup_bucket?.total_bytes || 0);
    const totalBytes = Number(storageResult?.total_bytes || avatarBytes + backupBytes || 0);
    const safeTotal = Math.max(totalBytes, 1);
    const avatarRatio = Math.max(0, Math.min(100, (avatarBytes / safeTotal) * 100));
    const backupRatio = Math.max(0, Math.min(100, (backupBytes / safeTotal) * 100));

    return {
      avatarBytes,
      backupBytes,
      totalBytes,
      avatarRatio,
      backupRatio,
      spikeDetected: Boolean(storageResult?.spike_detected),
    };
  }, [storageResult]);

  const backupTrend = useMemo(() => {
    const rows = [...(Array.isArray(backups) ? backups : [])]
      .filter((row) => row && row.path)
      .sort((a, b) =>
        String(a?.created_at || "").localeCompare(String(b?.created_at || "")),
      )
      .slice(-7);

    const points = rows.map((row, index) => {
      const size = Number(row?.size || 0);
      const created = row?.created_at ? new Date(row.created_at) : null;
      const label =
        created && !Number.isNaN(created.getTime())
          ? created.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : `#${index + 1}`;
      return {
        label,
        bytes: Math.max(0, size),
      };
    });

    const values = points.map((point) => point.bytes);
    return {
      points,
      values,
      path: buildLinePath(values, 420, 170, 14),
      max: Math.max(1, ...values),
    };
  }, [backups]);

  const opsSnapshot = useMemo(() => {
    const dbHealthy = dbResult == null ? null : Boolean(dbResult?.healthy);
    const latency = Number(dbResult?.latency_ms || 0);
    const duplicateGroups = Number(duplicateResult?.duplicate_groups || 0);
    const deletedPictures = Number(pictureResult?.deleted || 0);
    const nextSchedule =
      scheduleEnabled && scheduleTime
        ? `${scheduleFrequency === "monthly" ? "Day" : "Every"} ${scheduleDay} at ${scheduleTime}`
        : "Disabled";

    const healthLabel =
      dbHealthy == null
        ? "Pending checks"
        : dbHealthy && !storageSummary.spikeDetected
          ? "Healthy"
          : "Attention needed";

    return {
      dbHealthy,
      latency,
      duplicateGroups,
      deletedPictures,
      nextSchedule,
      healthLabel,
    };
  }, [
    dbResult,
    duplicateResult,
    pictureResult,
    scheduleDay,
    scheduleEnabled,
    scheduleFrequency,
    scheduleTime,
    storageSummary.spikeDetected,
  ]);

  const featureCards = useMemo(
    () => [
      {
        key: "cleanup" as FocusSection,
        title: "Profile Pictures",
        description: "Clean and reuse valid profile images.",
        meta:
          Number(pictureResult?.deleted || 0) > 0
            ? `${Number(pictureResult?.deleted || 0)} cleaned`
            : "No cleanup run",
        icon: ImageIcon,
      },
      {
        key: "storage" as FocusSection,
        title: "Storage Health",
        description: "Check bucket growth and file spikes.",
        meta: storageResult ? formatBytes(storageSummary.totalBytes) : "No storage scan",
        icon: HardDrive,
      },
      {
        key: "database" as FocusSection,
        title: "Database & Logs",
        description: "DB checks and timeline cleanup.",
        meta: dbResult ? `${dbResult?.healthy ? "Healthy" : "Issue detected"}` : "DB check pending",
        icon: Database,
      },
      {
        key: "backups" as FocusSection,
        title: "Backups",
        description: "Create restore points and recover fast.",
        meta: `${backups.length} snapshot(s)`,
        icon: Save,
      },
      {
        key: "integrity" as FocusSection,
        title: "User Integrity",
        description: "Detect duplicate identity records.",
        meta: `${Number(duplicateResult?.duplicate_groups || 0)} duplicate group(s)`,
        icon: Users,
      },
      {
        key: "automation" as FocusSection,
        title: "Maintenance Suite",
        description: "Run complete maintenance workflow.",
        meta: suiteResult?.generated_at ? `Last run ${formatDateTime(suiteResult.generated_at)}` : "Not executed",
        icon: Wrench,
      },
      {
        key: "scheduler" as FocusSection,
        title: "Scheduler",
        description: "Automate recurring reports and actions.",
        meta: scheduleEnabled ? `Enabled at ${scheduleTime}` : "Disabled",
        icon: CalendarClock,
      },
      {
        key: "incidents" as FocusSection,
        title: "Incident Simulation",
        description: "Simulate Supabase or backend failure scenarios.",
        meta:
          incidentResult?.status === "active"
            ? `Active: ${incidentResult?.title || "scenario"}`
            : "No active simulation",
        icon: AlertTriangle,
      },
      {
        key: "ip_blocker" as FocusSection,
        title: "IP Blocker",
        description: "Block risky IP addresses from any portal login.",
        meta: `${blockedIps.length} blocked IP(s)`,
        icon: Ban,
      },
    ],
    [
      blockedIps.length,
      backups.length,
      dbResult,
      duplicateResult?.duplicate_groups,
      incidentResult?.status,
      incidentResult?.title,
      pictureResult?.deleted,
      scheduleEnabled,
      scheduleTime,
      storageResult,
      storageSummary.totalBytes,
      suiteResult?.generated_at,
    ],
  );

  const activeFeature = useMemo(
    () => featureCards.find((item) => item.key === focusSection) || null,
    [featureCards, focusSection],
  );

  const showSection = (section: FocusSection) => focusSection === section;
  const showMonitoringCharts = false;
  const runtimeBootLoading =
    runtimeSyncing &&
    !runtimeLastSyncAt &&
    backups.length === 0 &&
    blockedIps.length === 0 &&
    schedulerResult == null;

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <HeaderEyebrow>
            <Server size={14} /> Ops Console
          </HeaderEyebrow>
          <h2>
            <Settings size={30} /> Server Actions
          </h2>
          <p>Use action buttons for maintenance tasks. Monitoring charts are now in Dashboard.</p>
        </div>
        <HeaderControls>
          <ActiveFeaturePill>
            <Bot size={13} />
            {activeFeature?.title || "Server feature"}
          </ActiveFeaturePill>

          <PrimaryButton onClick={handleRunMaintenanceSuite} disabled={Boolean(busy.maintenanceSuite)}>
            <Wrench size={16} /> {busy.maintenanceSuite ? "Running..." : "Run Full Maintenance"}
          </PrimaryButton>

          <RuntimeSyncBadge>
            <Activity size={13} />
            {runtimeSyncing ? "Runtime syncing" : "Runtime active"}
          </RuntimeSyncBadge>
        </HeaderControls>
      </HeaderSection>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      {runtimeBootLoading ? (
        <RuntimeBootSkeleton>
          <RuntimeBootHeader>
            <RuntimeBootLine />
            <RuntimeBootLine $short />
          </RuntimeBootHeader>
          <PageSkeleton variant="cards" compact count={6} />
        </RuntimeBootSkeleton>
      ) : showMonitoringCharts ? (
        <OpsPanel>
          <QuickStatsRow>
            <StatTile $tone={opsSnapshot.dbHealthy === false ? "danger" : "success"}>
              <StatTileTop>
                <span>System Health</span>
                <ShieldCheck size={18} />
              </StatTileTop>
              <h4>{opsSnapshot.healthLabel}</h4>
              <MiniMeta>
                {opsSnapshot.dbHealthy == null ? "Run database check" : `DB latency: ${opsSnapshot.latency} ms`}
              </MiniMeta>
              <HealthPill $healthy={opsSnapshot.dbHealthy !== false}>
                <Activity size={13} />
                {opsSnapshot.dbHealthy == null ? "Pending" : opsSnapshot.dbHealthy ? "Stable" : "Check Needed"}
              </HealthPill>
            </StatTile>

            <StatTile $tone={storageSummary.spikeDetected ? "warning" : "info"}>
              <StatTileTop>
                <span>Storage Footprint</span>
                <HardDrive size={18} />
              </StatTileTop>
              <h4>{formatBytes(storageSummary.totalBytes)}</h4>
              <MiniMeta>
                Avatar {formatBytes(storageSummary.avatarBytes)} | Backup {formatBytes(storageSummary.backupBytes)}
              </MiniMeta>
              <HealthPill $healthy={!storageSummary.spikeDetected}>
                <Gauge size={13} />
                {storageSummary.spikeDetected ? "Spike detected" : "Within threshold"}
              </HealthPill>
            </StatTile>

            <StatTile $tone={opsSnapshot.duplicateGroups > 0 ? "warning" : "neutral"}>
              <StatTileTop>
                <span>Integrity Signals</span>
                <Users size={18} />
              </StatTileTop>
              <h4>{opsSnapshot.duplicateGroups}</h4>
              <MiniMeta>
                Duplicate groups | Pictures cleaned: {opsSnapshot.deletedPictures}
              </MiniMeta>
              <HealthPill $healthy={opsSnapshot.duplicateGroups === 0}>
                <AlertTriangle size={13} />
                {opsSnapshot.duplicateGroups > 0 ? "Investigate duplicates" : "No duplicates"}
              </HealthPill>
            </StatTile>

            <StatTile $tone="info">
              <StatTileTop>
                <span>Automation Schedule</span>
                <CalendarClock size={18} />
              </StatTileTop>
              <h4>{scheduleEnabled ? "Enabled" : "Disabled"}</h4>
              <MiniMeta>{opsSnapshot.nextSchedule}</MiniMeta>
              <HealthPill $healthy={scheduleEnabled}>
                <Activity size={13} />
                {scheduleEnabled ? "Auto-maintenance active" : "Manual mode"}
              </HealthPill>
            </StatTile>
          </QuickStatsRow>

          <ChartGrid>
            <ChartCard>
              <ChartHeader>
                <h3>
                  <BarChart3 size={16} /> Backup Trend
                </h3>
                <span>Latest {backupTrend.points.length || 0} snapshots</span>
              </ChartHeader>
              {backupTrend.points.length > 0 ? (
                <LineChartWrap>
                  <svg viewBox="0 0 420 170" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="14" y1="28" x2="406" y2="28" />
                    <line x1="14" y1="86" x2="406" y2="86" />
                    <line x1="14" y1="144" x2="406" y2="144" />
                    <path d={backupTrend.path} />
                  </svg>
                  <ChartAxis>
                    {backupTrend.points.map((point) => (
                      <span key={`${point.label}-${point.bytes}`}>{point.label}</span>
                    ))}
                  </ChartAxis>
                </LineChartWrap>
              ) : (
                <Placeholder>Create or load backups to see growth trend.</Placeholder>
              )}
            </ChartCard>

            <ChartCard>
              <ChartHeader>
                <h3>
                  <PieChart size={16} /> Storage Allocation
                </h3>
                <span>Avatar vs backup buckets</span>
              </ChartHeader>
              <StorageBars>
                <StorageBar>
                  <label>Avatar Bucket</label>
                  <progress value={storageSummary.avatarRatio} max={100} />
                  <small>{storageSummary.avatarRatio.toFixed(1)}%</small>
                </StorageBar>
                <StorageBar>
                  <label>Backup Bucket</label>
                  <progress value={storageSummary.backupRatio} max={100} />
                  <small>{storageSummary.backupRatio.toFixed(1)}%</small>
                </StorageBar>
                <StorageBar>
                  <label>Total Used</label>
                  <div />
                  <strong>{formatBytes(storageSummary.totalBytes)}</strong>
                </StorageBar>
              </StorageBars>
            </ChartCard>
          </ChartGrid>
        </OpsPanel>
      ) : (
        <ActionOnlyNotice>
          <BotHead>
            <BotPulse />
            <div>
              <h4>Server Action Bot</h4>
              <p>Monitoring charts moved to <strong>Dashboard</strong>. This panel is action-first with guarded runtime sync.</p>
            </div>
          </BotHead>
          <BotMetrics>
            <span>{runtimeSyncing ? "Syncing runtime data..." : `Last sync: ${runtimeLastSyncAt ? formatDateTime(runtimeLastSyncAt) : "pending"}`}</span>
            <span>Throttle merges: {runtimeThrottleCount}</span>
            <span>Failures: {runtimeFailureCount}</span>
            <span>Backoff: {runtimeBackoffMs > 0 ? `${Math.max(1, Math.round(runtimeBackoffMs / 1000))}s` : "none"}</span>
            <span>Runtime cadence: {Math.round(ADMIN_RUNTIME_GUARD.intervalMs / 1000)}s + focus</span>
          </BotMetrics>
          <BotTelemetry>
            <TelemetryRow>
              <label>Sync Stream</label>
              <TelemetryTrack>
                <TelemetryPulse $size="large" />
              </TelemetryTrack>
            </TelemetryRow>
            <TelemetryRow>
              <label>Throttle Guard</label>
              <TelemetryTrack>
                <TelemetryPulse $size="medium" />
              </TelemetryTrack>
            </TelemetryRow>
            <TelemetryRow>
              <label>Backoff Line</label>
              <TelemetryTrack>
                <TelemetryPulse $size="small" />
              </TelemetryTrack>
            </TelemetryRow>
          </BotTelemetry>
        </ActionOnlyNotice>
      )}

      {!runtimeBootLoading ? (
        <>
          <FeatureCatalog>
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              const isActive = focusSection === feature.key;
              return (
                <FeatureCardButton
                  key={feature.key}
                  type="button"
                  data-active={isActive ? "true" : "false"}
                  onClick={() => handleSelectFeature(feature.key)}
                >
                  <FeatureCardHead>
                    <FeatureIconWrap data-active={isActive ? "true" : "false"}>
                      <Icon size={16} />
                    </FeatureIconWrap>
                    <div>
                      <h4>{feature.title}</h4>
                      <p>{feature.description}</p>
                    </div>
                    <ChevronRight size={16} />
                  </FeatureCardHead>
                  <FeatureCardMeta>{feature.meta}</FeatureCardMeta>
                </FeatureCardButton>
              );
            })}
          </FeatureCatalog>

          {featureDrawerOpen ? (
        <FloatingModalOverlay onClick={closeFeatureDrawer}>
          <FloatingModalCard
            role="dialog"
            aria-modal="true"
            aria-label={`${activeFeature?.title || "Server feature"} panel`}
            onClick={(event) => event.stopPropagation()}
          >
            <FloatingModalHead>
              <div>
                <h4>{activeFeature?.title || "Server feature"}</h4>
                <p>{activeFeature?.description || "Server action details and controls."}</p>
              </div>
              <FloatingModalClose type="button" onClick={closeFeatureDrawer} aria-label="Close server action panel">
                <X size={16} />
              </FloatingModalClose>
            </FloatingModalHead>
            <FloatingModalBody>
              <Grid>
        {showSection("cleanup") && (
        <Card $tone="info">
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
        )}

        {showSection("storage") && (
        <Card $tone="neutral">
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
        )}

        {showSection("database") && (
        <Card $tone="warning">
          <CardHeader>
            <Database size={18} />
            <h3>System Logs & DB Health</h3>
          </CardHeader>
          <CardBody>
            <p>Check database health and clear status logs safely within a chosen date range.</p>
            <ButtonRow>
              <ActionButton onClick={handleCheckDatabase} disabled={Boolean(busy.checkDatabase)}>
                <Database size={14} /> {busy.checkDatabase ? "Checking..." : "Check Database Health"}
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
        )}

        {showSection("backups") && (
        <Card $tone="success">
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
            </ButtonRow>
            <RealtimeHint>
              <Activity size={14} />
              Runtime sync updates backups on focus and every 60s. Last sync:{" "}
              <strong>{runtimeLastSyncAt ? formatDateTime(runtimeLastSyncAt) : "pending"}</strong>
            </RealtimeHint>

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
        )}

        {showSection("integrity") && (
        <Card $tone="danger">
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
        )}

        {showSection("automation") && (
        <Card $tone="neutral">
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
        )}

        {showSection("scheduler") && (
        <Card $tone="info">
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
              <ActionButton onClick={handleSaveScheduler} disabled={Boolean(busy.saveScheduler)}>
                <Save size={14} /> {busy.saveScheduler ? "Saving..." : "Save Scheduler"}
              </ActionButton>
              <PrimaryButton onClick={handleSendReportNow} disabled={Boolean(busy.sendReportNow)}>
                <Info size={14} /> {busy.sendReportNow ? "Sending..." : "Send Report Now"}
              </PrimaryButton>
            </ButtonRow>
            <RealtimeHint>
              <Activity size={14} />
              Scheduler state auto-syncs without refresh buttons. Rate guard:{" "}
              <strong>{Math.round(ADMIN_RUNTIME_GUARD.minGapMs / 1000)}s</strong> between runtime pulls.
            </RealtimeHint>
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
                <Placeholder>Scheduler sync is automatic; values appear as soon as data is available.</Placeholder>
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
        )}

        {showSection("incidents") && (
        <Card $tone="warning">
          <CardHeader>
            <AlertTriangle size={18} />
            <h3>Incident Simulation Lab</h3>
          </CardHeader>
          <CardBody>
            <p>
              Simulate critical incidents to validate portal behavior before a real outage. This tool writes a
              simulation event to status logs when the logging RPC is available.
            </p>

            <InlineInputs>
              <label>
                Scenario
                <select
                  value={incidentScenario}
                  onChange={(event) => setIncidentScenario(event.target.value as IncidentScenario)}
                >
                  <option value="supabase_offline">Supabase offline</option>
                  <option value="sensor_backend_offline">Sensor backend offline</option>
                  <option value="database_latency_spike">Database latency spike</option>
                </select>
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={incidentDurationMinutes}
                  onChange={(event) => setIncidentDurationMinutes(event.target.value)}
                />
              </label>
              <label>
                Severity
                <input
                  type="text"
                  value={INCIDENT_PRESETS[incidentScenario].severity}
                  readOnly
                />
              </label>
            </InlineInputs>

            <InfoStrip>
              <Info size={14} />
              Expected response: <strong>{INCIDENT_PRESETS[incidentScenario].expectedResponse}</strong>
            </InfoStrip>

            <ButtonRow>
              <ActionButton onClick={handleSimulateIncident} disabled={Boolean(busy.simulateIncident)}>
                <AlertTriangle size={14} />
                {busy.simulateIncident ? "Simulating..." : "Run Simulation"}
              </ActionButton>
              <DangerButton onClick={handleResolveIncident} disabled={Boolean(busy.resolveIncident)}>
                <CheckCircle size={14} />
                {busy.resolveIncident ? "Resolving..." : "Resolve Simulation"}
              </DangerButton>
            </ButtonRow>

            <ResultBlock>
              {incidentResult ? (
                <>
                  <StatLine>
                    <span>Scenario</span>
                    <strong>{incidentResult?.title || "-"}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Status</span>
                    <strong>{String(incidentResult?.status || "active")}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Started</span>
                    <strong>{formatDateTime(incidentResult?.started_at)}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Resolved</span>
                    <strong>{formatDateTime(incidentResult?.resolved_at || null)}</strong>
                  </StatLine>
                  <StatLine>
                    <span>Duration</span>
                    <strong>{Number(incidentResult?.duration_minutes || 0)} minute(s)</strong>
                  </StatLine>
                  <StatLine>
                    <span>Expected Behavior</span>
                    <strong>{incidentResult?.expected_response || "-"}</strong>
                  </StatLine>
                  <InfoStrip>
                    <Info size={14} />
                    Log persistence: <strong>{incidentResult?.logged ? "Recorded to status logs" : "Runtime-only preview"}</strong>
                  </InfoStrip>
                </>
              ) : (
                <Placeholder>No simulation has been executed yet.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>
        )}

        {showSection("ip_blocker") && (
        <Card $tone="danger">
          <CardHeader>
            <Ban size={18} />
            <h3>IP Login Blocker</h3>
          </CardHeader>
          <CardBody>
            <p>
              Block a public IP address to prevent login attempts from that network across all portal accounts.
            </p>

            <ButtonRow>
              <ActionButton type="button" onClick={() => setIpBlockModalOpen(true)}>
                <Plus size={14} />
                Add blocked IP
              </ActionButton>
            </ButtonRow>

            <RealtimeHint>
              <Activity size={14} />
              Runtime sync keeps blocked IP list current without manual refresh.
            </RealtimeHint>

            <ResultBlock>
              {blockedIps.length > 0 ? (
                <BlockedIpList>
                  {blockedIps.map((row) => {
                    const ip = String(row?.ip || "").trim();
                    const reason = String(row?.reason || "").trim();
                    const blockedAt = formatDateTime(String(row?.blocked_at || ""));
                    return (
                      <BlockedIpRow key={ip || blockedAt}>
                        <div>
                          <strong>{ip || "Unknown IP"}</strong>
                          <small>
                            {reason || "No reason provided"} | {blockedAt}
                          </small>
                        </div>
                        <DangerButton
                          type="button"
                          onClick={() => handleUnblockIpAddress(ip)}
                          disabled={Boolean(busy.unblockIp)}
                        >
                          {busy.unblockIp ? "Updating..." : "Unblock"}
                        </DangerButton>
                      </BlockedIpRow>
                    );
                  })}
                </BlockedIpList>
              ) : (
                <Placeholder>No blocked IP addresses configured.</Placeholder>
              )}
            </ResultBlock>
          </CardBody>
        </Card>
        )}
              </Grid>
            </FloatingModalBody>
          </FloatingModalCard>
        </FloatingModalOverlay>
          ) : null}
        </>
      ) : null}

      {ipBlockModalOpen ? (
        <FloatingModalOverlay onClick={closeIpBlockModal}>
          <FloatingModalCard
            role="dialog"
            aria-modal="true"
            aria-label="Block IP Address"
            onClick={(event) => event.stopPropagation()}
          >
            <FloatingModalHead>
              <div>
                <h4>Block IP Address</h4>
                <p>This IP will no longer be able to log in to any portal account.</p>
              </div>
              <FloatingModalClose type="button" onClick={closeIpBlockModal}>
                <X size={16} />
              </FloatingModalClose>
            </FloatingModalHead>

            <InlineInputs>
              <label style={{ gridColumn: "1 / -1" }}>
                IP Address
                <input
                  type="text"
                  placeholder="e.g. 203.0.113.15"
                  value={ipBlockForm.ip}
                  onChange={(event) =>
                    setIpBlockForm((prev) => ({ ...prev, ip: event.target.value }))
                  }
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Reason (optional)
                <input
                  type="text"
                  placeholder="Suspicious sign-in attempts"
                  value={ipBlockForm.reason}
                  onChange={(event) =>
                    setIpBlockForm((prev) => ({ ...prev, reason: event.target.value }))
                  }
                />
              </label>
            </InlineInputs>

            <ButtonRow style={{ margin: "0 1rem 1rem" }}>
              <DangerButton type="button" onClick={handleBlockIpAddress} disabled={Boolean(busy.blockIp)}>
                <Ban size={14} />
                {busy.blockIp ? "Blocking..." : "Block IP"}
              </DangerButton>
              <ActionButton type="button" onClick={closeIpBlockModal} disabled={Boolean(busy.blockIp)}>
                Cancel
              </ActionButton>
            </ButtonRow>
          </FloatingModalCard>
        </FloatingModalOverlay>
      ) : null}
    </StyledContainer>
  );
};

const auroraDrift = keyframes`
  0% {
    transform: translate3d(-6%, -4%, 0) scale(1);
    opacity: 0.38;
  }
  50% {
    transform: translate3d(4%, 5%, 0) scale(1.08);
    opacity: 0.58;
  }
  100% {
    transform: translate3d(-6%, -4%, 0) scale(1);
    opacity: 0.38;
  }
`;

const scanShift = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(120%); }
`;

const bootShimmer = keyframes`
  0% { background-position: 200% 50%; }
  100% { background-position: -200% 50%; }
`;

const modalOverlayFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const drawerSlideIn = keyframes`
  from {
    transform: translateX(106%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const StyledContainer = styled.div`
  --text-primary: #eef4ff;
  --text-secondary: rgba(223, 233, 255, 0.9);
  --bg-secondary: rgba(12, 20, 46, 0.9);
  --bg-tertiary: rgba(20, 30, 62, 0.9);
  --border-color: rgba(153, 171, 255, 0.34);
  --accent-primary: #63b7ff;
  --accent-highlight: #8c79ff;
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 12px 32px;
  border-radius: 18px;
  border: 1px solid rgba(161, 178, 255, 0.2);
  color: #eaf1ff;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 0%, rgba(98, 175, 255, 0.18), transparent 42%),
    radial-gradient(circle at 90% 6%, rgba(120, 98, 255, 0.17), transparent 45%),
    linear-gradient(155deg, #050b18 0%, #070f22 48%, #050914 100%);

  &::before {
    content: "";
    position: absolute;
    inset: -25%;
    background: radial-gradient(circle at 50% 50%, rgba(98, 176, 255, 0.18), transparent 62%);
    filter: blur(26px);
    pointer-events: none;
    animation: ${auroraDrift} 14s ease-in-out infinite;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 44%;
    background: linear-gradient(90deg, transparent, rgba(129, 209, 255, 0.12), transparent);
    pointer-events: none;
    animation: ${scanShift} 7.8s linear infinite;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const HeaderSection = styled.div`
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid rgba(162, 178, 255, 0.28);
  background:
    radial-gradient(circle at 88% 16%, rgba(96, 185, 255, 0.24), transparent 48%),
    linear-gradient(180deg, rgba(13, 21, 47, 0.95), rgba(8, 15, 35, 0.96));

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
    color: rgba(229, 238, 255, 0.9);
  }

  @media (max-width: 860px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #89ccff;
  margin-bottom: 6px;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
`;

const ActiveFeaturePill = styled.div`
  border-radius: 999px;
  border: 1px solid rgba(153, 171, 255, 0.38);
  background: rgba(16, 25, 52, 0.88);
  color: #f3f8ff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.78rem;
  font-weight: 700;
`;

const RuntimeSyncBadge = styled.div`
  border-radius: 999px;
  border: 1px solid rgba(110, 233, 182, 0.4);
  background: rgba(31, 113, 83, 0.24);
  color: rgba(215, 255, 240, 0.96);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px;
  font-size: 0.78rem;
  font-weight: 600;
`;

const RuntimeBootSkeleton = styled.section`
  margin-bottom: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(153, 171, 255, 0.3);
  background: linear-gradient(150deg, rgba(13, 21, 50, 0.9), rgba(8, 14, 32, 0.92));
  box-shadow: 0 12px 24px rgba(2, 6, 18, 0.48);
  padding: 10px;
`;

const RuntimeBootHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 4px 8px;
`;

const RuntimeBootLine = styled.div<{ $short?: boolean }>`
  width: ${(props) => (props.$short ? "40%" : "60%")};
  height: ${(props) => (props.$short ? "10px" : "14px")};
  border-radius: 999px;
  background: linear-gradient(
    110deg,
    rgba(82, 120, 207, 0.52) 0%,
    rgba(161, 186, 255, 0.92) 50%,
    rgba(82, 120, 207, 0.52) 100%
  );
  background-size: 220% 100%;
  animation: ${bootShimmer} 1.1s linear infinite;
`;

const OpsPanel = styled.section`
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const ActionOnlyNotice = styled.div`
  margin-bottom: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(155, 171, 255, 0.35);
  background: linear-gradient(145deg, rgba(13, 21, 49, 0.9), rgba(10, 17, 40, 0.88));
  padding: 0.9rem 0.95rem;
  color: rgba(220, 231, 255, 0.9);
  box-shadow: 0 10px 22px rgba(2, 6, 18, 0.5);
`;

const FeatureCatalog = styled.div`
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCardButton = styled.button`
  width: 100%;
  border: 1px solid rgba(153, 171, 255, 0.32);
  border-radius: 12px;
  background: linear-gradient(155deg, rgba(14, 22, 48, 0.92), rgba(9, 16, 37, 0.9));
  color: #eef4ff;
  text-align: left;
  cursor: pointer;
  padding: 0.74rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: rgba(129, 196, 255, 0.58);
    transform: translateY(-1px);
  }

  &[data-active="true"] {
    border-color: rgba(111, 220, 255, 0.75);
    box-shadow: 0 0 0 1px rgba(111, 220, 255, 0.24);
    background: linear-gradient(155deg, rgba(19, 33, 71, 0.95), rgba(12, 22, 48, 0.92));
  }
`;

const FeatureCardHead = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;

  h4 {
    margin: 0;
    font-size: 0.91rem;
    line-height: 1.2;
    color: #f4f8ff;
  }

  p {
    margin: 4px 0 0;
    font-size: 0.76rem;
    line-height: 1.35;
    color: rgba(221, 232, 255, 0.85);
  }

  svg:last-child {
    color: rgba(196, 214, 255, 0.78);
  }
`;

const FeatureIconWrap = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid rgba(153, 171, 255, 0.45);
  background: rgba(28, 41, 81, 0.82);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9fd7ff;

  &[data-active="true"] {
    border-color: rgba(108, 236, 255, 0.62);
    color: #d6ffff;
    background: rgba(33, 74, 102, 0.7);
  }
`;

const FeatureCardMeta = styled.div`
  border-radius: 8px;
  border: 1px dashed rgba(153, 171, 255, 0.4);
  background: rgba(14, 23, 51, 0.86);
  padding: 0.42rem 0.55rem;
  font-size: 0.75rem;
  color: rgba(225, 236, 255, 0.88);
`;

const BotHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;

  h4 {
    margin: 0;
    color: #f6f9ff;
    font-size: 0.94rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(210, 222, 255, 0.8);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  strong {
    color: #ffffff;
  }
`;

const BotPulse = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #6ce6b2;
  margin-top: 3px;
  box-shadow: 0 0 0 0 rgba(108, 230, 178, 0.6);
  animation: pulseBot 1.7s infinite;

  @keyframes pulseBot {
    0% {
      box-shadow: 0 0 0 0 rgba(108, 230, 178, 0.6);
    }
    100% {
      box-shadow: 0 0 0 10px rgba(108, 230, 178, 0);
    }
  }
`;

const BotMetrics = styled.div`
  margin-top: 9px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  span {
    border-radius: 999px;
    border: 1px solid rgba(162, 178, 255, 0.35);
    background: rgba(15, 24, 52, 0.74);
    color: rgba(227, 235, 255, 0.88);
    font-size: 0.73rem;
    padding: 6px 10px;
  }
`;

const BotTelemetry = styled.div`
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const TelemetryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    color: rgba(210, 222, 255, 0.86);
    font-size: 0.73rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 620;
  }
`;

const TelemetryTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  background: rgba(80, 108, 176, 0.35);
  overflow: hidden;
`;

const TelemetryPulse = styled.span<{ $size: "small" | "medium" | "large" }>`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7de4b2, #65b9ff, #8c7bff);
  width: ${(props) =>
    props.$size === "large" ? "74%" : props.$size === "medium" ? "52%" : "33%"};
  animation: telemetrySweep 1.8s ease-in-out infinite;

  @keyframes telemetrySweep {
    0% {
      transform: translateX(-18%);
      opacity: 0.68;
    }
    50% {
      transform: translateX(12%);
      opacity: 1;
    }
    100% {
      transform: translateX(-18%);
      opacity: 0.68;
    }
  }
`;

const QuickStatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StatTile = styled.article<{ $tone: "success" | "info" | "warning" | "danger" | "neutral" }>`
  border-radius: 14px;
  border: 1px solid color-mix(
    in srgb,
    ${(props) =>
      props.$tone === "success"
        ? "#10b981"
        : props.$tone === "info"
          ? "#0ea5e9"
          : props.$tone === "warning"
            ? "#f59e0b"
            : props.$tone === "danger"
              ? "#ef4444"
              : "var(--border-color)"} 22%,
    var(--border-color)
  );
  background: linear-gradient(
    145deg,
    color-mix(
      in srgb,
      ${(props) =>
        props.$tone === "success"
          ? "#10b981"
          : props.$tone === "info"
            ? "#0ea5e9"
            : props.$tone === "warning"
              ? "#f59e0b"
              : props.$tone === "danger"
                ? "#ef4444"
                : "var(--bg-secondary)"} 9%,
      var(--bg-secondary)
    ),
    var(--bg-secondary)
  );
  padding: 0.92rem;

  h4 {
    margin: 0.38rem 0 0.12rem;
    font-size: 1.28rem;
    font-weight: 800;
  }
`;

const StatTileTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const MiniMeta = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
`;

const HealthPill = styled.div<{ $healthy: boolean }>`
  margin-top: 0.68rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props.$healthy ? "rgba(16,185,129,0.32)" : "rgba(239,68,68,0.34)")};
  background: ${(props) => (props.$healthy ? "rgba(21, 115, 80, 0.28)" : "rgba(139, 34, 42, 0.26)")};
  color: ${(props) => (props.$healthy ? "#86efc5" : "#ffb4ba")};
  font-size: 0.74rem;
  font-weight: 700;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 0.8rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.article`
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent-primary) 5%, var(--bg-secondary)), var(--bg-secondary));
  padding: 0.92rem;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0.65rem;

  h3 {
    margin: 0;
    font-size: 0.93rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  span {
    font-size: 0.78rem;
    color: var(--text-secondary);
  }
`;

const LineChartWrap = styled.div`
  svg {
    width: 100%;
    height: 165px;
  }

  line {
    stroke: color-mix(in srgb, var(--border-color) 70%, transparent);
    stroke-dasharray: 4 4;
  }

  path {
    fill: none;
    stroke: var(--accent-primary);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
`;

const ChartAxis = styled.div`
  margin-top: 0.2rem;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;

  span {
    font-size: 0.72rem;
    color: var(--text-secondary);
    text-align: center;
  }
`;

const StorageBars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
`;

const StorageBar = styled.div`
  display: grid;
  grid-template-columns: 130px 1fr auto;
  align-items: center;
  gap: 0.6rem;

  label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  progress {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
  }

  progress::-webkit-progress-bar {
    background-color: color-mix(in srgb, var(--border-color) 75%, transparent);
    border-radius: 999px;
  }

  progress::-webkit-progress-value {
    background: linear-gradient(90deg, var(--accent-primary), color-mix(in srgb, var(--accent-highlight) 72%, var(--accent-primary)));
    border-radius: 999px;
  }

  small,
  strong {
    font-size: 0.78rem;
    color: var(--text-primary);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const Card = styled.section<{ $tone?: "success" | "info" | "warning" | "danger" | "neutral" }>`
  position: relative;
  background: linear-gradient(165deg, rgba(14, 22, 49, 0.94), rgba(9, 15, 37, 0.92));
  border: 1px solid rgba(152, 170, 255, 0.32);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(2, 6, 18, 0.5);

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, rgba(113, 188, 255, 0.85), rgba(139, 117, 255, 0.8), transparent);
    pointer-events: none;
  }
`;

const CardHeader = styled.div`
  padding: 0.9rem 1rem;
  background: linear-gradient(180deg, rgba(18, 28, 62, 0.96), rgba(13, 21, 48, 0.94));
  border-bottom: 1px solid rgba(153, 171, 255, 0.24);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dce8ff;

  h3 {
    font-size: 1rem;
    margin: 0;
  }
`;

const CardBody = styled.div`
  padding: 1rem;
  color: #dce8ff;

  p {
    margin: 0 0 0.8rem;
    color: rgba(233, 241, 255, 0.92);
    font-size: 0.92rem;
    line-height: 1.42;
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
  background: linear-gradient(135deg, #2f66ff, #4960ff);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(39, 74, 189, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #356dfd, #565fff);
  }
`;

const PrimaryButton = styled.button`
  ${buttonBase}
  background: linear-gradient(135deg, #2f66ff, #4960ff);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(39, 74, 189, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #356dfd, #565fff);
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
    color: rgba(226, 236, 255, 0.92);
  }

  input,
  select {
    width: 100%;
    border: 1px solid rgba(153, 171, 255, 0.38);
    background: rgba(18, 28, 60, 0.9);
    color: #f5f9ff;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ResultBlock = styled.div`
  border: 1px dashed rgba(153, 171, 255, 0.4);
  border-radius: 8px;
  padding: 0.7rem;
  background: rgba(14, 23, 53, 0.84);
  color: rgba(227, 236, 255, 0.94);
`;

const Placeholder = styled.div`
  color: rgba(221, 233, 255, 0.9);
  font-size: 0.86rem;
`;

const StatLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 0.35rem 0;
  border-bottom: 1px dashed rgba(153, 171, 255, 0.36);
  color: rgba(213, 225, 255, 0.9);
  font-size: 0.86rem;

  &:last-child {
    border-bottom: none;
  }

  strong {
    color: #f2f7ff;
  }
`;

const Details = styled.details`
  margin-top: 0.55rem;

  summary {
    cursor: pointer;
    font-size: 0.84rem;
    color: rgba(229, 238, 255, 0.94);
  }
`;

const List = styled.ul`
  margin: 0.5rem 0 0 1rem;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.8rem;
  color: rgba(224, 235, 255, 0.92);
  padding-right: 0.4rem;
`;

const InfoStrip = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: rgba(226, 236, 255, 0.94);

  strong {
    color: #f2f7ff;
  }

  svg {
    color: #6ab7ff;
  }
`;

const RealtimeHint = styled.div`
  margin-bottom: 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(150, 170, 255, 0.42);
  background: rgba(23, 34, 72, 0.88);
  color: rgba(228, 237, 255, 0.95);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  padding: 7px 10px;

  strong {
    color: #f1f6ff;
  }
`;

const BlockedIpList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const BlockedIpRow = styled.div`
  border: 1px solid rgba(153, 171, 255, 0.34);
  border-radius: 10px;
  background: rgba(14, 22, 47, 0.86);
  padding: 0.65rem 0.72rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;

  strong {
    display: block;
    color: #f4f8ff;
    font-size: 0.86rem;
  }

  small {
    display: block;
    color: rgba(220, 232, 255, 0.86);
    font-size: 0.75rem;
    margin-top: 2px;
  }
`;

const FloatingModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2400;
  background:
    linear-gradient(90deg, rgba(4, 9, 21, 0.45) 0%, rgba(4, 9, 21, 0.7) 56%, rgba(4, 9, 21, 0.82) 100%);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  padding: 18px;
  animation: ${modalOverlayFadeIn} 200ms ease;

  @media (max-width: 900px) {
    padding: 0;
  }
`;

const FloatingModalCard = styled.div`
  width: clamp(340px, 25vw, 560px);
  height: calc(100vh - 36px);
  max-height: 100%;
  border-radius: 16px;
  border: 1px solid rgba(152, 171, 255, 0.42);
  background:
    radial-gradient(circle at 15% 5%, rgba(96, 180, 255, 0.16), transparent 46%),
    linear-gradient(165deg, rgba(12, 20, 46, 0.98), rgba(8, 14, 34, 0.97));
  box-shadow: 0 18px 38px rgba(1, 4, 14, 0.56);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${drawerSlideIn} 260ms cubic-bezier(0.2, 0.86, 0.28, 1);

  @media (max-width: 900px) {
    width: 100%;
    height: 100%;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
`;

const FloatingModalHead = styled.div`
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(153, 171, 255, 0.26);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h4 {
    margin: 0;
    color: #f4f8ff;
    font-size: 1rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(220, 232, 255, 0.9);
    font-size: 0.82rem;
  }
`;

const FloatingModalBody = styled.div`
  padding: 0.95rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1 1 auto;
  overflow-y: auto;
`;

const FloatingModalClose = styled.button`
  border: 1px solid rgba(255, 139, 169, 0.5);
  border-radius: 10px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 24, 44, 0.78);
  color: #ffd9e7;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  &:hover {
    background: rgba(87, 30, 63, 0.88);
    border-color: rgba(255, 174, 198, 0.74);
    transform: scale(1.03);
  }
`;

export default SettingsView;
