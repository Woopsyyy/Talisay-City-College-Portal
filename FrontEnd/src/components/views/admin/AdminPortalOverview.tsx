import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import baseStyled, { keyframes } from "styled-components";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Database,
  Ellipsis,
  ExternalLink,
  Gauge,
  HardDrive,
  LogIn,
  LockKeyhole,
  MapPin,
  PieChart,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { AdminAPI } from "services/apis/admin";
import { getActiveUsersSnapshot, subscribeToActiveUsers } from "../../../services/activeUsers";
import { getAvatarUrl } from "../../../services/apis/avatar";
import { supabase } from "../../../supabaseClient";
import {
  ADMIN_RUNTIME_GUARD,
  computeAdaptiveBackoffMs,
} from "../../../config/runtimeGuards";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

type OverviewStats = {
  totalUsers: number;
  pendingRequests: number;
  students: number;
  teachers: number;
  admins: number;
  staff: number;
};

type MonitoringSnapshot = {
  checkedAt: string | null;
  databaseHealthy: boolean | null;
  databaseLatencyMs: number | null;
  storageTotalBytes: number;
  storageDeltaBytes: number;
  storageSpikeDetected: boolean;
  backupCount: number;
  latestBackupAt: string | null;
  schedulerEnabled: boolean;
  schedulerLastReportAt: string | null;
};

type MonitoringServiceRow = {
  key: string;
  service: string;
  provider: string;
  health: string;
  lastCheck: string;
  realtime: string;
  traffic: string;
  actionLabel: string;
  actionHref: string;
};

type LoginActivityRow = {
  id: string;
  username: string;
  fullName: string;
  room: string;
  ipAddress: string;
  role: string;
  loggedAt: string;
  avatarUrl: string;
};
type DayOffStatus = "present" | "on_leave" | "on_holiday" | "absent";
type DayOffRosterRow = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  avatarUrl: string;
  dayOffStatus: DayOffStatus;
  statusUpdatedAt: string | null;
};

type Timeframe = "weekly" | "monthly" | "quarterly";
type AnalyticsWindow = "short" | "medium" | "full";

type ChartPoint = {
  label: string;
  value: number;
  target: number;
};

type CoordPoint = {
  x: number;
  y: number;
};

const styled = baseStyled as any;

const INITIAL_STATS: OverviewStats = {
  totalUsers: 0,
  pendingRequests: 0,
  students: 0,
  teachers: 0,
  admins: 0,
  staff: 0,
};

const INITIAL_MONITORING: MonitoringSnapshot = {
  checkedAt: null,
  databaseHealthy: null,
  databaseLatencyMs: null,
  storageTotalBytes: 0,
  storageDeltaBytes: 0,
  storageSpikeDetected: false,
  backupCount: 0,
  latestBackupAt: null,
  schedulerEnabled: false,
  schedulerLastReportAt: null,
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 290;
const CHART_PADDING = 28;
const MINI_CHART_WIDTH = 520;
const MINI_CHART_HEIGHT = 180;
const MINI_CHART_PADDING = 18;
const LOGIN_PAGE_SIZE = 5;
const ANALYTICS_WINDOW_LIMITS: Record<AnalyticsWindow, { login: number; telemetry: number; label: string }> = {
  short: { login: 5, telemetry: 4, label: "Short window" },
  medium: { login: 10, telemetry: 6, label: "Medium window" },
  full: { login: 14, telemetry: 8, label: "Full window" },
};
const ANALYTICS_WINDOW_OPTIONS: Array<{ value: AnalyticsWindow; label: string }> = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "full", label: "Full" },
];
const ANALYTICS_ROLE_OPTIONS: Array<{
  value: "all" | "students" | "teachers" | "admins" | "staff";
  label: string;
}> = [
  { value: "all", label: "All roles" },
  { value: "students", label: "Students" },
  { value: "teachers", label: "Teachers" },
  { value: "admins", label: "Admins" },
  { value: "staff", label: "Staff" },
];

const FRAME_LABELS: Record<Timeframe, string[]> = {
  weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  monthly: ["W1", "W2", "W3", "W4", "W5", "W6"],
  quarterly: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
};

const LOGIN_FALLBACK_AVATAR = "/images/tcc-logo.png";
const DAY_OFF_LOG_LIMIT = 600;
const DAY_OFF_STATUSES: DayOffStatus[] = ["present", "on_leave", "on_holiday", "absent"];
const DAY_OFF_ELIGIBLE_ROLES = new Set([
  "admin",
  "teacher",
  "faculty",
  "nt",
  "staff",
  "osas",
  "treasury",
]);

const isSampleAvatar = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "images/sample.jpg" ||
    normalized === "/images/sample.jpg" ||
    normalized.endsWith("/images/sample.jpg")
  );
};

const normalizeDayOffStatus = (value: unknown): DayOffStatus => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "on_leave") return "on_leave";
  if (normalized === "on_holiday") return "on_holiday";
  if (normalized === "absent") return "absent";
  return "present";
};

const formatDayOffStatus = (value: DayOffStatus) => {
  if (value === "on_leave") return "On Leave";
  if (value === "on_holiday") return "On Holiday";
  if (value === "absent") return "Absent";
  return "Present";
};

const collectUserRoleSet = (user: any) => {
  const roleSet = new Set<string>();
  const pushRole = (entry: unknown) => {
    const token = String(entry || "").trim().toLowerCase();
    if (!token) return;
    roleSet.add(token);
    if (token === "nt") roleSet.add("staff");
    if (token === "staff") roleSet.add("nt");
  };

  pushRole(user?.role);
  if (Array.isArray(user?.roles)) {
    user.roles.forEach(pushRole);
  } else {
    pushRole(user?.roles);
  }
  pushRole(user?.sub_role);
  if (Array.isArray(user?.sub_roles)) {
    user.sub_roles.forEach(pushRole);
  } else {
    pushRole(user?.sub_roles);
  }

  return roleSet;
};

