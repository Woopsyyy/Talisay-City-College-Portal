import { supabase } from "../../supabaseClient";
import { beginApiRequest, endApiRequest } from "../apiEvents";

type LooseRecord = Record<string, any>;
type NotificationItem = {
  id: number | null;
  created_at: string | null;
  title: string;
  message: string;
  action: string;
  category: string;
  actor_user_id: number | null;
  actor_username: string;
  actor_role: string;
  target_user_id: number | null;
  target_role: string;
  metadata: LooseRecord;
};

const UNREAD_CACHE_TTL_MS = 3_000;
const unreadCache = new Map<string, { expiresAtMs: number; value: NotificationItem[] }>();
const unreadInFlight = new Map<string, Promise<NotificationItem[]>>();

const parseNumber = (value: unknown, fallback: number | null = 0): number | null => {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizeRole = (value: unknown): string => {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  return role === "go" ? "nt" : role;
};

const normalizeNotificationTargetRole = (value: unknown): string => {
  const role = normalizeRole(value);
  if (!role) return "";
  if (role === "non-teaching" || role === "non_teaching" || role === "staff") return "nt";
  if (role === "osas" || role === "treasury") return role;
  if (["admin", "teacher", "student", "nt", "all"].includes(role)) return role;
  return role;
};

const asError = (input: any, fallback = "Request failed") => {
  if (input instanceof Error) return input;
  const error = new Error(input?.message || fallback) as Error & {
    status?: number;
    code?: number | string;
  };
  if (input?.status) error.status = input.status;
  if (input?.code) error.code = input.code;
  return error;
};

const formatSupabaseError = (error: any, fallback = "Database request failed") => {
  if (!error) return null;
  const formatted = new Error(error.message || fallback) as Error & {
    status?: number;
    code?: number | string;
  };
  formatted.status = error.status || 400;
  formatted.code = error.code;
  return formatted;
};

const withNotificationApi = async (fn: () => Promise<any>, options: LooseRecord = {}) => {
  const { silent = false } = options;
  if (!silent) beginApiRequest();
  try {
    return await fn();
  } catch (error) {
    throw asError(error);
  } finally {
    if (!silent) endApiRequest();
  }
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("tcc_user");
    if (!raw || raw === "undefined") return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const isMissingNotificationFeatureError = (error: any): boolean => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const combined = `${message} ${details}`;
  const refersNotifications =
    combined.includes("notification") || combined.includes("notifications");

  if (!refersNotifications) return false;
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("permission denied")
  );
};

const mapNotification = (row: LooseRecord = {}): NotificationItem => ({
  id: row?.id ?? null,
  created_at: row?.created_at || null,
  title: String(row?.title || "").trim(),
  message: String(row?.message || "").trim(),
  action: String(row?.action || "general_update")
    .trim()
    .toLowerCase(),
  category: String(row?.category || "general")
    .trim()
    .toLowerCase(),
  actor_user_id: row?.actor_user_id ?? null,
  actor_username: String(row?.actor_username || "").trim(),
  actor_role: normalizeRole(row?.actor_role || ""),
  target_user_id: row?.target_user_id ?? null,
  target_role: normalizeNotificationTargetRole(row?.target_role) || "all",
  metadata:
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {},
});

const chunkArray = <T>(items: T[] = [], size = 200): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const cloneCacheValue = <T>(value: T): T => {
  if (value == null) return value;
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch (_) {
    // fallback to JSON clone below
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
};

const makeUnreadCacheKey = (userId: number, limit: number): string =>
  `notifications.unread:${userId}:${limit}`;

const readUnreadCache = (cacheKey: string): NotificationItem[] | null => {
  const entry = unreadCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    unreadCache.delete(cacheKey);
    return null;
  }
  return cloneCacheValue(entry.value);
};

const writeUnreadCache = (cacheKey: string, rows: NotificationItem[]) => {
  unreadCache.set(cacheKey, {
    expiresAtMs: Date.now() + UNREAD_CACHE_TTL_MS,
    value: cloneCacheValue(rows),
  });
};

const clearUnreadCacheForUser = (userId: number | null) => {
  if (!userId) {
    unreadCache.clear();
    unreadInFlight.clear();
    return;
  }

  const prefix = `notifications.unread:${userId}:`;
  for (const key of Array.from(unreadCache.keys())) {
    if (key.startsWith(prefix)) unreadCache.delete(key);
  }
  for (const key of Array.from(unreadInFlight.keys())) {
    if (key.startsWith(prefix)) unreadInFlight.delete(key);
  }
};