const isDayOffEligibleUser = (user: any) => {
  const roleSet = collectUserRoleSet(user);
  if (roleSet.has("student")) return false;
  return Array.from(roleSet).some((role) => DAY_OFF_ELIGIBLE_ROLES.has(role));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatBytes = (bytes: number) => {
  const safeBytes = Number(bytes || 0);
  if (!Number.isFinite(safeBytes) || safeBytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = safeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const display = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${display} ${units[unitIndex]}`;
};

const formatRelativeDateTime = (iso: string | null) => {
  if (!iso) return "No data yet";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "No data yet";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createSparklineSeries = (baseInput: number, count = 7, seed = 1) => {
  const base = Math.max(baseInput, 10);
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin((index + 1 + seed) * 0.88) * base * 0.08;
    const slope = index * base * 0.03;
    return clamp(Math.round(base * 0.7 + slope + wave), 8, base * 1.4);
  });
};

const toRoleBucket = (value: unknown): "students" | "teachers" | "admins" | "staff" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "students";
  if (normalized.includes("admin")) return "admins";
  if (["teacher", "faculty", "dean"].some((token) => normalized.includes(token))) return "teachers";
  if (
    ["staff", "nt", "non-teaching", "osas", "treasury"].some((token) => normalized.includes(token))
  ) {
    return "staff";
  }
  return "students";
};

const buildChartCoords = (
  values: number[],
  width: number,
  height: number,
  padding: number,
): CoordPoint[] => {
  if (!values.length) return [];

  const max = Math.max(...values, 1);
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);

  return values.map((value, index) => {
    const x =
      padding +
      (values.length === 1 ? innerWidth / 2 : (index / Math.max(values.length - 1, 1)) * innerWidth);
    const y = padding + innerHeight - (value / max) * innerHeight;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });
};

const toLinePath = (points: CoordPoint[]) => {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
};

const toAreaPath = (points: CoordPoint[], height: number, padding: number) => {
  if (!points.length) return "";
  const baseline = height - padding;
  const first = points[0];
  const last = points[points.length - 1];
  return `${toLinePath(points)} L${last.x},${baseline} L${first.x},${baseline} Z`;
};

const AdminPortalOverview = () => {
  const [stats, setStats] = useState<OverviewStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringRefreshing, setMonitoringRefreshing] = useState(false);
  const [loginBoardRefreshing, setLoginBoardRefreshing] = useState(false);
  const [monitoringSnapshot, setMonitoringSnapshot] = useState<MonitoringSnapshot>(INITIAL_MONITORING);
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [monitorTimeline, setMonitorTimeline] = useState<
    { label: string; latencyMs: number; deltaMb: number }[]
  >([]);
  const [statusToast, setStatusToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ show: false, message: "", type: "success" });
  const [loginActivityRows, setLoginActivityRows] = useState<LoginActivityRow[]>([]);
  const [statusFeedPage, setStatusFeedPage] = useState(1);
  const [loginBoardPage, setLoginBoardPage] = useState(1);
  const [activeUsers, setActiveUsers] = useState(() => getActiveUsersSnapshot());
  const [dayOffModalOpen, setDayOffModalOpen] = useState(false);
  const [dayOffLoading, setDayOffLoading] = useState(false);
  const [dayOffSavingUserId, setDayOffSavingUserId] = useState<number | null>(null);
  const [dayOffRosterRows, setDayOffRosterRows] = useState<DayOffRosterRow[]>([]);
  const [dayOffSearch, setDayOffSearch] = useState("");
  const [monitoringBackoffMs, setMonitoringBackoffMs] = useState(0);
  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>("medium");
  const [analyticsRoleFilter, setAnalyticsRoleFilter] = useState<
    "all" | "students" | "teachers" | "admins" | "staff"
  >("all");
  const [analyticsRoomFilter, setAnalyticsRoomFilter] = useState("all");
  const [latencyAlertThresholdMs, setLatencyAlertThresholdMs] = useState(220);
  const [deltaAlertThresholdMb, setDeltaAlertThresholdMb] = useState(6);
  const [roomHotspotThreshold, setRoomHotspotThreshold] = useState(3);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const monitoringFetchGuardRef = useRef<{
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
  const loginBoardFetchGuardRef = useRef<{
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
  const dayOffFetchGuardRef = useRef<{
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
  const colorModeEnabled = true;

  const fetchOverviewStats = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const [dashboardStats, pendingRequests] = await Promise.all([
        AdminAPI.getDashboardStats().catch(() => null),
        AdminAPI.getAccountRequests({ status: "pending", limit: 500 }).catch(() => []),
      ]);

      const totalUsers = Number(dashboardStats?.users || 0);
      const students = Number(dashboardStats?.students || 0);
      const teachers = Number(dashboardStats?.teachers || 0);
      const admins = Number(dashboardStats?.admins || 0);
      const staff = Number(dashboardStats?.non_teaching || 0);
      const pendingCount = Array.isArray(pendingRequests) ? pendingRequests.length : 0;

      setStats({
        totalUsers,
        pendingRequests: pendingCount,
        students,
        teachers,
        admins,
        staff,
      });
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  const fetchMonitoringSnapshot = useCallback(async (silent = false) => {
    const fetchGuard = monitoringFetchGuardRef.current;
    const now = Date.now();
    const waitByGap = silent
      ? Math.max(0, ADMIN_RUNTIME_GUARD.minGapMs - (now - fetchGuard.lastRunAt))
      : 0;
    const waitByBackoff = Math.max(0, fetchGuard.blockedUntil - now);

    if (fetchGuard.inFlight) {
      fetchGuard.pending = true;
      return;
    }

    if (waitByGap > 0 || waitByBackoff > 0) {
      return;
    }

    fetchGuard.inFlight = true;
    fetchGuard.lastRunAt = now;

    try {
      setMonitoringRefreshing(true);

      const [storageHealth, databaseHealth, backups, scheduler] = await Promise.all([
        AdminAPI.getStorageHealth().catch(() => null),
        AdminAPI.getDatabaseHealth().catch(() => null),
        AdminAPI.getBackups().catch(() => []),
        AdminAPI.getMaintenanceScheduler().catch(() => null),
      ]);

      const backupRows = Array.isArray(backups) ? backups : [];
      const latestBackup = backupRows[0] || null;
      const latencyCandidate = Number(databaseHealth?.latency_ms);
      const dbLatencyMs = Number.isFinite(latencyCandidate)
        ? Math.max(0, Math.round(latencyCandidate))
        : null;

      const nextSnapshot: MonitoringSnapshot = {
        checkedAt: String(databaseHealth?.checked_at || new Date().toISOString()),
        databaseHealthy:
          typeof databaseHealth?.healthy === "boolean" ? Boolean(databaseHealth.healthy) : null,
        databaseLatencyMs: dbLatencyMs,
        storageTotalBytes: Number(storageHealth?.total_bytes || 0),
        storageDeltaBytes: Number(storageHealth?.delta_bytes || 0),
        storageSpikeDetected: Boolean(storageHealth?.spike_detected),
        backupCount: backupRows.length,
        latestBackupAt: latestBackup?.created_at || null,
        schedulerEnabled: Boolean(scheduler?.enabled),
        schedulerLastReportAt: scheduler?.last_report_at || null,
      };

      setMonitoringSnapshot(nextSnapshot);

      const nextPoint = {
        label: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        latencyMs: nextSnapshot.databaseLatencyMs ?? 0,
        deltaMb: Number(
          (Math.abs(Number(nextSnapshot.storageDeltaBytes || 0)) / (1024 * 1024)).toFixed(1),
        ),
      };

      setMonitorTimeline((prev) => [...prev, nextPoint].slice(-8));
      fetchGuard.failureCount = 0;
      fetchGuard.blockedUntil = 0;
      setMonitoringBackoffMs(0);
    } catch (_) {
      fetchGuard.failureCount += 1;
      const backoffMs = computeAdaptiveBackoffMs(fetchGuard.failureCount, {
        baseMs: ADMIN_RUNTIME_GUARD.retryBaseMs,
        maxMs: ADMIN_RUNTIME_GUARD.retryMaxMs,
        multiplier: ADMIN_RUNTIME_GUARD.retryMultiplier,
        jitterMs: ADMIN_RUNTIME_GUARD.retryJitterMs,
      });
      fetchGuard.blockedUntil = Date.now() + backoffMs;
      fetchGuard.pending = true;
      setMonitoringBackoffMs(backoffMs);
    } finally {
      fetchGuard.inFlight = false;
      setMonitoringRefreshing(false);
      if (fetchGuard.pending) {
        fetchGuard.pending = false;
        if (fetchGuard.timer != null) {
          clearTimeout(fetchGuard.timer);
        }
        fetchGuard.timer = window.setTimeout(() => {
          fetchGuard.timer = null;
          fetchMonitoringSnapshot(true);
        }, Math.max(ADMIN_RUNTIME_GUARD.pendingFlushMs, fetchGuard.blockedUntil - Date.now(), 0));
      }
    }
  }, []);

  const fetchLoginActivity = useCallback(async (silent = false) => {
    const fetchGuard = loginBoardFetchGuardRef.current;
    const now = Date.now();
    const waitByGap = silent
      ? Math.max(0, ADMIN_RUNTIME_GUARD.minGapMs - (now - fetchGuard.lastRunAt))
      : 0;
    const waitByBackoff = Math.max(0, fetchGuard.blockedUntil - now);

    if (fetchGuard.inFlight) {
      fetchGuard.pending = true;
      return;
    }

    if (waitByGap > 0 || waitByBackoff > 0) {
      return;
    }

    fetchGuard.inFlight = true;
    fetchGuard.lastRunAt = now;

    try {
      setLoginBoardRefreshing(true);
      const rows = await AdminAPI.getStatusLogs({
        action: "login",
        category: "auth",
        limit: 80,
      }).catch(() => []);

      const safeRows = Array.isArray(rows) ? rows : [];
      const usernamesNeedingAvatar = Array.from(
        new Set(
          safeRows
            .map((row) => {
              const metadata =
                row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
                  ? row.metadata
                  : {};
              const username = String(row?.actor_username || row?.target_username || "")
                .trim()
                .toLowerCase();
              if (!username) return "";
              const avatarFromMetadata = String(metadata?.avatar_url || "").trim();
              return isSampleAvatar(avatarFromMetadata) ? username : "";
            })
            .filter(Boolean),
        ),
      );

      const profileByUsername = new Map<string, { fullName: string; avatarUrl: string }>();
      if (usernamesNeedingAvatar.length > 0) {
        const users = await AdminAPI.getUsers({ compact: true }).catch(() => []);
        const safeUsers = Array.isArray(users) ? users : [];
        const matchedUsers = safeUsers.filter((user) =>
          usernamesNeedingAvatar.includes(String(user?.username || "").trim().toLowerCase()),
        );

        const resolvedAvatars = await Promise.all(
          matchedUsers.map(async (user) => {
            const username = String(user?.username || "").trim().toLowerCase();
            if (!username) return [username, LOGIN_FALLBACK_AVATAR] as const;
            try {
              const url = await getAvatarUrl(user?.id, user?.image_path);
              return [username, isSampleAvatar(url) ? LOGIN_FALLBACK_AVATAR : url] as const;
            } catch (_) {
              return [username, LOGIN_FALLBACK_AVATAR] as const;
            }
          }),
        );

        resolvedAvatars.forEach(([username, avatar]) => {
          const user = matchedUsers.find(
            (row) => String(row?.username || "").trim().toLowerCase() === username,
          );
          profileByUsername.set(username, {
            fullName: String(user?.full_name || user?.username || "").trim(),
            avatarUrl: avatar || LOGIN_FALLBACK_AVATAR,
          });
        });
      }

      const mapped = safeRows
        .map((row): LoginActivityRow | null => {
          const metadata =
            row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? row.metadata
              : {};
          const message = String(row?.message || "").trim();
          const fullNameFromMessage = message.endsWith(" logged in.")
            ? message.replace(/ logged in\.$/, "").trim()
            : "";
          const username = String(row?.actor_username || row?.target_username || "").trim();
          if (!username) return null;
          const fullName = String(
            metadata?.full_name || metadata?.actor_full_name || fullNameFromMessage || username,
          ).trim();
          const room = String(
            metadata?.room || metadata?.section || metadata?.location || "Unassigned",
          ).trim();
          const ipAddress = String(
            metadata?.client_ip || metadata?.ip_address || metadata?.ip || "Unknown",
          ).trim();
          const avatarFromMetadata = String(metadata?.avatar_url || "").trim();
          const profile = profileByUsername.get(username.toLowerCase());
          const avatarUrl = isSampleAvatar(avatarFromMetadata)
            ? profile?.avatarUrl || LOGIN_FALLBACK_AVATAR
            : avatarFromMetadata;
          const resolvedName = fullName || profile?.fullName || username;

          return {
            id: String(row?.id || `${row?.created_at}-${username}`),
            username,
            fullName: resolvedName,
            room: room || "Unassigned",
            ipAddress: ipAddress || "Unknown",
            role: String(row?.actor_role || row?.target_role || "user")
              .trim()
              .toUpperCase(),
            loggedAt: String(row?.created_at || ""),
            avatarUrl: avatarUrl || LOGIN_FALLBACK_AVATAR,
          };
        })
        .filter(Boolean) as LoginActivityRow[];

      setLoginActivityRows(mapped.slice(0, 14));
      fetchGuard.failureCount = 0;
      fetchGuard.blockedUntil = 0;
    } catch (_) {
      fetchGuard.failureCount += 1;
      const backoffMs = computeAdaptiveBackoffMs(fetchGuard.failureCount, {
        baseMs: ADMIN_RUNTIME_GUARD.retryBaseMs,
        maxMs: ADMIN_RUNTIME_GUARD.retryMaxMs,
        multiplier: ADMIN_RUNTIME_GUARD.retryMultiplier,
        jitterMs: ADMIN_RUNTIME_GUARD.retryJitterMs,
      });
      fetchGuard.blockedUntil = Date.now() + backoffMs;
      fetchGuard.pending = true;
    } finally {
      fetchGuard.inFlight = false;
      setLoginBoardRefreshing(false);
      if (fetchGuard.pending) {
        fetchGuard.pending = false;
        if (fetchGuard.timer != null) {
          clearTimeout(fetchGuard.timer);
        }
        fetchGuard.timer = window.setTimeout(() => {
          fetchGuard.timer = null;
          fetchLoginActivity(true);
        }, Math.max(ADMIN_RUNTIME_GUARD.pendingFlushMs, fetchGuard.blockedUntil - Date.now(), 0));
      }
    }
  }, []);

  const fetchDayOffRoster = useCallback(async (silent = false, forceRefresh = false) => {
    const fetchGuard = dayOffFetchGuardRef.current;
    const now = Date.now();
    const waitByGap = silent
      ? Math.max(0, ADMIN_RUNTIME_GUARD.minGapMs - (now - fetchGuard.lastRunAt))
      : 0;
    const waitByBackoff = Math.max(0, fetchGuard.blockedUntil - now);

    if (fetchGuard.inFlight) {
      fetchGuard.pending = true;
      return;
    }

    if (waitByGap > 0 || waitByBackoff > 0) {
      return;
    }

    fetchGuard.inFlight = true;
    fetchGuard.lastRunAt = now;

    try {
      if (!silent || dayOffModalOpen) {
        setDayOffLoading(true);
      }

      const [users, attendanceLogs] = await Promise.all([
        AdminAPI.getUsers({ compact: true, force_refresh: forceRefresh }).catch(() => []),
        AdminAPI.getStatusLogs({
          category: "attendance",
          limit: DAY_OFF_LOG_LIMIT,
          force_refresh: forceRefresh,
        }).catch(() => []),
      ]);

      const safeUsers = (Array.isArray(users) ? users : []).filter((user) =>
        isDayOffEligibleUser(user),
      );
      const logs = Array.isArray(attendanceLogs) ? attendanceLogs : [];

      const latestStatusByUser = new Map<number, { status: DayOffStatus; updatedAt: string | null }>();
      logs.forEach((row) => {
        const action = String(row?.action || "").trim().toLowerCase();
        if (!["day_off_status_set", "day_off_status_cleared"].includes(action)) return;

        const targetUserId = Number(row?.target_user_id);
        if (!Number.isFinite(targetUserId) || targetUserId <= 0) return;
        if (latestStatusByUser.has(targetUserId)) return;

        const metadata =
          row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? row.metadata
            : {};

        const status =
          action === "day_off_status_cleared"
            ? "present"
            : normalizeDayOffStatus(metadata?.day_off_status);
        latestStatusByUser.set(targetUserId, {
          status,
          updatedAt: String(row?.created_at || "").trim() || null,
        });
      });

      const avatarEntries = await Promise.all(
        safeUsers.map(async (user) => {
          const userId = Number(user?.id);
          if (!Number.isFinite(userId) || userId <= 0) {
            return [0, LOGIN_FALLBACK_AVATAR] as const;
          }
          try {
            const resolved = await getAvatarUrl(userId, user?.image_path);
            return [userId, isSampleAvatar(resolved) ? LOGIN_FALLBACK_AVATAR : resolved] as const;
          } catch (_) {
            return [userId, LOGIN_FALLBACK_AVATAR] as const;
          }
        }),
      );
      const avatarMap = new Map<number, string>(avatarEntries as Array<[number, string]>);

      const rows: DayOffRosterRow[] = safeUsers
        .map((user) => {
          const userId = Number(user?.id);
          if (!Number.isFinite(userId) || userId <= 0) return null;
          const roleSet = collectUserRoleSet(user);
          const roleLabel = roleSet.has("admin")
            ? "ADMIN"
            : roleSet.has("teacher") || roleSet.has("faculty")
              ? "TEACHER"
              : "STAFF";
          const statusEntry = latestStatusByUser.get(userId);
          const dayOffStatus = statusEntry?.status || "present";

          return {
            id: userId,
            username: String(user?.username || "").trim(),
            fullName: String(user?.full_name || user?.username || `User #${userId}`).trim(),
            role: roleLabel,
            avatarUrl: avatarMap.get(userId) || LOGIN_FALLBACK_AVATAR,
            dayOffStatus,
            statusUpdatedAt: statusEntry?.updatedAt || null,
          };
        })
        .filter(Boolean) as DayOffRosterRow[];

      rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setDayOffRosterRows(rows);

      fetchGuard.failureCount = 0;
      fetchGuard.blockedUntil = 0;
    } catch (_) {
      fetchGuard.failureCount += 1;
      const backoffMs = computeAdaptiveBackoffMs(fetchGuard.failureCount, {
        baseMs: ADMIN_RUNTIME_GUARD.retryBaseMs,
        maxMs: ADMIN_RUNTIME_GUARD.retryMaxMs,
        multiplier: ADMIN_RUNTIME_GUARD.retryMultiplier,
        jitterMs: ADMIN_RUNTIME_GUARD.retryJitterMs,
      });
      fetchGuard.blockedUntil = Date.now() + backoffMs;
      fetchGuard.pending = true;
    } finally {
      fetchGuard.inFlight = false;
      if (!silent || dayOffModalOpen) {
        setDayOffLoading(false);
      }
      if (fetchGuard.pending) {
        fetchGuard.pending = false;
        if (fetchGuard.timer != null) {
          clearTimeout(fetchGuard.timer);
        }
        fetchGuard.timer = window.setTimeout(() => {
          fetchGuard.timer = null;
          fetchDayOffRoster(true, forceRefresh);
        }, Math.max(ADMIN_RUNTIME_GUARD.pendingFlushMs, fetchGuard.blockedUntil - Date.now(), 0));
      }
    }
  }, [dayOffModalOpen]);

  const handleSetDayOffStatus = useCallback(
    async (row: DayOffRosterRow, status: DayOffStatus) => {
      if (!row?.id || dayOffSavingUserId != null) return;

      try {
        setDayOffSavingUserId(row.id);
        await AdminAPI.setUserDayOffStatus(row.id, status);
        setDayOffRosterRows((prev) =>
          prev.map((entry) =>
            entry.id === row.id
              ? {
                  ...entry,
                  dayOffStatus: status,
                  statusUpdatedAt: new Date().toISOString(),
                }
              : entry,
          ),
        );
        setStatusToast({
          show: true,
          type: "success",
          message: `${row.fullName} marked as ${formatDayOffStatus(status)}.`,
        });
        fetchDayOffRoster(true, true);
      } catch (error: any) {
        setStatusToast({
          show: true,
          type: "error",
          message: error?.message || "Failed to update Day Off status.",
        });
      } finally {
        setDayOffSavingUserId(null);
      }
    },
    [dayOffSavingUserId, fetchDayOffRoster],
  );

  useEffect(() => {
    fetchOverviewStats();
    fetchMonitoringSnapshot();
    fetchLoginActivity();
    fetchDayOffRoster();
  }, [fetchDayOffRoster, fetchLoginActivity, fetchMonitoringSnapshot, fetchOverviewStats]);

  const queueRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) return;
    realtimeRefreshTimerRef.current = window.setTimeout(async () => {
      realtimeRefreshTimerRef.current = null;
      await fetchOverviewStats(true);
    }, 220);
  }, [fetchOverviewStats]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveUsers((snapshot) => {
      setActiveUsers(snapshot);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel("admin-portal-overview-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          queueRealtimeRefresh();
          fetchDayOffRoster(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_requests" },
        () => queueRealtimeRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_logs" },
        (payload: any) => {
          const row = payload?.new || {};
          const action = String(row?.action || "").trim().toLowerCase();
          const metadata =
            row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? row.metadata
              : {};
          const actor = String(row?.actor_username || row?.target_username || "user").trim();

          if (["day_off_status_set", "day_off_status_cleared"].includes(action)) {
            const nextStatus =
              action === "day_off_status_cleared"
                ? "Present"
                : formatDayOffStatus(normalizeDayOffStatus(metadata?.day_off_status));
            setStatusToast({
              show: true,
              type: "warning",
              message: `Day Off update: ${actor} is now ${nextStatus}.`,
            });
            fetchDayOffRoster(true, true);
            return;
          }

          if (!["login", "admin_login_ip_change_detected", "session_ip_rotated"].includes(action)) {
            return;
          }
          if (action === "login") {
            const ip = String(metadata?.client_ip || metadata?.ip || "unknown").trim();
            setStatusToast({
              show: true,
              type: "success",
              message: `New login: ${actor} (${ip}).`,
            });
          }
          fetchLoginActivity(true);
        },
      )
      .subscribe();

    const handleFocus = () => {
      queueRealtimeRefresh();
      fetchLoginActivity(true);
      fetchMonitoringSnapshot(true);
      fetchDayOffRoster(true);
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        queueRealtimeRefresh();
        fetchLoginActivity(true);
        fetchMonitoringSnapshot(true);
        fetchDayOffRoster(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    queueRealtimeRefresh();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchDayOffRoster, fetchLoginActivity, fetchMonitoringSnapshot, queueRealtimeRefresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchMonitoringSnapshot(true);
      fetchLoginActivity(true);
      fetchDayOffRoster(true);
    }, ADMIN_RUNTIME_GUARD.intervalMs);

    const handleFocus = () => {
      fetchMonitoringSnapshot(true);
      fetchLoginActivity(true);
      fetchDayOffRoster(true);
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchMonitoringSnapshot(true);
        fetchLoginActivity(true);
        fetchDayOffRoster(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (monitoringFetchGuardRef.current.timer != null) {
        clearTimeout(monitoringFetchGuardRef.current.timer);
        monitoringFetchGuardRef.current.timer = null;
      }
      if (loginBoardFetchGuardRef.current.timer != null) {
        clearTimeout(loginBoardFetchGuardRef.current.timer);
        loginBoardFetchGuardRef.current.timer = null;
      }
      if (dayOffFetchGuardRef.current.timer != null) {
        clearTimeout(dayOffFetchGuardRef.current.timer);
        dayOffFetchGuardRef.current.timer = null;
      }
    };
  }, [fetchDayOffRoster, fetchLoginActivity, fetchMonitoringSnapshot]);

  const metricCards = useMemo(() => {
    const activeNow = activeUsers.total;
    const activeRatio = stats.totalUsers
      ? clamp(activeNow / Math.max(stats.totalUsers, 1), 0, 1)
      : 0;
    const satisfactionRate = Number((74 + activeRatio * 19 + (stats.students > 0 ? 3 : 0)).toFixed(1));

    return [
      {
        id: "total_users",
        label: "Total Users",
        value: stats.totalUsers,
        trend: "+2.4% from previous cycle",
        icon: Users,
        accent: colorModeEnabled ? "#4db6ff" : "#7aa2ff",
        series: createSparklineSeries(stats.totalUsers, 9, 1),
      },
      {
        id: "pending",
        label: "Pending Requests",
        value: stats.pendingRequests,
        trend: "Approval queue health",
        icon: WalletCards,
        accent: colorModeEnabled ? "#ffc658" : "#f7cc61",
        series: createSparklineSeries(stats.pendingRequests + 10, 9, 2),
      },
      {
        id: "active_now",
        label: "Active Right Now",
        value: activeNow,
        trend: `${Math.round(activeRatio * 100)}% session activity`,
        icon: UserPlus,
        accent: colorModeEnabled ? "#40d8a0" : "#58e0aa",
        series: createSparklineSeries(activeNow + 15, 9, 3),
      },
      {
        id: "satisfaction",
        label: "Satisfaction",
        value: `${satisfactionRate}%`,
        trend: "+3.1% sentiment shift",
        icon: UserRoundCheck,
        accent: colorModeEnabled ? "#c57aff" : "#d39dff",
        series: createSparklineSeries(satisfactionRate + 18, 9, 4),
      },
    ];
  }, [activeUsers.total, colorModeEnabled, stats.pendingRequests, stats.students, stats.totalUsers]);

  const monitoringCards = useMemo(() => {
    const dbHealth =
      monitoringSnapshot.databaseHealthy == null
        ? "Unknown"
        : monitoringSnapshot.databaseHealthy
          ? "Healthy"
          : "Issue";
    const deltaRaw = Number(monitoringSnapshot.storageDeltaBytes || 0);
    const deltaPrefix = deltaRaw > 0 ? "+" : deltaRaw < 0 ? "-" : "";
    const deltaValue = formatBytes(Math.abs(deltaRaw));

    return [
      {
        id: "monitor-db",
        label: "Supabase DB",
        value: dbHealth,
        detail:
          monitoringSnapshot.databaseLatencyMs == null
            ? "Latency pending"
            : `${monitoringSnapshot.databaseLatencyMs} ms latency`,
        icon: Database,
        accent: monitoringSnapshot.databaseHealthy === false ? "#ff8e8e" : "#70bbff",
        href: "https://supabase.com/dashboard",
        linkLabel: "Open Supabase",
      },
      {
        id: "monitor-storage",
        label: "Storage + Bandwidth",
        value: formatBytes(monitoringSnapshot.storageTotalBytes),
        detail: `${deltaPrefix}${deltaValue} delta`,
        icon: HardDrive,
        accent: monitoringSnapshot.storageSpikeDetected ? "#ffbf6c" : "#7ef0bf",
        href: "https://supabase.com/dashboard",
        linkLabel: "Storage Console",
      },
      {
        id: "monitor-backups",
        label: "Backups",
        value: `${monitoringSnapshot.backupCount}`,
        detail: monitoringSnapshot.latestBackupAt
          ? `Last: ${formatRelativeDateTime(monitoringSnapshot.latestBackupAt)}`
          : "No backup yet",
        icon: Gauge,
        accent: monitoringSnapshot.backupCount > 0 ? "#9bc1ff" : "#d7a1ff",
        href: "/admin/dashboard/server-maintenance",
        linkLabel: "Open Server Actions",
      },
      {
        id: "monitor-redis",
        label: "Appstash / Redis",
        value: "Linked",
        detail: "Use provider console for live traffic metrics",
        icon: WalletCards,
        accent: "#83a8ff",
        href: "https://console.upstash.com/",
        linkLabel: "Open Appstash",
      },
    ];
  }, [monitoringSnapshot]);

  const workforceSeries = useMemo<ChartPoint[]>(() => {
    const labels = FRAME_LABELS[timeframe];
    const base = clamp(stats.totalUsers * 0.56, 28, 92);

    return labels.map((label, index) => {
      const value = clamp(
        Math.round(base + Math.sin((index + 1) * 0.92) * 8 + Math.cos(index * 0.55) * 6),
        20,
        100,
      );
      const target = clamp(
        Math.round(base * 0.9 + Math.cos((index + 1) * 0.7) * 6 + 7),
        16,
        95,
      );

      return {
        label,
        value,
        target,
      };
    });
  }, [stats.totalUsers, timeframe]);

  const workforceChart = useMemo(() => {
    const valueList = workforceSeries.map((item) => item.value);
    const targetList = workforceSeries.map((item) => item.target);
    const peak = Math.max(...valueList, ...targetList, 1);

    const scaleValues = (entries: number[]) => entries.map((entry) => (entry / peak) * 100);

    const valueCoords = buildChartCoords(
      scaleValues(valueList),
      CHART_WIDTH,
      CHART_HEIGHT,
      CHART_PADDING,
    );
    const targetCoords = buildChartCoords(
      scaleValues(targetList),
      CHART_WIDTH,
      CHART_HEIGHT,
      CHART_PADDING,
    );

    return {
      valueCoords,
      targetCoords,
      valuePath: toLinePath(valueCoords),
      targetPath: toLinePath(targetCoords),
      areaPath: toAreaPath(valueCoords, CHART_HEIGHT, CHART_PADDING),
    };
  }, [workforceSeries]);

  const dayOffSummary = useMemo(() => {
    const summary = {
      total: dayOffRosterRows.length,
      present: 0,
      onLeave: 0,
      onHoliday: 0,
      absent: 0,
    };

    dayOffRosterRows.forEach((row) => {
      const status = normalizeDayOffStatus(row?.dayOffStatus);
      if (status === "on_leave") summary.onLeave += 1;
      else if (status === "on_holiday") summary.onHoliday += 1;
      else if (status === "absent") summary.absent += 1;
      else summary.present += 1;
    });

    return summary;
  }, [dayOffRosterRows]);

  const attendance = useMemo(() => {
    const trackedTotal = dayOffSummary.total;
    if (trackedTotal > 0) {
      const onLeave = dayOffSummary.onLeave;
      const onHoliday = dayOffSummary.onHoliday;
      const absentManual = dayOffSummary.absent;
      const available = Math.max(0, trackedTotal - onLeave - onHoliday - absentManual);
      const present = clamp(activeUsers.total, 0, available);
      const absent = Math.max(absentManual, available - present);
      return {
        total: trackedTotal,
        present,
        onLeave,
        onHoliday,
        absent,
      };
    }

    const total = Math.max(stats.totalUsers, 1);
    const present = clamp(activeUsers.total, 0, total);
    const onLeave = 0;
    const onHoliday = 0;
    const absent = Math.max(0, total - present);
    return {
      total,
      present,
      onLeave,
      onHoliday,
      absent,
    };
  }, [activeUsers.total, dayOffSummary, stats.totalUsers]);

  const attendanceRing = useMemo(() => {
    const total = Math.max(1, attendance.total);
    const presentStop = (attendance.present / total) * 100;
    const leaveStop = presentStop + (attendance.onLeave / total) * 100;
    const holidayStop = leaveStop + (attendance.onHoliday / total) * 100;

    return `conic-gradient(
      #60b5ff 0% ${presentStop}%,
      #f2c94c ${presentStop}% ${leaveStop}%,
      #67d86f ${leaveStop}% ${holidayStop}%,
      #b195ff ${holidayStop}% 100%
    )`;
  }, [attendance]);

  const roleBreakdown = useMemo(() => {
    const rows = [
      { label: "Students", value: stats.students, color: "#61b3ff" },
      { label: "Teachers", value: stats.teachers, color: "#7c5bff" },
      { label: "Admins", value: stats.admins, color: "#60e1ae" },
      { label: "Staff", value: stats.staff, color: "#f7c667" },
    ];

    const total = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);

    return rows.map((row) => ({
      ...row,
      percent: clamp(Math.round((row.value / total) * 100), 0, 100),
    }));
  }, [stats.admins, stats.staff, stats.students, stats.teachers]);

  const analyticsWindowConfig = useMemo(
    () => ANALYTICS_WINDOW_LIMITS[analyticsWindow] || ANALYTICS_WINDOW_LIMITS.medium,
    [analyticsWindow],
  );

  const analyticsRoomOptions = useMemo(() => {
    const uniqueRooms = Array.from(
      new Set(
        loginActivityRows
          .map((row) => String(row?.room || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: "All rooms" },
      ...uniqueRooms.map((room) => ({ value: room, label: room })),
    ];
  }, [loginActivityRows]);

  useEffect(() => {
    if (analyticsRoomFilter === "all") return;
    if (analyticsRoomOptions.some((option) => option.value === analyticsRoomFilter)) return;
    setAnalyticsRoomFilter("all");
  }, [analyticsRoomFilter, analyticsRoomOptions]);

  const scopedLoginRows = useMemo(() => {
    let rows = [...loginActivityRows];

    if (analyticsRoleFilter !== "all") {
      rows = rows.filter((row) => toRoleBucket(row?.role) === analyticsRoleFilter);
    }

    if (analyticsRoomFilter !== "all") {
      rows = rows.filter((row) => String(row?.room || "").trim() === analyticsRoomFilter);
    }

    return rows.slice(0, analyticsWindowConfig.login);
  }, [analyticsRoleFilter, analyticsRoomFilter, analyticsWindowConfig.login, loginActivityRows]);

  const scopedMonitorTimeline = useMemo(() => {
    return monitorTimeline.slice(-analyticsWindowConfig.telemetry);
  }, [analyticsWindowConfig.telemetry, monitorTimeline]);

  const roleCapacityRows = useMemo(() => {
    const recentByRole = {
      students: 0,
      teachers: 0,
      admins: 0,
      staff: 0,
    };

    scopedLoginRows.forEach((row) => {
      const bucket = toRoleBucket(row?.role);
      recentByRole[bucket] += 1;
    });

    const rows = [
      { key: "students", label: "Students", total: Math.max(0, Number(stats.students || 0)), color: "#61b3ff" },
      { key: "teachers", label: "Teachers", total: Math.max(0, Number(stats.teachers || 0)), color: "#7c5bff" },
      { key: "admins", label: "Admins", total: Math.max(0, Number(stats.admins || 0)), color: "#60e1ae" },
      { key: "staff", label: "Staff", total: Math.max(0, Number(stats.staff || 0)), color: "#f7c667" },
    ] as const;

    const maxTotal = Math.max(1, ...rows.map((row) => row.total));
    const filteredRows = rows.filter((row) =>
      analyticsRoleFilter === "all" ? true : row.key === analyticsRoleFilter,
    );

    return filteredRows.map((row) => {
      const recent = recentByRole[row.key] || 0;
      const utilization = row.total > 0 ? clamp(Math.round((recent / row.total) * 100), 0, 100) : 0;
      return {
        ...row,
        recent,
        utilization,
        totalWidth: Math.max(9, Math.round((row.total / maxTotal) * 100)),
      };
    });
  }, [analyticsRoleFilter, scopedLoginRows, stats.admins, stats.staff, stats.students, stats.teachers]);

  const monitoringServiceRows = useMemo<MonitoringServiceRow[]>(() => {
    const dbHealth =
      monitoringSnapshot.databaseHealthy == null
        ? "Pending"
        : monitoringSnapshot.databaseHealthy
          ? "Healthy"
          : "Alert";
    const deltaRaw = Number(monitoringSnapshot.storageDeltaBytes || 0);
    const deltaSign = deltaRaw > 0 ? "+" : deltaRaw < 0 ? "-" : "";
    const checkedLabel = formatRelativeDateTime(monitoringSnapshot.checkedAt);

    return [
      {
        key: "supabase-db",
        service: "Supabase Database",
        provider: "Supabase",
        health: dbHealth,
        lastCheck: checkedLabel,
        realtime: "Realtime",
        traffic:
          monitoringSnapshot.databaseLatencyMs == null
            ? "Latency not sampled yet"
            : `${monitoringSnapshot.databaseLatencyMs} ms latency`,
        actionLabel: "Open Supabase",
        actionHref: "https://supabase.com/dashboard",
      },
      {
        key: "supabase-storage",
        service: "Storage / Bandwidth",
        provider: "Supabase Storage",
        health: monitoringSnapshot.storageSpikeDetected ? "Spike detected" : "Stable",
        lastCheck: checkedLabel,
        realtime: "Realtime",
        traffic: `${formatBytes(monitoringSnapshot.storageTotalBytes)} total | ${deltaSign}${formatBytes(Math.abs(deltaRaw))} delta`,
        actionLabel: "View Storage",
        actionHref: "https://supabase.com/dashboard",
      },
      {
        key: "redis-appstash",
        service: "Appstash / Redis",
        provider: "Upstash / Redis",
        health: "External monitor",
        lastCheck: checkedLabel,
        realtime: "Provider-side",
        traffic: "Open Appstash/Redis console for live throughput and bandwidth",
        actionLabel: "Open Appstash",
        actionHref: "https://console.upstash.com/",
      },
      {
        key: "backup-stream",
        service: "Backup Channel",
        provider: "Supabase Storage",
        health: monitoringSnapshot.backupCount > 0 ? "Available" : "No backup",
        lastCheck: monitoringSnapshot.latestBackupAt
          ? formatRelativeDateTime(monitoringSnapshot.latestBackupAt)
          : "No backup yet",
        realtime: monitoringSnapshot.schedulerEnabled ? "Scheduled" : "Manual",
        traffic: monitoringSnapshot.schedulerLastReportAt
          ? `Last report: ${formatRelativeDateTime(monitoringSnapshot.schedulerLastReportAt)}`
          : "No automated report yet",
        actionLabel: "Open Server Actions",
        actionHref: "/admin/dashboard/server-maintenance",
      },
      {
        key: "portal-sessions",
        service: "Portal Sessions",
        provider: "App telemetry",
        health: "Active",
        lastCheck: checkedLabel,
        realtime: "Realtime",
        traffic: `${activeUsers.total} active sessions`,
        actionLabel: "Open Status Logs",
        actionHref: "/admin/dashboard/status_logs",
      },
    ];
  }, [activeUsers.total, monitoringSnapshot]);

  const infrastructureRisk = useMemo(() => {
    const bucketCounts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };

    const toHealthBucket = (health: string) => {
      const normalized = String(health || "").trim().toLowerCase();
      if (!normalized || normalized.includes("pending") || normalized.includes("unknown")) return "unknown";
      if (normalized.includes("alert") || normalized.includes("issue")) return "critical";
      if (
        normalized.includes("spike") ||
        normalized.includes("manual") ||
        normalized.includes("no backup") ||
        normalized.includes("external")
      ) {
        return "warning";
      }
      return "healthy";
    };

    monitoringServiceRows.forEach((row) => {
      const bucket = toHealthBucket(row.health);
      bucketCounts[bucket] += 1;
    });

    const entries = [
      { key: "healthy", label: "Healthy", value: bucketCounts.healthy, color: "#57d8a2" },
      { key: "warning", label: "Warning", value: bucketCounts.warning, color: "#f7c667" },
      { key: "critical", label: "Critical", value: bucketCounts.critical, color: "#ff8e8e" },
      { key: "unknown", label: "Unknown", value: bucketCounts.unknown, color: "#a9b6ff" },
    ];
    const totalRaw = entries.reduce((sum, entry) => sum + entry.value, 0);
    const total = Math.max(1, totalRaw);

    let cursor = 0;
    const withPercents = entries.map((entry) => {
      const percent = (entry.value / total) * 100;
      const start = cursor;
      const end = cursor + percent;
      cursor = end;
      return {
        ...entry,
        percent: clamp(Math.round(percent), 0, 100),
        start,
        end,
      };
    });

    const gradientStops = withPercents.map(
      (entry) => `${entry.color} ${entry.start.toFixed(2)}% ${entry.end.toFixed(2)}%`,
    );

    const headline =
      bucketCounts.critical > 0
        ? `${bucketCounts.critical} critical endpoint(s) need immediate review.`
        : bucketCounts.warning > 0
          ? `${bucketCounts.warning} endpoint(s) in warning state.`
          : "All monitored endpoints are healthy.";

    return {
      entries: withPercents,
      totalServices: totalRaw,
      gradient: `conic-gradient(${gradientStops.join(", ")})`,
      headline,
    };
  }, [monitoringServiceRows]);

  const loginHotspots = useMemo(() => {
    const countsByRoom = new Map<string, number>();
    scopedLoginRows.forEach((row) => {
      const room = String(row?.room || "").trim() || "Unassigned";
      countsByRoom.set(room, (countsByRoom.get(room) || 0) + 1);
    });

    const sorted = Array.from(countsByRoom.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const peak = Math.max(1, ...sorted.map((entry) => entry[1]));
    return sorted.map(([room, count]) => ({
      room,
      count,
      width: Math.max(8, Math.round((count / peak) * 100)),
    }));
  }, [scopedLoginRows]);

  const telemetryMiniChart = useMemo(() => {
    if (!scopedMonitorTimeline.length) {
      return {
        labels: [] as string[],
        latencyPath: "",
        deltaPath: "",
        areaPath: "",
        averageLatency: 0,
        averageDelta: 0,
      };
    }

    const labels = scopedMonitorTimeline.map((row) => row.label);
    const latencyValues = scopedMonitorTimeline.map((row) => Math.max(0, Number(row.latencyMs || 0)));
    const deltaValues = scopedMonitorTimeline.map((row) => Math.max(0, Number(row.deltaMb || 0)));
    const peak = Math.max(1, ...latencyValues, ...deltaValues);
    const scaleSeries = (series: number[]) => series.map((value) => (value / peak) * 100);

    const latencyCoords = buildChartCoords(
      scaleSeries(latencyValues),
      MINI_CHART_WIDTH,
      MINI_CHART_HEIGHT,
      MINI_CHART_PADDING,
    );
    const deltaCoords = buildChartCoords(
      scaleSeries(deltaValues),
      MINI_CHART_WIDTH,
      MINI_CHART_HEIGHT,
      MINI_CHART_PADDING,
    );

    const averageLatency = Math.round(
      latencyValues.reduce((sum, value) => sum + value, 0) / Math.max(1, latencyValues.length),
    );
    const averageDelta = Number(
      (
        deltaValues.reduce((sum, value) => sum + value, 0) / Math.max(1, deltaValues.length)
      ).toFixed(1),
    );

    return {
      labels,
      latencyPath: toLinePath(latencyCoords),
      deltaPath: toLinePath(deltaCoords),
      areaPath: toAreaPath(latencyCoords, MINI_CHART_HEIGHT, MINI_CHART_PADDING),
      averageLatency,
      averageDelta,
    };
  }, [scopedMonitorTimeline]);

  const chartAlerts = useMemo(() => {
    const criticalCount = Number(
      infrastructureRisk.entries.find((entry) => entry.key === "critical")?.value || 0,
    );
    const highestHotspot = Number(loginHotspots[0]?.count || 0);
    const latencyAlert = telemetryMiniChart.averageLatency >= latencyAlertThresholdMs;
    const deltaAlert = telemetryMiniChart.averageDelta >= deltaAlertThresholdMb;
    const hotspotAlert = highestHotspot >= roomHotspotThreshold;
    return {
      criticalCount,
      highestHotspot,
      latencyAlert,
      deltaAlert,
      hotspotAlert,
      anyAlert: criticalCount > 0 || latencyAlert || deltaAlert || hotspotAlert,
    };
  }, [
    deltaAlertThresholdMb,
    infrastructureRisk.entries,
    latencyAlertThresholdMs,
    loginHotspots,
    roomHotspotThreshold,
    telemetryMiniChart.averageDelta,
    telemetryMiniChart.averageLatency,
  ]);

  const resetAnalyticsControls = () => {
    setAnalyticsWindow("medium");
    setAnalyticsRoleFilter("all");
    setAnalyticsRoomFilter("all");
    setLatencyAlertThresholdMs(220);
    setDeltaAlertThresholdMb(6);
    setRoomHotspotThreshold(3);
  };

  const monitorTimelinePeak = useMemo(() => {
    const values = monitorTimeline.flatMap((row) => [row.latencyMs, row.deltaMb]);
    return Math.max(1, ...values);
  }, [monitorTimeline]);

  const loginTotalPages = useMemo(
    () => Math.max(1, Math.ceil(loginActivityRows.length / LOGIN_PAGE_SIZE)),
    [loginActivityRows.length],
  );

  useEffect(() => {
    if (statusFeedPage > loginTotalPages) {
      setStatusFeedPage(loginTotalPages);
    }
    if (loginBoardPage > loginTotalPages) {
      setLoginBoardPage(loginTotalPages);
    }
  }, [loginBoardPage, loginTotalPages, statusFeedPage]);

  const statusFeedRows = useMemo(() => {
    if (!loginActivityRows.length) return [];
    const safePage = Math.min(statusFeedPage, loginTotalPages);
    const start = (safePage - 1) * LOGIN_PAGE_SIZE;
    return loginActivityRows.slice(start, start + LOGIN_PAGE_SIZE);
  }, [loginActivityRows, loginTotalPages, statusFeedPage]);

  const loginBoardRows = useMemo(() => {
    if (!loginActivityRows.length) return [];
    const safePage = Math.min(loginBoardPage, loginTotalPages);
    const start = (safePage - 1) * LOGIN_PAGE_SIZE;
    return loginActivityRows.slice(start, start + LOGIN_PAGE_SIZE);
  }, [loginActivityRows, loginBoardPage, loginTotalPages]);

  const filteredDayOffRows = useMemo(() => {
    const keyword = String(dayOffSearch || "").trim().toLowerCase();
    if (!keyword) return dayOffRosterRows;
    return dayOffRosterRows.filter((row) => {
      return (
        String(row?.fullName || "").toLowerCase().includes(keyword) ||
        String(row?.username || "").toLowerCase().includes(keyword) ||
        String(row?.role || "").toLowerCase().includes(keyword)
      );
    });
  }, [dayOffRosterRows, dayOffSearch]);

  if (loading) {
    return (
      <OverviewCanvas $colorMode={colorModeEnabled}>
        <OverviewSkeletonWrap>
          <OverviewSkeletonHeader>
            <OverviewSkeletonLine />
            <OverviewSkeletonLine $short />
          </OverviewSkeletonHeader>
          <PageSkeleton variant="dashboard" compact />
        </OverviewSkeletonWrap>
      </OverviewCanvas>
    );
  }

  return (
    <OverviewCanvas $colorMode={colorModeEnabled}>
      {statusToast.show ? (
        <Toast
          message={statusToast.message}
          type={statusToast.type}
          onClose={() => setStatusToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}

      <TopRow>
        <div>
          <TopEyebrow>Monitoring Command Center</TopEyebrow>
          <h3>Admin Monitoring Dashboard</h3>
          <p>Realtime system health for Supabase, bandwidth, backups, sessions, and external Redis/Appstash monitors.</p>
        </div>

        <TopActions>
          <RealtimeBadge data-active>
            <Sparkles size={14} />
            {refreshing || monitoringRefreshing || loginBoardRefreshing
              ? "Realtime syncing"
              : "Realtime active"}
            {monitoringBackoffMs > 0 ? (
              <BackoffTag>{Math.max(1, Math.round(monitoringBackoffMs / 1000))}s guard</BackoffTag>
            ) : null}
          </RealtimeBadge>
        </TopActions>
      </TopRow>

      <SecurityStrip>
        <SecurityCard>
          <SecurityHead>
            <LockKeyhole size={18} />
            <div>
              <h4>Admin Security Guidance</h4>
              <p>
                Unfamiliar login IPs trigger account notifications and rotate older sessions off the previous device.
                If login activity looks unusual, change your password immediately. IP resolution
                uses Supabase Edge Function when configured, with secure fallback lookup.
              </p>
            </div>
          </SecurityHead>
        </SecurityCard>

        <SecurityCard>
          <SecurityHead>
            <LogIn size={18} />
            <div>
              <h4>Live Login Status Box</h4>
              <p>Latest successful logins stream here and are also written into Status Logs.</p>
            </div>
          </SecurityHead>
          <StatusMetrics>
            <span>{loginBoardRefreshing ? "Updating login stream..." : "Login stream online"}</span>
            <span>{loginActivityRows.length} recent entries</span>
            <span>{activeUsers.total} active sessions</span>
            <span>
              Page {Math.min(statusFeedPage, loginTotalPages)} of {loginTotalPages}
            </span>
          </StatusMetrics>
          <StatusFeed>
            {statusFeedRows.map((row) => (
              <StatusFeedRow key={`feed-${row.id}`}>
                <img src={row.avatarUrl || LOGIN_FALLBACK_AVATAR} alt={row.username} />
                <div>
                  <strong>{row.fullName}</strong>
                  <small>@{row.username} | {row.ipAddress}</small>
                </div>
                <time>{formatRelativeDateTime(row.loggedAt)}</time>
              </StatusFeedRow>
            ))}
            {loginActivityRows.length > 0 ? (
              <InlinePager>
                <PagerButton
                  type="button"
                  onClick={() => setStatusFeedPage((prev) => Math.max(1, prev - 1))}
                  disabled={statusFeedPage <= 1}
                >
                  Previous
                </PagerButton>
                <PagerLabel>
                  {Math.min(statusFeedPage, loginTotalPages)} / {loginTotalPages}
                </PagerLabel>
                <PagerButton
                  type="button"
                  onClick={() =>
                    setStatusFeedPage((prev) => Math.min(loginTotalPages, prev + 1))
                  }
                  disabled={statusFeedPage >= loginTotalPages}
                >
                  Next
                </PagerButton>
              </InlinePager>
            ) : null}
            {loginActivityRows.length === 0 ? (
              <MonitoringHint>
                Waiting for login events. New sign-ins will appear here automatically.
              </MonitoringHint>
            ) : null}
          </StatusFeed>
        </SecurityCard>
      </SecurityStrip>

      <MonitoringStack>
        <PanelHead>
          <div>
            <h4>Monitoring Systems</h4>
            <p>Centralized health snapshot for infrastructure and traffic signals.</p>
          </div>
          <SmallBadge>
            <Sparkles size={13} />
            {monitoringRefreshing ? "Syncing telemetry" : "Telemetry loaded"}
          </SmallBadge>
        </PanelHead>

        <MonitoringCardGrid>
          {monitoringCards.map((card) => (
            <MonitoringCard key={card.id}>
              <MonitoringCardHead>
                <MonitoringIcon style={{ color: card.accent, background: `${card.accent}22` }}>
                  <card.icon size={16} />
                </MonitoringIcon>
                <MonitoringLink href={card.href} target="_blank" rel="noreferrer">
                  {card.linkLabel}
                  <ExternalLink size={13} />
                </MonitoringLink>
              </MonitoringCardHead>
              <label>{card.label}</label>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </MonitoringCard>
          ))}
        </MonitoringCardGrid>

        <TelemetryTimeline>
          <h5>Recent cadence</h5>
          {monitorTimeline.length > 0 ? (
            <TimelineStack>
              {monitorTimeline.map((point, index) => (
                <TimelineRow key={`${point.label}-${index}`}>
                  <span>{point.label}</span>
                  <TimelineBar>
                    <TimelineLatency
                      style={{ width: `${Math.max(6, (point.latencyMs / monitorTimelinePeak) * 100)}%` }}
                    />
                    <TimelineDelta
                      style={{ width: `${Math.max(6, (point.deltaMb / monitorTimelinePeak) * 100)}%` }}
                    />
                  </TimelineBar>
                  <small>
                    {point.latencyMs}ms | {point.deltaMb}MB
                  </small>
                </TimelineRow>
              ))}
            </TimelineStack>
          ) : (
            <MonitoringHint>Realtime timeline builds automatically as telemetry arrives.</MonitoringHint>
          )}
        </TelemetryTimeline>
      </MonitoringStack>

      <StatGrid>
        {metricCards.map((card, index) => (
          <StatCard key={card.id} style={{ animationDelay: `${index * 70}ms` }}>
            <StatHeader>
              <StatIconWrap style={{ background: `${card.accent}2A`, color: card.accent }}>
                <card.icon size={18} />
              </StatIconWrap>
              <CardMenu aria-hidden="true">
                <Ellipsis size={16} />
              </CardMenu>
            </StatHeader>

            <label>{card.label}</label>
            <strong>{card.value}</strong>
            <span>
              <ArrowUpRight size={13} />
              {card.trend}
            </span>

            <Sparkline aria-hidden="true">
              <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                <polyline
                  points={card.series
                    .map((value, idx) => `${(idx / Math.max(card.series.length - 1, 1)) * 120},${36 - (value / Math.max(...card.series, 1)) * 34}`)
                    .join(" ")}
                  stroke={card.accent}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </Sparkline>
          </StatCard>
        ))}
      </StatGrid>

      <AnalyticsGrid>
        <Panel>
          <PanelHead>
            <div>
              <h4>System Load Momentum</h4>
              <p>Current monitoring load versus projected baseline</p>
            </div>

            <TimeframeSwitch>
              {(["weekly", "monthly", "quarterly"] as Timeframe[]).map((frame) => (
                <button
                  key={frame}
                  type="button"
                  data-active={timeframe === frame}
                  onClick={() => setTimeframe(frame)}
                >
                  {frame}
                </button>
              ))}
            </TimeframeSwitch>
          </PanelHead>

          <ChartShell>
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(97, 172, 255, 0.45)" />
                  <stop offset="100%" stopColor="rgba(97, 172, 255, 0.02)" />
                </linearGradient>
              </defs>

              {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                const y = CHART_PADDING + (CHART_HEIGHT - CHART_PADDING * 2) * ratio;
                return (
                  <line
                    key={`grid-${ratio}`}
                    x1={CHART_PADDING}
                    y1={y}
                    x2={CHART_WIDTH - CHART_PADDING}
                    y2={y}
                    stroke="rgba(150, 172, 255, 0.18)"
                    strokeDasharray="5 6"
                  />
                );
              })}

              <path d={workforceChart.areaPath} fill="url(#areaGradient)" />
              <path
                d={workforceChart.targetPath}
                fill="none"
                stroke="rgba(244, 198, 103, 0.9)"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
              <path
                d={workforceChart.valuePath}
                fill="none"
                stroke="#63b5ff"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {workforceChart.valueCoords.map((point, idx) => (
                <circle key={`pt-${idx}`} cx={point.x} cy={point.y} r="3" fill="#9ccfff" />
              ))}
            </svg>
          </ChartShell>

          <ChartFooter>
            {workforceSeries.map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
          </ChartFooter>

          <Legend>
            <LegendItem>
              <Dot color="#63b5ff" />
              <span>Current load</span>
            </LegendItem>
            <LegendItem>
              <Dot color="#f4c667" />
              <span>Projected baseline</span>
            </LegendItem>
          </Legend>
        </Panel>

        <Panel>
          <PanelHead>
            <div>
              <h4>Session Presence + Role Mix</h4>
              <p>Realtime presence footprint and role spread with Day Off status controls.</p>
            </div>
            <PresenceActions>
              <SmallBadge>
                <Target size={13} />
                Live Snapshot
              </SmallBadge>
            </PresenceActions>
          </PanelHead>

          <AttendanceWrap>
            <RingChart style={{ background: attendanceRing }}>
              <RingInner>
                <strong>{attendance.total}</strong>
                <span>Staff + Teacher + Admin</span>
              </RingInner>
            </RingChart>

            <LegendStack>
              <LegendRow>
                <Dot color="#60b5ff" />
                <span>Present</span>
                <strong>{attendance.present}</strong>
              </LegendRow>
              <LegendRow>
                <Dot color="#f2c94c" />
                <span>On Leave</span>
                <strong>{attendance.onLeave}</strong>
              </LegendRow>
              <LegendRow>
                <Dot color="#67d86f" />
                <span>On Holiday</span>
                <strong>{attendance.onHoliday}</strong>
              </LegendRow>
              <LegendRow>
                <Dot color="#b195ff" />
                <span>Absent</span>
                <strong>{attendance.absent}</strong>
              </LegendRow>
              <LegendRow>
                <Dot color="#7dd8ff" />
                <span>Live Sessions</span>
                <strong>{activeUsers.total}</strong>
              </LegendRow>
            </LegendStack>
          </AttendanceWrap>

          <RoleMix>
            {roleBreakdown.map((row) => (
              <RoleRow key={row.label}>
                <RoleLabel>
                  <Dot color={row.color} />
                  <span>{row.label}</span>
                </RoleLabel>
                <RoleTrack>
                  <RoleFill style={{ width: `${row.percent}%`, background: row.color }} />
                </RoleTrack>
                <strong>{row.percent}%</strong>
              </RoleRow>
            ))}
          </RoleMix>
        </Panel>
      </AnalyticsGrid>

      <AnalyticsControlBar>
        <AnalyticsControlHead>
          <AnalyticsControlTitle>
            <SlidersHorizontal size={15} />
            Analytics Filters & Threshold Guards
          </AnalyticsControlTitle>
          <AnalyticsAlertState data-alert={chartAlerts.anyAlert}>
            <AlertTriangle size={14} />
            {chartAlerts.anyAlert
              ? "Alert thresholds triggered"
              : "All thresholds stable"}
          </AnalyticsAlertState>
        </AnalyticsControlHead>

        <AnalyticsFilterLayout>
          <AnalyticsPanelBlock>
            <AnalyticsPanelTitle>Focus Filters</AnalyticsPanelTitle>
            <WindowSegmentSwitch>
              {ANALYTICS_WINDOW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-active={analyticsWindow === option.value}
                  onClick={() => setAnalyticsWindow(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </WindowSegmentSwitch>

            <AnalyticsInlineFields>
              <AnalyticsControlField>
                <label>Role Focus</label>
                <select
                  value={analyticsRoleFilter}
                  onChange={(event) =>
                    setAnalyticsRoleFilter(
                      event.target.value as "all" | "students" | "teachers" | "admins" | "staff",
                    )
                  }
                >
                  {ANALYTICS_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </AnalyticsControlField>

              <AnalyticsControlField>
                <label>Room Focus</label>
                <select
                  value={analyticsRoomFilter}
                  onChange={(event) => setAnalyticsRoomFilter(event.target.value)}
                >
                  {analyticsRoomOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </AnalyticsControlField>
            </AnalyticsInlineFields>
          </AnalyticsPanelBlock>

          <AnalyticsPanelBlock>
            <AnalyticsPanelTitle>Threshold Guards</AnalyticsPanelTitle>
            <ThresholdGrid>
              <AnalyticsControlField>
                <label>Latency Alert</label>
                <ThresholdInputWrap>
                  <input
                    type="number"
                    min={50}
                    step={10}
                    value={latencyAlertThresholdMs}
                    onChange={(event) =>
                      setLatencyAlertThresholdMs(Math.max(50, Number(event.target.value) || 50))
                    }
                  />
                  <ThresholdUnit>ms</ThresholdUnit>
                </ThresholdInputWrap>
              </AnalyticsControlField>

              <AnalyticsControlField>
                <label>Storage Delta Alert</label>
                <ThresholdInputWrap>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={deltaAlertThresholdMb}
                    onChange={(event) =>
                      setDeltaAlertThresholdMb(Math.max(1, Number(event.target.value) || 1))
                    }
                  />
                  <ThresholdUnit>MB</ThresholdUnit>
                </ThresholdInputWrap>
              </AnalyticsControlField>

              <AnalyticsControlField>
                <label>Room Hotspot Alert</label>
                <ThresholdInputWrap>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={roomHotspotThreshold}
                    onChange={(event) =>
                      setRoomHotspotThreshold(Math.max(1, Math.round(Number(event.target.value) || 1)))
                    }
                  />
                  <ThresholdUnit>logins</ThresholdUnit>
                </ThresholdInputWrap>
              </AnalyticsControlField>
            </ThresholdGrid>

            <ThresholdFooter>
              <ThresholdHint>
                Thresholds trigger visual warnings on risk, hotspot, and drift charts.
              </ThresholdHint>
              <AnalyticsResetButton type="button" onClick={resetAnalyticsControls}>
                <RotateCcw size={13} />
                Reset controls
              </AnalyticsResetButton>
            </ThresholdFooter>
          </AnalyticsPanelBlock>
        </AnalyticsFilterLayout>

        <AnalyticsFootnote>
          Window currently uses <strong>{analyticsWindowConfig.login}</strong> login events and{" "}
          <strong>{analyticsWindowConfig.telemetry}</strong> telemetry samples.
          {scopedLoginRows.length > 0 ? (
            <> Filtered login rows: <strong>{scopedLoginRows.length}</strong>.</>
          ) : (
            <> No login rows match this filter set.</>
          )}
        </AnalyticsFootnote>
      </AnalyticsControlBar>

      <ExtendedAnalyticsGrid>
        <Panel>
          <PanelHead>
            <div>
              <h4>Role Capacity vs Recent Logins</h4>
              <p>Compare account population with latest login activity by role.</p>
            </div>
            <SmallBadge>
              <BarChart3 size={13} />
              Capacity bar map
            </SmallBadge>
          </PanelHead>

          <RoleLoadStack>
            {roleCapacityRows.map((row) => (
              <RoleLoadRow key={row.key}>
                <RoleLoadHead>
                  <RoleLabel>
                    <Dot color={row.color} />
                    <span>{row.label}</span>
                  </RoleLabel>
                  <RoleLoadMeta>
                    <span>{row.recent} recent</span>
                    <strong>{row.total} total</strong>
                  </RoleLoadMeta>
                </RoleLoadHead>
                <RoleLoadTrack>
                  <RoleLoadTotal style={{ width: `${row.totalWidth}%`, background: `${row.color}55` }} />
                  <RoleLoadRecent
                    style={{
                      width: `${Math.max(6, Math.round((row.totalWidth * row.utilization) / 100))}%`,
                      background: row.color,
                    }}
                  />
                </RoleLoadTrack>
              </RoleLoadRow>
            ))}
          </RoleLoadStack>
        </Panel>

        <Panel>
          <PanelHead>
            <div>
              <h4>Infrastructure Risk Pie</h4>
              <p>Service health classification for faster incident triage.</p>
            </div>
            <SmallBadge data-alert={chartAlerts.criticalCount > 0}>
              <PieChart size={13} />
              {chartAlerts.criticalCount > 0
                ? `${chartAlerts.criticalCount} critical`
                : "Risk split"}
            </SmallBadge>
          </PanelHead>

          <RiskSplitLayout>
            <RiskDonut style={{ background: infrastructureRisk.gradient }}>
              <RiskDonutInner>
                <strong>{infrastructureRisk.totalServices}</strong>
                <span>services</span>
              </RiskDonutInner>
            </RiskDonut>

            <RiskLegendStack>
              {infrastructureRisk.entries.map((entry) => (
                <RiskLegendRow key={entry.key}>
                  <RoleLabel>
                    <Dot color={entry.color} />
                    <span>{entry.label}</span>
                  </RoleLabel>
                  <RoleLoadMeta>
                    <span>{entry.percent}%</span>
                    <strong>{entry.value}</strong>
                  </RoleLoadMeta>
                </RiskLegendRow>
              ))}
            </RiskLegendStack>
          </RiskSplitLayout>

          <MonitoringHint>
            <b>Insight:</b> {infrastructureRisk.headline}
          </MonitoringHint>
        </Panel>

        <Panel>
          <PanelHead>
            <div>
              <h4>Login Room Hotspots</h4>
              <p>Top rooms generating authentication traffic right now.</p>
            </div>
            <SmallBadge data-alert={chartAlerts.hotspotAlert}>
              <Building2 size={13} />
              {chartAlerts.hotspotAlert
                ? `Hotspot >= ${roomHotspotThreshold}`
                : "Hotspot map"}
            </SmallBadge>
          </PanelHead>

          {loginHotspots.length > 0 ? (
            <HotspotStack>
              {loginHotspots.map((entry) => (
                <HotspotRow key={entry.room}>
                  <RoleLabel>
                    <Dot color="#7dd8ff" />
                    <span>{entry.room}</span>
                  </RoleLabel>
                  <HotspotBar>
                    <HotspotFill
                      style={{
                        width: `${entry.width}%`,
                        background:
                          entry.count >= roomHotspotThreshold
                            ? "linear-gradient(90deg, #ff9d92, #ff7a8d)"
                            : "linear-gradient(90deg, #7ad3ff, #8d8fff)",
                      }}
                    />
                  </HotspotBar>
                  <strong>{entry.count}</strong>
                </HotspotRow>
              ))}
            </HotspotStack>
          ) : (
            <MonitoringHint>
              Waiting for login room data. Hotspots appear automatically after new sign-ins.
            </MonitoringHint>
          )}
        </Panel>

        <Panel>
          <PanelHead>
            <div>
              <h4>Telemetry Drift Trend</h4>
              <p>Dual-line trend for latency and storage delta drift.</p>
            </div>
            <SmallBadge data-alert={chartAlerts.latencyAlert || chartAlerts.deltaAlert}>
              <ShieldAlert size={13} />
              {chartAlerts.latencyAlert || chartAlerts.deltaAlert
                ? "Drift alert"
                : "Drift monitor"}
            </SmallBadge>
          </PanelHead>

          {telemetryMiniChart.labels.length > 0 ? (
            <>
              <MiniChartShell>
                <svg
                  viewBox={`0 0 ${MINI_CHART_WIDTH} ${MINI_CHART_HEIGHT}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="miniLatencyArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(107, 187, 255, 0.45)" />
                      <stop offset="100%" stopColor="rgba(107, 187, 255, 0.04)" />
                    </linearGradient>
                  </defs>

                  {[0.25, 0.5, 0.75].map((ratio) => {
                    const y = MINI_CHART_PADDING + (MINI_CHART_HEIGHT - MINI_CHART_PADDING * 2) * ratio;
                    return (
                      <line
                        key={`mini-grid-${ratio}`}
                        x1={MINI_CHART_PADDING}
                        y1={y}
                        x2={MINI_CHART_WIDTH - MINI_CHART_PADDING}
                        y2={y}
                        stroke="rgba(150, 172, 255, 0.18)"
                        strokeDasharray="4 6"
                      />
                    );
                  })}

                  <path d={telemetryMiniChart.areaPath} fill="url(#miniLatencyArea)" />
                  <path
                    d={telemetryMiniChart.latencyPath}
                    fill="none"
                    stroke="#67bbff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d={telemetryMiniChart.deltaPath}
                    fill="none"
                    stroke="#7de4b3"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray="5 6"
                  />
                </svg>
              </MiniChartShell>
              <MiniTrendMetrics>
                <span data-alert={chartAlerts.latencyAlert}>
                  Avg latency: <strong>{telemetryMiniChart.averageLatency} ms</strong>
                </span>
                <span data-alert={chartAlerts.deltaAlert}>
                  Avg delta: <strong>{telemetryMiniChart.averageDelta} MB</strong>
                </span>
              </MiniTrendMetrics>
              <Legend>
                <LegendItem>
                  <Dot color="#67bbff" />
                  <span>Latency curve</span>
                </LegendItem>
                <LegendItem>
                  <Dot color="#7de4b3" />
                  <span>Storage delta curve</span>
                </LegendItem>
              </Legend>
            </>
          ) : (
            <MonitoringHint>
              Telemetry trend graph starts after the first realtime monitoring samples are collected.
            </MonitoringHint>
          )}
        </Panel>
      </ExtendedAnalyticsGrid>

      <TablePanel>
        <TableHead>
          <div>
            <h4>Monitoring Endpoints Board</h4>
            <p>One table for Supabase, Appstash/Redis, backups, and live portal telemetry.</p>
          </div>
          <FilterChip>
            <TrendingUp size={14} />
            Monitoring focus
          </FilterChip>
        </TableHead>

        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Provider</th>
                <th>Health</th>
                <th>Last Check</th>
                <th>Realtime</th>
                <th>Traffic / Bandwidth</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {monitoringServiceRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.service}</td>
                  <td>{row.provider}</td>
                  <td>
                    <StatusPill>
                      <Dot
                        color={
                          row.health.toLowerCase().includes("alert")
                            ? "#ff8e8e"
                            : row.health.toLowerCase().includes("spike")
                              ? "#f7c667"
                              : "#60b5ff"
                        }
                      />
                      {row.health}
                    </StatusPill>
                  </td>
                  <td>{row.lastCheck}</td>
                  <td>{row.realtime}</td>
                  <td>{row.traffic}</td>
                  <td>
                    <ServiceActionLink href={row.actionHref} target="_blank" rel="noreferrer">
                      {row.actionLabel}
                      <ExternalLink size={13} />
                    </ServiceActionLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </TablePanel>

      <TablePanel>
        <TableHead>
          <div>
            <h4>User Login Board</h4>
            <p>Realtime login stream with username, full name, room context, and IP address.</p>
          </div>
          <FilterChip>
            <LogIn size={14} />
            Login stream
          </FilterChip>
        </TableHead>

        <TableWrap $tall>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Room</th>
                <th>IP Address</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {loginBoardRows.length ? (
                loginBoardRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <LoginIdentity>
                        <img src={row.avatarUrl || LOGIN_FALLBACK_AVATAR} alt={row.username} />
                        <span>@{row.username}</span>
                      </LoginIdentity>
                    </td>
                    <td>{row.fullName}</td>
                    <td>
                      <StatusPill>
                        <Dot color="#67bbff" />
                        {row.role}
                      </StatusPill>
                    </td>
                    <td>
                      <RoomTag>
                        <MapPin size={13} />
                        {row.room}
                      </RoomTag>
                    </td>
                    <td>{row.ipAddress}</td>
                    <td>{formatRelativeDateTime(row.loggedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <MonitoringHint>Login activity will appear here automatically as users sign in.</MonitoringHint>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
        {loginActivityRows.length > 0 ? (
          <TablePager>
            <PagerButton
              type="button"
              onClick={() => setLoginBoardPage((prev) => Math.max(1, prev - 1))}
              disabled={loginBoardPage <= 1}
            >
              Previous
            </PagerButton>
            <PagerLabel>
              Page {Math.min(loginBoardPage, loginTotalPages)} of {loginTotalPages}
            </PagerLabel>
            <PagerButton
              type="button"
              onClick={() => setLoginBoardPage((prev) => Math.min(loginTotalPages, prev + 1))}
              disabled={loginBoardPage >= loginTotalPages}
            >
              Next
            </PagerButton>
          </TablePager>
        ) : null}
      </TablePanel>

    </OverviewCanvas>
  );
};

const riseIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: 200% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
`;

const OverviewCanvas = styled.div<{ $colorMode: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  --overview-ring: ${(props) =>
    props.$colorMode ? "rgba(127, 211, 255, 0.32)" : "rgba(155, 168, 255, 0.22)"};
`;

const OverviewSkeletonWrap = styled.section`
  border-radius: 16px;
  border: 1px solid rgba(154, 169, 255, 0.24);
  background: linear-gradient(155deg, rgba(10, 16, 38, 0.9), rgba(8, 13, 30, 0.92));
  box-shadow: 0 14px 30px rgba(2, 5, 14, 0.45);
  padding: 12px;
`;

const OverviewSkeletonHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
`;

const OverviewSkeletonLine = styled.div<{ $short?: boolean }>`
  width: ${(props) => (props.$short ? "40%" : "62%")};
  height: ${(props) => (props.$short ? "10px" : "14px")};
  border-radius: 999px;
  background: linear-gradient(
    115deg,
    rgba(79, 112, 190, 0.48) 0%,
    rgba(156, 177, 255, 0.92) 50%,
    rgba(79, 112, 190, 0.48) 100%
  );
  background-size: 220% 100%;
  animation: ${shimmer} 1.2s linear infinite;
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  h3 {
    margin: 4px 0 0;
    font-size: clamp(1.4rem, 2.8vw, 2rem);
    color: #f5f8ff;
    font-weight: 720;
    line-height: 1.2;
  }

  p {
    margin: 6px 0 0;
    color: rgba(210, 220, 255, 0.72);
    font-size: 0.9rem;
  }

  @media (max-width: 980px) {
    flex-direction: column;
  }
`;

const TopEyebrow = styled.p`
  margin: 0;
  color: rgba(139, 204, 255, 0.95);
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 650;
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const RealtimeBadge = styled.div`
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props["data-active"] ? "rgba(84, 236, 179, 0.38)" : "rgba(156, 168, 255, 0.3)")};
  background: ${(props) =>
    props["data-active"] ? "rgba(33, 118, 85, 0.26)" : "rgba(13, 20, 46, 0.72)"};
  color: ${(props) => (props["data-active"] ? "rgba(209, 255, 236, 0.95)" : "rgba(225, 230, 255, 0.85)")};
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.78rem;
`;

const BackoffTag = styled.span`
  border-radius: 999px;
  border: 1px solid rgba(248, 196, 103, 0.38);
  background: rgba(94, 63, 6, 0.28);
  color: rgba(255, 229, 168, 0.98);
  font-size: 0.7rem;
  padding: 3px 7px;
`;

const SecurityStrip = styled.section`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 12px;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`;

const SecurityCard = styled.article`
  border-radius: 16px;
  border: 1px solid rgba(158, 171, 255, 0.24);
  background: linear-gradient(150deg, rgba(12, 20, 47, 0.88), rgba(8, 13, 31, 0.86));
  padding: 13px 14px;
`;

const SecurityHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;

  h4 {
    margin: 0;
    color: #f5f8ff;
    font-size: 0.93rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(211, 220, 255, 0.78);
    font-size: 0.77rem;
    line-height: 1.35;
  }
`;

const StatusMetrics = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  span {
    border-radius: 999px;
    border: 1px solid rgba(156, 170, 255, 0.32);
    background: rgba(16, 22, 47, 0.72);
    color: rgba(223, 232, 255, 0.92);
    padding: 6px 10px;
    font-size: 0.74rem;
    font-weight: 600;
  }
`;

const StatusFeed = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InlinePager = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 2px;
`;

const StatusFeedRow = styled.article`
  border-radius: 12px;
  border: 1px solid rgba(156, 170, 255, 0.24);
  background: rgba(13, 20, 44, 0.72);
  padding: 8px 9px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;

  img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(123, 178, 255, 0.6);
  }

  strong {
    display: block;
    color: #f4f8ff;
    font-size: 0.82rem;
    line-height: 1.2;
  }

  small {
    color: rgba(212, 223, 255, 0.82);
    font-size: 0.72rem;
    line-height: 1.2;
  }

  time {
    color: rgba(203, 215, 255, 0.76);
    font-size: 0.72rem;
    white-space: nowrap;
  }
`;

const MonitoringStack = styled.section`
  border-radius: 18px;
  border: 1px solid rgba(155, 168, 255, 0.22);
  background: linear-gradient(160deg, rgba(9, 16, 38, 0.92), rgba(8, 12, 28, 0.92));
  box-shadow: 0 18px 34px rgba(2, 5, 14, 0.5);
  padding: 16px;
`;

const MonitoringCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MonitoringCard = styled.article`
  border-radius: 14px;
  border: 1px solid rgba(155, 168, 255, 0.22);
  background: rgba(12, 19, 43, 0.74);
  padding: 12px;

  label {
    display: block;
    color: rgba(206, 216, 255, 0.74);
    font-size: 0.78rem;
    margin-bottom: 7px;
  }

  strong {
    color: #ffffff;
    display: block;
    font-size: 1.2rem;
    line-height: 1.1;
  }

  p {
    margin: 8px 0 0;
    color: rgba(203, 214, 255, 0.76);
    font-size: 0.76rem;
    line-height: 1.3;
  }
`;

const MonitoringCardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
`;

const MonitoringIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
`;

const MonitoringLink = styled.a`
  color: rgba(198, 216, 255, 0.9);
  font-size: 0.73rem;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;

  &:hover {
    color: #ffffff;
  }
`;

const TelemetryTimeline = styled.section`
  margin-top: 12px;
  border-radius: 12px;
  border: 1px solid rgba(155, 168, 255, 0.22);
  background: rgba(12, 19, 43, 0.74);
  padding: 10px 11px;

  h5 {
    margin: 0 0 8px;
    color: rgba(233, 238, 255, 0.95);
    font-size: 0.83rem;
  }
`;

const TimelineStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const TimelineRow = styled.div`
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  span {
    color: rgba(201, 212, 255, 0.8);
    font-size: 0.74rem;
  }

  small {
    color: rgba(201, 212, 255, 0.78);
    font-size: 0.72rem;
    white-space: nowrap;
  }
`;

const TimelineBar = styled.div`
  height: 9px;
  border-radius: 999px;
  background: rgba(99, 122, 187, 0.25);
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const TimelineLatency = styled.div`
  height: 100%;
  min-width: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #67bbff, #7f93ff);
`;

const TimelineDelta = styled.div`
  height: 100%;
  min-width: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7de4b3, #90e08f);
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.article`
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(156, 170, 255, 0.24);
  background: linear-gradient(150deg, rgba(15, 23, 52, 0.92), rgba(9, 13, 31, 0.88));
  box-shadow: 0 16px 30px rgba(3, 5, 12, 0.46);
  padding: 14px 15px;
  animation: ${riseIn} 0.45s ease both;

  label {
    display: block;
    color: rgba(212, 221, 255, 0.72);
    font-size: 0.87rem;
    margin-bottom: 8px;
  }

  strong {
    color: #ffffff;
    display: block;
    font-size: clamp(1.45rem, 2.5vw, 1.95rem);
    line-height: 1;
    margin-bottom: 8px;
    font-weight: 700;
  }

  span {
    color: rgba(205, 216, 255, 0.82);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const StatIconWrap = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
`;

const CardMenu = styled.div`
  color: rgba(205, 215, 255, 0.7);
`;

const Sparkline = styled.div`
  margin-top: 8px;
  height: 28px;

  svg {
    width: 100%;
    height: 100%;
    opacity: 0.9;
  }
`;

const AnalyticsGrid = styled.section`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 12px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const AnalyticsControlBar = styled.section`
  border-radius: 18px;
  border: 1px solid rgba(158, 176, 246, 0.28);
  background:
    radial-gradient(circle at 14% 12%, rgba(102, 143, 255, 0.16), transparent 40%),
    linear-gradient(162deg, rgba(10, 16, 37, 0.94), rgba(8, 12, 30, 0.95));
  box-shadow: 0 16px 30px rgba(2, 6, 16, 0.5);
  padding: 13px;
  display: flex;
  flex-direction: column;
  gap: 11px;
`;

const AnalyticsControlHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const AnalyticsControlTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #f2f7ff;
  font-size: 0.9rem;
  font-weight: 700;
`;

const AnalyticsAlertState = styled.div`
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props["data-alert"] ? "rgba(255, 140, 140, 0.48)" : "rgba(121, 205, 170, 0.42)")};
  background: ${(props) =>
    props["data-alert"] ? "rgba(118, 32, 42, 0.34)" : "rgba(20, 88, 62, 0.28)"};
  color: ${(props) =>
    props["data-alert"] ? "rgba(255, 223, 223, 0.96)" : "rgba(218, 255, 236, 0.95)"};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 0.74rem;
  font-weight: 700;
`;

const AnalyticsFilterLayout = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1.4fr;
  gap: 10px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const AnalyticsPanelBlock = styled.div`
  border-radius: 13px;
  border: 1px solid rgba(153, 171, 243, 0.24);
  background: rgba(11, 18, 41, 0.66);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

const AnalyticsPanelTitle = styled.h5`
  margin: 0;
  color: #f2f7ff;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const WindowSegmentSwitch = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  border-radius: 10px;
  border: 1px solid rgba(140, 160, 233, 0.3);
  background: rgba(10, 16, 36, 0.75);
  padding: 4px;

  button {
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(208, 220, 255, 0.82);
    font-size: 0.75rem;
    padding: 7px 8px;
    font-weight: 700;
    cursor: pointer;
  }

  button[data-active="true"] {
    color: #ffffff;
    background: linear-gradient(148deg, rgba(77, 170, 255, 0.88), rgba(98, 109, 255, 0.86));
    box-shadow: 0 8px 16px rgba(47, 102, 194, 0.32);
  }
`;

const AnalyticsInlineFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const ThresholdGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ThresholdInputWrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid rgba(139, 157, 230, 0.34);
  background: rgba(13, 21, 46, 0.82);
  border-radius: 9px;
  overflow: hidden;

  input {
    border: none;
    background: transparent;
    color: #eef4ff;
    padding: 8px 10px;
    font-size: 0.8rem;
    width: 100%;
  }

  input:focus {
    outline: none;
  }
`;

const ThresholdUnit = styled.span`
  padding: 0 10px;
  color: rgba(191, 208, 255, 0.82);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
`;

const ThresholdFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const AnalyticsControlField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    color: rgba(204, 217, 255, 0.82);
    font-size: 0.73rem;
    font-weight: 650;
  }

  select,
  input {
    width: 100%;
    border: 1px solid rgba(139, 157, 230, 0.34);
    background: rgba(13, 21, 46, 0.82);
    color: #eef4ff;
    border-radius: 9px;
    padding: 8px 10px;
    font-size: 0.8rem;
  }
`;

const ThresholdHint = styled.span`
  color: rgba(196, 210, 255, 0.8);
  font-size: 0.73rem;
`;

const AnalyticsResetButton = styled.button`
  border: 1px solid rgba(130, 195, 255, 0.42);
  background: rgba(33, 72, 133, 0.38);
  color: rgba(217, 232, 255, 0.96);
  border-radius: 9px;
  padding: 8px 11px;
  font-size: 0.78rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;

  &:hover {
    background: rgba(43, 89, 161, 0.5);
  }
`;

const AnalyticsFootnote = styled.p`
  margin: 0;
  color: rgba(199, 212, 255, 0.84);
  font-size: 0.74rem;
  line-height: 1.35;

  strong {
    color: #f3f8ff;
    font-weight: 700;
  }
`;

const ExtendedAnalyticsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.article`
  border-radius: 18px;
  border: 1px solid rgba(155, 168, 255, 0.22);
  background: linear-gradient(160deg, rgba(9, 16, 38, 0.92), rgba(8, 12, 28, 0.92));
  box-shadow: 0 18px 34px rgba(2, 5, 14, 0.5);
  padding: 16px;
`;

const PanelHead = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;

  h4 {
    margin: 0;
    color: #f4f7ff;
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(200, 211, 255, 0.72);
    font-size: 0.78rem;
  }
`;

const RoleLoadStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RoleLoadRow = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(151, 166, 235, 0.22);
  background: rgba(12, 18, 41, 0.72);
  padding: 9px 10px;
`;

const RoleLoadHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
`;

const RoleLoadMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  span {
    color: rgba(214, 226, 255, 0.78);
    font-size: 0.74rem;
  }

  strong {
    color: #f4f8ff;
    font-size: 0.76rem;
  }
`;

const RoleLoadTrack = styled.div`
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(98, 116, 179, 0.3);
  overflow: hidden;
`;

const RoleLoadTotal = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 999px;
`;

const RoleLoadRecent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(115, 198, 255, 0.5);
`;

const RiskSplitLayout = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const RiskDonut = styled.div`
  width: 138px;
  height: 138px;
  border-radius: 50%;
  padding: 11px;
  box-shadow: 0 12px 25px rgba(4, 8, 18, 0.5);
`;

const RiskDonutInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(9, 14, 34, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  strong {
    color: #ffffff;
    font-size: 1.5rem;
    line-height: 1;
  }

  span {
    margin-top: 4px;
    color: rgba(210, 221, 255, 0.75);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const RiskLegendStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const RiskLegendRow = styled.div`
  border-radius: 10px;
  border: 1px solid rgba(150, 166, 236, 0.22);
  background: rgba(13, 20, 46, 0.74);
  padding: 7px 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const HotspotStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HotspotRow = styled.div`
  display: grid;
  grid-template-columns: minmax(96px, 1fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 9px;

  strong {
    color: #f2f7ff;
    font-size: 0.78rem;
    min-width: 24px;
    text-align: right;
  }
`;

const HotspotBar = styled.div`
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: rgba(104, 124, 190, 0.3);
  overflow: hidden;
`;

const HotspotFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7ad3ff, #8d8fff);
`;

const MiniChartShell = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(150, 166, 236, 0.22);
  background: rgba(10, 16, 37, 0.72);
  padding: 8px 9px;
  height: 188px;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const MiniTrendMetrics = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  span {
    border-radius: 999px;
    border: 1px solid rgba(149, 166, 236, 0.3);
    background: rgba(15, 21, 46, 0.78);
    color: rgba(218, 228, 255, 0.88);
    padding: 5px 9px;
    font-size: 0.74rem;
    display: inline-flex;
    gap: 6px;
  }

  span[data-alert="true"] {
    border-color: rgba(255, 143, 143, 0.5);
    background: rgba(121, 37, 48, 0.36);
    color: rgba(255, 226, 226, 0.95);
  }

  strong {
    color: #ffffff;
    font-weight: 700;
  }
`;

const TimeframeSwitch = styled.div`
  border-radius: 999px;
  border: 1px solid rgba(156, 168, 255, 0.3);
  background: rgba(14, 20, 44, 0.72);
  padding: 3px;
  display: inline-flex;
  gap: 3px;

  button {
    border: none;
    background: transparent;
    color: rgba(214, 223, 255, 0.75);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.73rem;
    text-transform: capitalize;
    cursor: pointer;
  }

  button[data-active="true"] {
    color: #ffffff;
    background: linear-gradient(145deg, rgba(83, 169, 255, 0.82), rgba(108, 87, 244, 0.82));
  }
`;

const ChartShell = styled.div`
  border-radius: 14px;
  border: 1px solid rgba(154, 167, 255, 0.18);
  padding: 10px;
  background: rgba(10, 14, 32, 0.62);
  height: 280px;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const ChartFooter = styled.div`
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
  gap: 4px;

  span {
    text-align: center;
    font-size: 0.72rem;
    color: rgba(198, 210, 255, 0.72);
  }
`;

const Legend = styled.div`
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;

  span {
    color: rgba(214, 223, 255, 0.85);
    font-size: 0.78rem;
  }
`;

const SmallBadge = styled.div`
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props["data-alert"] ? "rgba(255, 143, 143, 0.5)" : "rgba(156, 168, 255, 0.32)")};
  background: ${(props) => (props["data-alert"] ? "rgba(121, 37, 48, 0.36)" : "rgba(17, 21, 44, 0.76)")};
  color: ${(props) =>
    props["data-alert"] ? "rgba(255, 226, 226, 0.95)" : "rgba(222, 229, 255, 0.9)"};
  padding: 7px 10px;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const PresenceActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const DayOffButton = styled.button`
  border-radius: 999px;
  border: 1px solid rgba(242, 201, 76, 0.48);
  background: rgba(92, 64, 13, 0.42);
  color: rgba(255, 236, 177, 0.98);
  padding: 7px 11px;
  font-size: 0.74rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  &:hover {
    background: rgba(111, 78, 18, 0.58);
  }
`;

const AttendanceWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  @media (max-width: 540px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const RingChart = styled.div`
  width: 176px;
  height: 176px;
  border-radius: 50%;
  padding: 14px;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 24px rgba(10, 5, 30, 0.45);
  animation: ${pulse} 6s ease-in-out infinite;
`;

const RingInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #090d24;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  strong {
    color: #ffffff;
    font-size: 1.75rem;
    line-height: 1;
  }

  span {
    margin-top: 4px;
    font-size: 0.72rem;
    color: rgba(216, 224, 255, 0.7);
  }
`;

const LegendStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  flex: 1;
`;

const LegendRow = styled.div`
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 8px;

  span {
    color: rgba(212, 222, 255, 0.85);
    font-size: 0.82rem;
  }

  strong {
    color: #ffffff;
    font-size: 0.82rem;
  }
`;

const RoleMix = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const MonitoringHint = styled.div`
  margin-top: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(161, 176, 255, 0.36);
  background: rgba(14, 20, 43, 0.62);
  color: rgba(214, 223, 255, 0.85);
  font-size: 0.78rem;
  padding: 9px 11px;

  b {
    color: #ffffff;
    font-weight: 650;
  }
`;

const RoleRow = styled.div`
  display: grid;
  grid-template-columns: minmax(90px, 1fr) minmax(0, 2fr) 38px;
  align-items: center;
  gap: 8px;

  strong {
    color: rgba(237, 241, 255, 0.94);
    font-size: 0.76rem;
    text-align: right;
  }
`;

const RoleLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  span {
    color: rgba(214, 223, 255, 0.9);
    font-size: 0.76rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RoleTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(117, 131, 205, 0.35);
  overflow: hidden;
`;

const RoleFill = styled.div`
  height: 100%;
  border-radius: 999px;
`;

const Dot = styled.span<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => props.color};
`;

const TablePanel = styled.section`
  border-radius: 18px;
  border: 1px solid rgba(156, 170, 255, 0.24);
  background: linear-gradient(165deg, rgba(11, 18, 42, 0.92), rgba(8, 13, 31, 0.9));
  box-shadow: 0 16px 30px rgba(2, 6, 18, 0.48);
  padding: 16px;
`;

const TableHead = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 10px;

  h4 {
    margin: 0;
    color: #f4f8ff;
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(204, 216, 255, 0.74);
    font-size: 0.78rem;
  }
`;

const FilterChip = styled.div`
  border-radius: 999px;
  border: 1px solid rgba(96, 181, 255, 0.34);
  background: rgba(96, 181, 255, 0.14);
  color: rgba(210, 228, 255, 0.95);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.78rem;
`;

const TableWrap = styled.div<{ $tall?: boolean }>`
  overflow-y: auto;
  overflow-x: hidden;
  max-height: ${(props) => (props.$tall ? "430px" : "380px")};
  border-radius: 12px;
  border: 1px solid rgba(128, 148, 222, 0.22);
  background: rgba(8, 13, 31, 0.6);

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid rgba(151, 167, 237, 0.22);
    color: rgba(224, 233, 255, 0.94);
    font-size: 0.82rem;
    white-space: normal;
    word-break: break-word;
  }

  th {
    color: rgba(188, 204, 255, 0.86);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  tbody tr {
    transition: background-color 0.2s ease;
  }

  tbody tr:hover {
    background: rgba(90, 128, 220, 0.2);
  }
`;

const TablePager = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const PagerButton = styled.button`
  border: 1px solid rgba(143, 166, 241, 0.4);
  background: rgba(17, 26, 54, 0.75);
  color: rgba(228, 236, 255, 0.96);
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(132, 194, 255, 0.66);
    background: rgba(26, 38, 76, 0.85);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const PagerLabel = styled.span`
  color: rgba(206, 220, 255, 0.86);
  font-size: 0.74rem;
  font-weight: 600;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: rgba(96, 181, 255, 0.2);
  border: 1px solid rgba(96, 181, 255, 0.4);
  padding: 4px 10px;
  color: rgba(218, 235, 255, 0.96);
  font-size: 0.74rem;
`;

const ServiceActionLink = styled.a`
  text-decoration: none;
  border-radius: 999px;
  border: 1px solid rgba(96, 181, 255, 0.42);
  color: rgba(217, 232, 255, 0.96);
  background: rgba(35, 73, 140, 0.36);
  padding: 6px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    color: #ffffff;
    border-color: rgba(124, 197, 255, 0.68);
  }
`;

const LoginIdentity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  img {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(127, 190, 255, 0.6);
  }

  span {
    color: rgba(219, 230, 255, 0.94);
    font-size: 0.8rem;
  }
`;

const RoomTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(220, 232, 255, 0.9);
  font-size: 0.8rem;
`;

const DayOffModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1800;
  background: rgba(4, 8, 20, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
`;

const DayOffModalCard = styled.div`
  width: min(980px, 100%);
  max-height: min(86vh, 920px);
  border-radius: 16px;
  border: 1px solid rgba(156, 170, 255, 0.26);
  background: linear-gradient(165deg, rgba(11, 18, 42, 0.96), rgba(8, 13, 31, 0.95));
  box-shadow: 0 20px 40px rgba(1, 4, 12, 0.58);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
`;

const DayOffModalHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;

  h4 {
    margin: 0;
    color: #f3f8ff;
    font-size: 1rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(210, 220, 255, 0.78);
    font-size: 0.78rem;
  }
`;

const DayOffCloseButton = styled.button`
  border: 1px solid rgba(155, 169, 255, 0.36);
  background: rgba(13, 20, 45, 0.76);
  color: rgba(224, 234, 255, 0.92);
  border-radius: 9px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: rgba(22, 34, 72, 0.84);
  }
`;

const DayOffToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
`;

const DayOffSearchInput = styled.input`
  width: 100%;
  border: 1px solid rgba(152, 170, 255, 0.34);
  background: rgba(13, 20, 46, 0.75);
  color: #eff5ff;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 0.82rem;
`;

const DayOffRefreshButton = styled.button`
  border: 1px solid rgba(118, 194, 255, 0.42);
  background: rgba(34, 74, 137, 0.4);
  color: rgba(220, 234, 255, 0.95);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const DayOffSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  span {
    border-radius: 999px;
    border: 1px solid rgba(153, 171, 255, 0.32);
    background: rgba(15, 22, 49, 0.76);
    color: rgba(222, 232, 255, 0.92);
    padding: 5px 10px;
    font-size: 0.72rem;
    font-weight: 650;
  }
`;

const DayOffRoster = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-right: 4px;
`;

const DayOffRow = styled.article`
  border-radius: 12px;
  border: 1px solid rgba(154, 169, 255, 0.25);
  background: rgba(11, 18, 42, 0.72);
  padding: 9px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DayOffIdentity = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;

  img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(129, 190, 255, 0.58);
  }

  strong {
    display: block;
    color: #f4f8ff;
    font-size: 0.84rem;
  }

  small {
    display: block;
    color: rgba(209, 220, 255, 0.8);
    font-size: 0.73rem;
    line-height: 1.3;
  }
`;

const DayOffActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

const DayOffStatusButton = styled.button`
  border: 1px solid rgba(153, 171, 255, 0.36);
  background: rgba(14, 24, 52, 0.86);
  color: rgba(220, 231, 255, 0.95);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
  font-weight: 650;
  cursor: pointer;

  &[data-active="true"] {
    border-color: rgba(111, 202, 255, 0.72);
    background: rgba(35, 74, 132, 0.55);
    color: #ffffff;
  }

  &:hover:not(:disabled) {
    border-color: rgba(132, 194, 255, 0.7);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export default AdminPortalOverview;