const getUserRoleTargets = (currentUser: LooseRecord = {}): string[] => {
  const roleCandidates: unknown[] = [
    currentUser?.role,
    currentUser?.sub_role,
    ...(Array.isArray(currentUser?.roles) ? currentUser.roles : []),
    ...(Array.isArray(currentUser?.sub_roles) ? currentUser.sub_roles : []),
  ];

  const normalized = roleCandidates
    .map((role) => normalizeNotificationTargetRole(role))
    .filter(Boolean);

  return Array.from(new Set(["all", ...normalized]));
};

const sanitizeFilterValue = (value: unknown): string =>
  String(value || "")
    .trim()
    .replace(/[,()]/g, "");

const buildNotificationScope = (currentUser: LooseRecord = {}) => {
  const userId = parseNumber(currentUser?.id, null);
  const roleTargets = getUserRoleTargets(currentUser);
  const roleTargetSet = new Set(roleTargets);

  const clauses: string[] = [];
  if (userId) {
    clauses.push(`target_user_id.eq.${userId}`);
  }
  for (const role of roleTargets) {
    const safeRole = sanitizeFilterValue(role);
    if (safeRole) clauses.push(`target_role.eq.${safeRole}`);
  }
  clauses.push("target_role.is.null");

  return {
    userId,
    roleTargetSet,
    orFilter: clauses.join(","),
  };
};

const isVisibleToCurrentUser = (
  notification: NotificationItem,
  currentUserId: number,
  roleTargetSet: Set<string>,
): boolean => {
  const targetUserId = parseNumber(notification?.target_user_id, null);
  if (targetUserId && targetUserId !== currentUserId) {
    return false;
  }

  const targetRole = normalizeNotificationTargetRole(notification?.target_role);
  if (!targetUserId && targetRole && targetRole !== "all" && !roleTargetSet.has(targetRole)) {
    return false;
  }

  return true;
};

export const NotificationAPI = {
  getUnread: async (options: LooseRecord = {}) =>
    withNotificationApi(async () => {
      const currentUser = readStoredUser();
      const currentUserId = parseNumber(currentUser?.id, null);
      if (!currentUserId) return [];

      const limitValue = Number(options?.limit);
      const limit = Number.isFinite(limitValue)
        ? Math.min(100, Math.max(1, Math.trunc(limitValue)))
        : 20;
      const forceRefresh = Boolean(options?.force_refresh);
      const fetchLimit = Math.min(400, Math.max(limit * 4, 40));
      const scope = buildNotificationScope(currentUser);
      const cacheKey = makeUnreadCacheKey(currentUserId, limit);

      if (!forceRefresh) {
        const cached = readUnreadCache(cacheKey);
        if (cached) return cached;

        const inFlight = unreadInFlight.get(cacheKey);
        if (inFlight) {
          return await inFlight;
        }
      }

      const loadUnreadPromise = (async () => {
        let notificationsQuery = supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
        if (scope.orFilter) {
          notificationsQuery = notificationsQuery.or(scope.orFilter);
        }

        const { data: notificationRows, error: notificationsError } = await notificationsQuery;

        if (notificationsError) {
          if (isMissingNotificationFeatureError(notificationsError)) return [];
          throw formatSupabaseError(notificationsError, "Failed to load notifications.");
        }

        const notifications = (notificationRows || [])
          .map(mapNotification)
          .filter((notification) =>
            isVisibleToCurrentUser(notification, currentUserId, scope.roleTargetSet),
          );
        if (!notifications.length) return [];

        const notificationIds = notifications
          .map((row) => parseNumber(row?.id, null))
          .filter(Boolean);
        if (!notificationIds.length) return [];

        const { data: readRows, error: readError } = await supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", currentUserId)
          .in("notification_id", notificationIds);

        if (readError) {
          if (isMissingNotificationFeatureError(readError)) {
            const unreadRows = notifications.slice(0, limit);
            writeUnreadCache(cacheKey, unreadRows);
            return unreadRows;
          }
          throw formatSupabaseError(readError, "Failed to load notification read status.");
        }

        const readSet = new Set(
          (readRows || [])
            .map((row) => parseNumber(row?.notification_id, null))
            .filter(Boolean),
        );

        const unreadRows = notifications
          .filter((notification) => !readSet.has(parseNumber(notification?.id, null)))
          .slice(0, limit);
        writeUnreadCache(cacheKey, unreadRows);
        return unreadRows;
      })();

      unreadInFlight.set(cacheKey, loadUnreadPromise);
      try {
        return await loadUnreadPromise;
      } finally {
        unreadInFlight.delete(cacheKey);
      }
    }, { silent: true }),

  markAsRead: async (notificationId: number | string) =>
    withNotificationApi(async () => {
      const currentUser = readStoredUser();
      const currentUserId = parseNumber(currentUser?.id, null);
      if (!currentUserId) return { success: true };

      const numericNotificationId = parseNumber(notificationId, null);
      if (!numericNotificationId) throw new Error("Invalid notification selected.");

      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          {
            notification_id: numericNotificationId,
            user_id: currentUserId,
            read_at: new Date().toISOString(),
          },
          { onConflict: "notification_id,user_id" },
        );

      if (error && !isMissingNotificationFeatureError(error)) {
        throw formatSupabaseError(error, "Failed to mark notification as read.");
      }

      clearUnreadCacheForUser(currentUserId);
      return { success: true };
    }, { silent: true }),

  markAllAsRead: async (options: LooseRecord = {}) =>
    withNotificationApi(async () => {
      const currentUser = readStoredUser();
      const currentUserId = parseNumber(currentUser?.id, null);
      if (!currentUserId) return { success: true, marked_count: 0 };

      const limitValue = Number(options?.limit);
      const fetchLimit = Number.isFinite(limitValue)
        ? Math.min(2000, Math.max(20, Math.trunc(limitValue)))
        : 1000;
      const scope = buildNotificationScope(currentUser);

      let notificationQuery = supabase
        .from("notifications")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);
      if (scope.orFilter) {
        notificationQuery = notificationQuery.or(scope.orFilter);
      }

      const { data: notificationRows, error: notificationsError } = await notificationQuery;

      if (notificationsError) {
        if (isMissingNotificationFeatureError(notificationsError)) {
          return { success: true, marked_count: 0 };
        }
        throw formatSupabaseError(notificationsError, "Failed to load notifications.");
      }

      const notificationIds = (notificationRows || [])
        .map((row) => parseNumber(row?.id, null))
        .filter(Boolean);
      if (!notificationIds.length) return { success: true, marked_count: 0 };

      const nowIso = new Date().toISOString();
      const payloadRows = notificationIds.map((id) => ({
        notification_id: id,
        user_id: currentUserId,
        read_at: nowIso,
      }));

      for (const batch of chunkArray(payloadRows, 200)) {
        const { error } = await supabase
          .from("notification_reads")
          .upsert(batch, { onConflict: "notification_id,user_id" });

        if (error && !isMissingNotificationFeatureError(error)) {
          throw formatSupabaseError(error, "Failed to mark all notifications as read.");
        }
      }

      clearUnreadCacheForUser(currentUserId);
      return { success: true, marked_count: payloadRows.length };
    }, { silent: true }),

  subscribeToInbox: (onChange: () => void) => {
    if (typeof onChange !== "function") return () => {};

    const currentUser = readStoredUser();
    const currentUserId = parseNumber(currentUser?.id, null);
    if (!currentUserId) return () => {};
    const roleTargets = getUserRoleTargets(currentUser);

    const channelName = `notification-inbox-${currentUserId}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `target_user_id=eq.${currentUserId}`,
      },
      () => {
        clearUnreadCacheForUser(currentUserId);
        onChange();
      },
    );

    for (const role of roleTargets) {
      const safeRole = sanitizeFilterValue(role);
      if (!safeRole) continue;
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${safeRole}`,
        },
        () => {
          clearUnreadCacheForUser(currentUserId);
          onChange();
        },
      );
    }

    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification_reads",
        filter: `user_id=eq.${currentUserId}`,
      },
      () => {
        clearUnreadCacheForUser(currentUserId);
        onChange();
      },
    );

    channel.subscribe();
    return () => {
      clearUnreadCacheForUser(currentUserId);
      supabase.removeChannel(channel).catch(() => undefined);
    };
  },
};
