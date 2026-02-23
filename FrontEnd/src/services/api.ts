import { supabase } from "../supabaseClient";

type LooseRecord = Record<string, any>;
type ApiError = Error & {
  status?: number;
  statusCode?: number | string;
  code?: number | string;
};

declare global {
  interface Error {
    status?: number;
    statusCode?: number | string;
    code?: number | string;
  }
}

const SESSION_KEY = "tcc_user";
const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";
const BACKUP_BUCKET = import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || AVATAR_BUCKET;
const BACKUP_PREFIX = String(import.meta.env.VITE_SUPABASE_BACKUP_PREFIX || "backups")
  .replace(/^\/+/, "")
  .replace(/\/+$/, "");
const MAINTENANCE_STORAGE_BASELINE_KEY = "tcc_maintenance_storage_last_bytes";
const DEFAULT_AVATAR = "/images/sample.jpg";
const USER_SAFE_SELECT =
  "id,username,full_name,role,roles,sub_role,sub_roles,school_id,image_path,created_at,updated_at";

let activeRequests = 0;
const loadingSubscribers = new Set<(active: boolean) => void>();
const unauthorizedSubscribers = new Set<() => void>();

const emitLoading = () => {
  const active = activeRequests > 0;
  loadingSubscribers.forEach((callback) => {
    try {
      callback(active);
    } catch (_) {}
  });
};

const emitUnauthorized = () => {
  unauthorizedSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (_) {}
  });
};

export const subscribeToApiLoading = (callback: (active: boolean) => void) => {
  loadingSubscribers.add(callback);
  callback(activeRequests > 0);
  return () => loadingSubscribers.delete(callback);
};

export const subscribeToUnauthorized = (callback: () => void) => {
  unauthorizedSubscribers.add(callback);
  return () => unauthorizedSubscribers.delete(callback);
};

const asError = (input: any, fallback = "Request failed"): ApiError => {
  if (input instanceof Error) return input as ApiError;
  const error = new Error(input?.message || fallback) as ApiError;
  if (input?.status) error.status = input.status;
  if (input?.code) error.code = input.code;
  return error;
};

const formatSupabaseError = (error: any, fallback = "Database request failed"): ApiError | null => {
  if (!error) return null;
  const formatted = new Error(error.message || fallback) as ApiError;
  formatted.status = error.status || 400;
  formatted.code = error.code;
  return formatted;
};

const normalizeErrorText = (errorLike) => {
  if (!errorLike) return "";
  if (typeof errorLike === "string") return errorLike.toLowerCase();
  return [errorLike.message, errorLike.details, errorLike.hint, errorLike.code]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .toLowerCase();
};

const isDuplicateConstraintError = (errorLike) => {
  const errorCode = String(errorLike?.code || "").trim();
  const errorText = normalizeErrorText(errorLike);
  return (
    errorCode === "23505" ||
    errorText.includes("duplicate key value violates unique constraint") ||
    errorText.includes("already exists")
  );
};

const isUsernameConflictError = (errorLike) => {
  const errorText = normalizeErrorText(errorLike);
  if (!errorText) return false;
  if (errorText.includes("username already exists")) return true;
  if (!isDuplicateConstraintError(errorLike)) return false;
  return (
    errorText.includes("username") ||
    errorText.includes("users_username_key") ||
    errorText.includes("idx_users_username_lower")
  );
};

const isMissingFunctionError = (error, fnName = "") => {
  const message = String(error?.message || "").toLowerCase();
  const name = String(fnName || "").toLowerCase();
  const hasMissingText =
    message.includes("could not find the function") ||
    (message.includes("function") && message.includes("does not exist"));

  if (!name) {
    return error?.code === "42883" || hasMissingText;
  }

  const mentionsTargetFunction = message.includes(name);
  return (
    (error?.code === "42883" && mentionsTargetFunction) ||
    (hasMissingText && mentionsTargetFunction)
  );
};

const isMissingColumnError = (error, columnName = "") => {
  const message = String(error?.message || "").toLowerCase();
  const target = String(columnName || "").toLowerCase();
  if (!target) return false;
  return (
    (message.includes("column") && message.includes(target) && message.includes("does not exist")) ||
    (message.includes("could not find the") && message.includes(target) && message.includes("column"))
  );
};

const isAmbiguousColumnError = (error, columnName = "") => {
  const message = String(error?.message || "").toLowerCase();
  const target = String(columnName || "").toLowerCase();
  const ambiguous = error?.code === "42702" || (
    message.includes("column reference") && message.includes("is ambiguous")
  );
  if (!ambiguous) return false;
  if (!target) return true;
  return message.includes(`"${target}"`) || message.includes(target);
};


const withApi = async (fn: () => Promise<any>, options: LooseRecord = {}) => {
  const { silent = false } = options;
  if (!silent) {
    activeRequests += 1;
    emitLoading();
  }

  try {
    return await fn();
  } catch (error) {
    throw asError(error);
  } finally {
    if (!silent) {
      activeRequests = Math.max(0, activeRequests - 1);
      emitLoading();
    }
  }
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw || raw === "undefined") return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const writeStoredUser = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (_) {}
};

const clearStoredUser = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("tcc_avatar");
  } catch (_) {}
};

const normalizeLogRole = (value) => {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  return role === "go" ? "nt" : role;
};

const normalizeLogText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizeLogUserId = (value) => {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  return Math.trunc(id);
};

const normalizeLogMetadata = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return {};
  }
};

const isDefaultAvatarPath = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "");

  return !normalized || normalized === "images/sample.jpg" || normalized === "sample.jpg";
};

const logStatusEvent = async (payload: LooseRecord = {}) => {
  const action = String(payload?.action || "")
    .trim()
    .toLowerCase();
  if (!action) return false;

  const category = String(payload?.category || "general")
    .trim()
    .toLowerCase() || "general";

  const actorFallback = readStoredUser();
  const actorUserId = normalizeLogUserId(payload?.actor_user_id ?? actorFallback?.id);
  const actorUsername = normalizeLogText(payload?.actor_username ?? actorFallback?.username);
  const actorRole = normalizeLogRole(payload?.actor_role ?? actorFallback?.role);

  const targetUserId = normalizeLogUserId(payload?.target_user_id);
  const targetUsername = normalizeLogText(payload?.target_username);
  const targetRole = normalizeLogRole(payload?.target_role);

  const message =
    normalizeLogText(payload?.message) ||
    `${action.replace(/_/g, " ")} event`;
  const metadata = normalizeLogMetadata(payload?.metadata);

  try {
    const { error } = await supabase.rpc("app_log_status_event", {
      p_action: action,
      p_category: category,
      p_message: message,
      p_actor_user_id: actorUserId,
      p_actor_username: actorUsername,
      p_actor_role: actorRole || null,
      p_target_user_id: targetUserId,
      p_target_username: targetUsername,
      p_target_role: targetRole || null,
      p_metadata: metadata,
    });

    if (!error) return true;
    if (isMissingFunctionError(error, "app_log_status_event")) return false;

    console.warn("Status log write failed:", error?.message || error);
    return false;
  } catch (error) {
    console.warn("Status log write failed:", error?.message || error);
    return false;
  }
};

const isMissingNotificationFeatureError = (error) => {
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

const mapNotification = (row) => ({
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
  actor_role: normalizeLogRole(row?.actor_role || ""),
  target_user_id: row?.target_user_id ?? null,
  target_role: normalizeNotificationTargetRole(row?.target_role) || "all",
  metadata:
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {},
});

const describeCurrentActor = () => {
  const actor = readStoredUser();
  const actorName = String(actor?.full_name || actor?.username || "System").trim() || "System";
  const actorRole = normalizeRole(actor?.role || "system") || "system";
  return {
    name: actorName,
    role: actorRole,
    label: `${actorName} (${actorRole})`,
  };
};

const createUserNotification = async (payload: LooseRecord = {}) => {
  const title = String(payload?.title || "").trim();
  const message = String(payload?.message || "").trim();
  if (!title && !message) return false;

  const action = String(payload?.action || "general_update")
    .trim()
    .toLowerCase() || "general_update";
  const category = String(payload?.category || "general")
    .trim()
    .toLowerCase() || "general";

  const actorFallback = readStoredUser();
  const actorUserId = normalizeLogUserId(payload?.actor_user_id ?? actorFallback?.id);
  const actorUsername = normalizeLogText(payload?.actor_username ?? actorFallback?.username);
  const actorRole = normalizeLogRole(payload?.actor_role ?? actorFallback?.role);

  const targetUserId = normalizeLogUserId(payload?.target_user_id);
  const targetRole = normalizeNotificationTargetRole(payload?.target_role);
  const targetRoles = Array.from(
    new Set(
      normalizeListValue(payload?.target_roles)
        .map((value) => normalizeNotificationTargetRole(value))
        .filter(Boolean),
    ),
  );
  const metadata = normalizeLogMetadata(payload?.metadata);

  const baseRow = {
    action,
    category,
    title: title || message || "System update",
    message: message || title || "System update",
    actor_user_id: actorUserId,
    actor_username: actorUsername,
    actor_role: actorRole || null,
    metadata,
  };

  let rows: LooseRecord[] = [];
  if (targetUserId) {
    rows = [{ ...baseRow, target_user_id: targetUserId, target_role: null }];
  } else if (targetRoles.length > 0) {
    rows = targetRoles.map((role) => ({
      ...baseRow,
      target_user_id: null,
      target_role: role,
    }));
  } else {
    rows = [{
      ...baseRow,
      target_user_id: null,
      target_role: targetRole || "all",
    }];
  }

  try {
    const { error } = await supabase.from("notifications").insert(rows);
    if (!error) return true;
    if (isMissingNotificationFeatureError(error)) return false;

    console.warn("Notification write failed:", error?.message || error);
    return false;
  } catch (error) {
    if (isMissingNotificationFeatureError(error)) return false;
    console.warn("Notification write failed:", error?.message || error);
    return false;
  }
};

const requireStoredUser = () => {
  const user = readStoredUser();
  if (!user?.id) {
    const err = new Error("Not authenticated");
    err.status = 401;
    throw err;
  }
  return user;
};

const normalizeListValue = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {}
    }
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeRole = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized === "go" ? "nt" : normalized;
};

const normalizeNotificationTargetRole = (role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;

  if (["all", "everyone"].includes(normalized)) return "all";
  if (["student", "teacher", "admin", "nt", "osas", "treasury"].includes(normalized)) {
    return normalized;
  }

  if (["staff", "non-teaching", "non_teaching", "nonteaching"].includes(normalized)) return "nt";
  if (["faculty", "dean"].includes(normalized)) return "teacher";

  return null;
};

const normalizeRoles = (rolesLike, fallbackRole = "student") => {
  const roles = normalizeListValue(rolesLike)
    .map(normalizeRole)
    .filter(Boolean);
  if (!roles.length) {
    const single = normalizeRole(fallbackRole);
    return [single || "student"];
  }
  return Array.from(new Set(roles));
};

const normalizeSubRoles = (subRolesLike, fallbackSubRole = null) => {
  const subRoles = normalizeListValue(subRolesLike)
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  if (subRoles.length) return Array.from(new Set(subRoles));
  return fallbackSubRole ? [String(fallbackSubRole).trim().toLowerCase()] : [];
};

const normalizeUser = (row) => {
  if (!row) return null;

  const roles = normalizeRoles(row.roles, row.role || "student");
  const subRoles = normalizeSubRoles(row.sub_roles, row.sub_role);

  return {
    ...row,
    image_path: row.image_path || DEFAULT_AVATAR,
    role: roles[0] || "student",
    roles,
    sub_role: subRoles[0] || null,
    sub_roles: subRoles,
  };
};

const normalizeYearLevel = (value) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const match = raw.match(/^(\d)/);
  return match ? match[1] : raw;
};

const normalizeSemester = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "1st Semester";
  if (raw.includes("2") || raw.includes("second")) return "2nd Semester";
  if (raw.includes("summer")) return "Summer";
  return "1st Semester";
};

const currentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 5 ? year : year - 1;
  return `${start}-${start + 1}`;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const isMissingRelation = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || message.includes("does not exist");
};

const isPermissionDeniedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501" || message.includes("permission denied");
};

const normalizeBcryptHash = (hash) => {
  if (!hash) return "";
  if (hash.startsWith("$2y$")) return `$2a$${hash.slice(4)}`;
  return hash;
};

const sanitizeLike = (value) =>
  String(value || "")
    .replace(/[%_,()']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeLikePattern = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

const normalizeAuthIdentityPart = (username, fallback = "user") => {
  const base = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return base || fallback;
};

const buildAuthLoginEmail = (username) => {
  const safe = normalizeAuthIdentityPart(username, "user");
  return `${safe}@local.tcc`;
};

const syncAuthUser = async (userId, password, email = null) => {
  try {
    const numericUserId = Number(userId);
    const rawPassword = String(password || "");
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      return { success: false, error: "Invalid user id." };
    }
    if (rawPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { success: false, error: sessionError.message || "Session lookup failed." };
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return { success: false, error: "No active authenticated session." };
    }

    const payload = {
      user_id: numericUserId,
      password: rawPassword,
      email: email ? String(email).trim().toLowerCase() : null,
    };

    const { data, error } = await supabase.functions.invoke("set-auth-password", {
      body: payload,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      let errorMessage =
        error?.message ||
        (typeof data?.error === "string" ? data.error : "") ||
        "Edge function error";

      // Supabase Functions HTTP errors often include the real body in `error.context`.
      const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
      if (context?.json) {
        const body = await context.json().catch(() => null) as
          | { error?: unknown; message?: unknown }
          | null;
        const detailed =
          (typeof body?.error === "string" && body.error.trim()) ||
          (typeof body?.message === "string" && body.message.trim()) ||
          "";
        if (detailed) errorMessage = detailed;
      }

      return { success: false, error: errorMessage };
    }

    return { success: true, auth_uid: data?.auth_uid || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const buildAutoSchoolId = async () => {
  const year = new Date().getFullYear();

  const generateCandidate = () =>
    `${year} - ${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

  const isAvailable = async (candidate) => {
    const { count, error } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" })
      .eq("school_id", candidate);

    if (error) {
      if (isPermissionDeniedError(error) || isMissingRelation(error)) {
        return true;
      }
      throw formatSupabaseError(error, "Failed to generate school ID.");
    }

    return Number(count || 0) === 0;
  };

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = generateCandidate();
    if (await isAvailable(candidate)) {
      return candidate;
    }
  }

  for (let value = 0; value < 10000; value += 1) {
    const candidate = `${year} - ${String(value).padStart(4, "0")}`;
    if (await isAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique school ID. Please try again.");
};

const parseNumber = (value, fallback = null) => {
  if (value == null || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parsePositiveInteger = (value, fallback = null) => {
  const parsed = parseNumber(value, fallback);
  if (parsed == null || !Number.isFinite(Number(parsed))) return fallback;
  const normalized = Math.floor(Number(parsed));
  if (normalized <= 0) return fallback;
  return normalized;
};

const toSmallintFlag = (value, fallback = 0) => {
  const normalizedFallback = Number(fallback) === 1 ? 1 : 0;
  if (value == null) return normalizedFallback;
  if (typeof value === "number") return value > 0 ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(raw)) return 1;
  if (["0", "false", "no", "n", "off", ""].includes(raw)) return 0;
  return normalizedFallback;
};

const normalizeStudentStatusValue = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "irregular") return "Irregular";
  return "Regular";
};

const inferSanctionLevelFromReason = (reason) => {
  const text = String(reason || "").trim().toLowerCase();
  if (!text) return null;
  if (text.includes("major")) return "major";
  if (text.includes("minor")) return "minor";
  return null;
};

const normalizeOffenseLevel = (value, fallback = "minor") => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw.includes("major")) return "major";
  if (raw.includes("minor")) return "minor";
  return fallback;
};

const normalizeSchoolYearValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return currentSchoolYear();
  const match = raw.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return raw;
};

const parseGradePoint = (value, label = "Grade") => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const validPattern = /^(?:[1-4](?:\.[0-9])?|5(?:\.0)?)$/;
  if (!validPattern.test(raw)) {
    throw new Error(`${label} must be between 1.0 and 5.0 and use one decimal place.`);
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    throw new Error(`${label} must be between 1.0 and 5.0.`);
  }

  return Number(parsed.toFixed(1));
};

const parseOptionalFutureDate = (value, fieldLabel = "date") => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Please enter a valid ${fieldLabel}.`);
  }
  if (date <= new Date()) {
    throw new Error(`${fieldLabel} must be in the future.`);
  }
  return date.toISOString();
};

const toBoolean = (value, fallback = true) => {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "disabled"].includes(raw)) return false;
  return fallback;
};

const normalizeAssignmentStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isInactiveAssignmentStatus = (value) => {
  const status = normalizeAssignmentStatus(value);
  if (!status) return false;
  return ["inactive", "dropped", "archived", "deleted", "removed", "cancelled"].includes(status);
};

const assignmentStatusPriority = (value) => {
  const status = normalizeAssignmentStatus(value);
  if (!status) return 1;
  if (["active", "current", "enrolled"].includes(status)) return 0;
  if (isInactiveAssignmentStatus(status)) return 50;
  return 5;
};

const buildContainsPattern = (value) => {
  const safe = sanitizeLike(value);
  return safe ? `%${safe}%` : null;
};

const ensureAuthUidBoundForStoredUser = async () => {
  const stored = readStoredUser();
  const userId = parseNumber(stored?.id, null);
  if (!userId) return;

  try {
    const { error } = await supabase.rpc("app_bind_auth_uid_for_user", { p_user_id: userId });
    if (
      error &&
      !isMissingFunctionError(error, "app_bind_auth_uid_for_user") &&
      !isPermissionDeniedError(error)
    ) {
      console.warn("Auth UID bind failed:", error?.message || error);
    }
  } catch (error) {
    console.warn("Auth UID bind failed:", error?.message || error);
  }
};

const mapSubject = (row) => ({
  ...row,
  subject_code: row.subject_code || "",
  subject_name: row.subject_name || row.title || "",
  title: row.title || row.subject_name || "",
  units: parseNumber(row.units, 0),
  year_level: parseNumber(row.year_level, null),
});

const mapSection = (row) => ({
  ...row,
  name: row.section_name,
  year: normalizeYearLevel(row.grade_level),
  grade_level: normalizeYearLevel(row.grade_level),
});

const mapBuilding = (row) => ({
  ...row,
  name: row.building_name,
  floors: parseNumber(row.num_floors, 1),
  rooms_per_floor: parseNumber(row.rooms_per_floor, 10),
});

const mapProject = (row) => ({
  ...row,
  name: row.name || row.title || "",
  title: row.title || row.name || "",
  started: row.start_date || null,
  start_date: row.start_date || null,
});

const mapStatusLog = (row) => ({
  id: row?.id ?? null,
  created_at: row?.created_at || null,
  actor_user_id: row?.actor_user_id ?? null,
  actor_username: row?.actor_username || "",
  actor_role: normalizeLogRole(row?.actor_role || ""),
  action: String(row?.action || "")
    .trim()
    .toLowerCase(),
  category: String(row?.category || "general")
    .trim()
    .toLowerCase(),
  target_user_id: row?.target_user_id ?? null,
  target_username: row?.target_username || "",
  target_role: normalizeLogRole(row?.target_role || ""),
  message: row?.message || "",
  metadata:
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {},
});

const mapAccountRequest = (row) => ({
  id: row?.id ?? null,
  request_type: String(row?.request_type || "").trim().toLowerCase(),
  status: String(row?.status || "pending")
    .trim()
    .toLowerCase(),
  requester_user_id: row?.requester_user_id ?? null,
  requester_username: row?.requester_username || "",
  requester_full_name: row?.requester_full_name || "",
  requester_role: normalizeLogRole(row?.requester_role || ""),
  note: row?.note || "",
  created_at: row?.created_at || null,
  updated_at: row?.updated_at || null,
  resolved_at: row?.resolved_at || null,
  resolved_by_user_id: row?.resolved_by_user_id ?? null,
  resolved_by_username: row?.resolved_by_username || "",
  requested_image_path: row?.requested_image_path || "",
});

const normalizeImageStoragePath = (value) => {
  if (!value) return "";

  let cleaned = String(value).trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("data:")) {
    return "";
  }

  cleaned = cleaned.replace(/^\/+/, "");
  cleaned = cleaned.replace(/^TCC\/public\//i, "");
  cleaned = cleaned.replace(/^public\//i, "");
  cleaned = cleaned.replace(/^uploads\/profiles\//i, "");

  if (!cleaned || cleaned.startsWith("images/")) return "";
  return cleaned;
};

const buildAvatarStoragePath = (userId, filename) => {
  const ownerId = String(userId || "").trim();
  if (!/^\d+$/.test(ownerId)) {
    throw new Error("Invalid user id for avatar upload.");
  }
  const safeName = String(filename || "avatar")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "");
  return `profiles/${ownerId}/${Date.now()}_${safeName || "avatar"}`;
};

const isImageFilename = (value) => {
  const name = String(value || "").trim().toLowerCase();
  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/.test(name);
};

const normalizeImageUploadFile = (input, fallbackName = "profile.jpg") => {
  if (!input || typeof input !== "object") return null;

  const size = Number(input?.size || 0);
  if (!Number.isFinite(size) || size <= 0) return null;

  const type = String(input?.type || "").trim().toLowerCase();
  const name = String(input?.name || fallbackName).trim() || fallbackName;
  const looksLikeImage = type.startsWith("image/") || isImageFilename(name);
  if (!looksLikeImage) return null;

  if (typeof File !== "undefined" && input instanceof File) {
    return input;
  }

  if (typeof Blob !== "undefined" && input instanceof Blob && typeof File !== "undefined") {
    return new File([input], name, {
      type: type || "image/jpeg",
      lastModified: Date.now(),
    });
  }

  return null;
};

const extractAvatarOwnerId = (storagePath) => {
  const normalized = String(storagePath || "")
    .trim()
    .replace(/^\/+/, "");
  const match = normalized.match(/^profiles\/(\d+)\//i);
  return match ? match[1] : "";
};

const normalizeAvatarPathForUser = (userId, imagePath) => {
  const normalized = normalizeImageStoragePath(imagePath);
  if (!normalized) return "";

  const ownerId = String(userId || "").trim();
  if (!/^\d+$/.test(ownerId)) return "";

  if (normalized.startsWith(`profiles/${ownerId}/`)) return normalized;
  if (normalized.startsWith(`${ownerId}/`)) return `profiles/${normalized}`;
  return "";
};

const removeAvatarPathIfOwned = async (userId, imagePath) => {
  const ownedPath = normalizeAvatarPathForUser(userId, imagePath);
  if (!ownedPath) return false;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([ownedPath]);
  if (error) {
    console.warn("Failed to remove old avatar path:", ownedPath, error);
    return false;
  }

  return true;
};

const chunkArray = (list, chunkSize = 100) => {
  const items = Array.isArray(list) ? list : [];
  const size = Math.max(1, Number(chunkSize) || 100);
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sumStorageBytes = (entries = []) =>
  (entries || []).reduce((total, item) => {
    const size = parseNumber(item?.metadata?.size, 0) || 0;
    return total + Math.max(0, size);
  }, 0);

const listStorageFilesRecursive = async (bucket, rootPrefix = "") => {
  const files = [];
  const queue = [
    String(rootPrefix || "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, ""),
  ];

  while (queue.length > 0) {
    const prefix = queue.shift();
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix || "", { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (error) {
      const message = String(error.message || "").toLowerCase();
      const missingBucket = message.includes("bucket") && message.includes("not");
      if (String(error.statusCode || "") === "404" || missingBucket) return files;
      throw formatSupabaseError(error);
    }

    for (const entry of data || []) {
      const entryName = String(entry?.name || "").trim();
      if (!entryName || entryName === "." || entryName === "..") continue;

      const fullPath = [prefix, entryName].filter(Boolean).join("/");
      const isFolder = entry?.id == null && entry?.metadata == null;
      if (isFolder) {
        queue.push(fullPath);
        continue;
      }

      files.push({
        ...entry,
        full_path: fullPath,
      });
    }
  }

  return files;
};

const fetchUsersByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();

  let data: any[] | null = null;
  let error: any = null;

  const primary = await supabase
    .from("users")
    .select(`${USER_SAFE_SELECT},gender`)
    .in("id", unique);
  data = primary.data as any[] | null;
  error = primary.error;

  if (error && isMissingColumnError(error, "gender")) {
    const fallback = await supabase.from("users").select(USER_SAFE_SELECT).in("id", unique);
    data = fallback.data as any[] | null;
    error = fallback.error;
  }

  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, normalizeUser(row)));
  return map;
};

const fetchSectionsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapSection(row)));
  return map;
};

const fetchSubjectsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapSubject(row)));
  return map;
};

const fetchBuildingsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapBuilding(row)));
  return map;
};

const findSection = async (
  { sectionId = null, sectionName = "", year = "" }: LooseRecord = {},
) => {
  if (sectionId) {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("id", sectionId)
      .limit(1)
      .maybeSingle();
    if (error) throw formatSupabaseError(error);
    return data ? mapSection(data) : null;
  }

  if (!sectionName) return null;

  const normalizedYear = normalizeYearLevel(year);
  let query = supabase.from("sections").select("*").ilike("section_name", sectionName);
  if (normalizedYear) query = query.eq("grade_level", normalizedYear);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw formatSupabaseError(error);
  return data ? mapSection(data) : null;
};

const findSubjectByCode = async (subjectCode) => {
  if (!subjectCode) return null;
  const code = String(subjectCode).trim();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .ilike("subject_code", code)
    .limit(1)
    .maybeSingle();
  if (error) throw formatSupabaseError(error);
  return data ? mapSubject(data) : null;
};

const upsertSetting = async (settingKey, settingValue, description = "") => {
  const payload = {
    setting_key: settingKey,
    setting_value: settingValue,
    description,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("evaluation_settings")
    .update(payload)
    .eq("setting_key", settingKey)
    .select("id");

  if (updateError) throw formatSupabaseError(updateError);
  if ((updated || []).length > 0) return true;

  const { error: insertError } = await supabase
    .from("evaluation_settings")
    .insert(payload);
  if (insertError) throw formatSupabaseError(insertError);
  return true;
};

const safeUserUpdate = async (userId: number, payload: LooseRecord): Promise<any> => {
  const mutable: LooseRecord = { ...payload };

  while (Object.keys(mutable).length > 0) {
    const { data, error } = await supabase
      .from("users")
      .update(mutable)
      .eq("id", userId)
      .select(USER_SAFE_SELECT)
      .single();

    if (!error) return data;

    const message = String(error.message || "");
    const missingColumn =
      message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1] ||
      message.match(/could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)?.[1];

    if (missingColumn && Object.prototype.hasOwnProperty.call(mutable, missingColumn)) {
      delete mutable[missingColumn];
      continue;
    }

    throw formatSupabaseError(error);
  }

  throw new Error("No valid user columns to update.");
};

const safeSyncUserGender = async (userId: number, gender: unknown): Promise<void> => {
  const normalizedUserId = Number(userId);
  const normalizedGender = String(gender || "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return;
  if (!normalizedGender) return;

  try {
    await safeUserUpdate(normalizedUserId, {
      gender: normalizedGender,
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    if (isPermissionDeniedError(error) || isMissingColumnError(error, "gender")) {
      return;
    }
    throw error;
  }
};

export const getAvatarUrl = async (_userId, imagePath) => {
  try {
    if (!imagePath) return DEFAULT_AVATAR;
    const raw = String(imagePath).trim();

    if (!raw) return DEFAULT_AVATAR;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
      return raw;
    }

    if (raw.startsWith("/images/") || raw.startsWith("images/")) {
      return raw.startsWith("/") ? raw : `/${raw}`;
    }

    const cleaned = normalizeImageStoragePath(raw);
    if (!cleaned) return DEFAULT_AVATAR;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(cleaned);
    return data?.publicUrl || DEFAULT_AVATAR;
  } catch (_) {
    return DEFAULT_AVATAR;
  }
};

export const AuthAPI = {
  login: async (username, password) =>
    withApi(async () => {
      if (!username || !password) {
        throw new Error("Username and password are required.");
      }

      const identifier = String(username).trim();

      // Preferred path for RLS-enabled projects: SECURITY DEFINER RPC in Supabase.
      const { data: rpcData, error: rpcError } = await supabase.rpc("app_login", {
        p_identifier: identifier,
        p_password: String(password),
      });

      if (!rpcError) {
        const rpcRow = Array.isArray(rpcData) ? (rpcData[0] || null) : (rpcData || null);
        if (!rpcRow) throw new Error("Invalid username or password.");

        let loginEmail = rpcRow?.auth_email
          ? String(rpcRow.auth_email).trim().toLowerCase()
          : buildAuthLoginEmail(rpcRow.username || identifier);

        const passwordText = String(password);
        const tryRepairAuthProfile = async () => {
          try {
            const { data: repairData, error: repairError } = await supabase.rpc(
              "app_repair_auth_profile_for_login",
              {
                p_identifier: identifier,
                p_password: passwordText,
              },
            );

            if (repairError) {
              if (isMissingFunctionError(repairError, "app_repair_auth_profile_for_login")) {
                return { repaired: false, authEmail: null };
              }
              const detail = String(repairError?.message || "").trim();
              if (detail) {
                console.warn("app_repair_auth_profile_for_login failed:", detail);
              }
              return { repaired: false, authEmail: null };
            }

            const repairRow = Array.isArray(repairData)
              ? (repairData[0] || null)
              : (repairData || null);
            const repaired =
              Boolean(repairRow?.auth_uid) &&
              Boolean(repairRow?.auth_synced);
            const repairedEmail = repairRow?.auth_email
              ? String(repairRow.auth_email).trim().toLowerCase()
              : null;

            return { repaired, authEmail: repairedEmail };
          } catch (repairUnexpectedError) {
            const detail = String(repairUnexpectedError?.message || "").trim();
            if (detail) {
              console.warn("Unexpected auth profile repair failure:", detail);
            }
            return { repaired: false, authEmail: null };
          }
        };
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        const trySignIn = async (email = loginEmail) =>
          supabase.auth.signInWithPassword({
            email,
            password: passwordText,
          });
        const isInvalidCredentialError = (error) => {
          if (!error) return false;
          const message = String(error.message || "").toLowerCase();
          return (
            message.includes("invalid login credentials") ||
            message.includes("invalid email or password") ||
            message.includes("invalid credentials") ||
            message.includes("user not found")
          );
        };
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const trySignInWithRetry = async (email = loginEmail) => {
          let result = await trySignIn(email);
          if (!isInvalidCredentialError(result.error)) return result;

          for (const delayMs of [250, 600, 1200, 2500, 5000]) {
            await wait(delayMs);
            result = await trySignIn(email);
            if (!isInvalidCredentialError(result.error)) {
              return result;
            }
          }

          return result;
        };

        const attemptRepairAndSignIn = async () => {
          const repairResult = await tryRepairAuthProfile();
          if (!repairResult.repaired) {
            return {
              repaired: false,
              authEmail: repairResult.authEmail || null,
              signInError: null,
            };
          }

          let repairedEmail =
            repairResult.authEmail ||
            buildAuthLoginEmail(rpcRow.username || identifier);

          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          let { error: repairedSignInError } = await trySignInWithRetry(repairedEmail);

          if (repairedSignInError) {
            const canonicalEmail = buildAuthLoginEmail(rpcRow.username || identifier);
            if (canonicalEmail && canonicalEmail !== repairedEmail) {
              ({ error: repairedSignInError } = await trySignInWithRetry(canonicalEmail));
              if (!repairedSignInError) {
                repairedEmail = canonicalEmail;
              }
            }
          }

          return {
            repaired: !repairedSignInError,
            authEmail: repairedEmail,
            signInError: repairedSignInError || null,
          };
        };

        let attemptedRepair = false;
        let { error: signInError } = await trySignInWithRetry();
        if (signInError) {
          const likelyMissingAuthUser = isInvalidCredentialError(signInError);

          if (likelyMissingAuthUser) {
            attemptedRepair = true;
            const repairResult = await tryRepairAuthProfile();
            if (repairResult.repaired) {
              if (repairResult.authEmail) {
                loginEmail = repairResult.authEmail;
              }
              ({ error: signInError } = await trySignInWithRetry(loginEmail));
            }

            if (!repairResult.repaired) {
              throw new Error(
                "Secure auth profile is missing for this account. Ask an admin to reset the password once in Admin > Account Access.",
              );
            }
          }
        }

        if (signInError) {
          if (
            attemptedRepair &&
            isInvalidCredentialError(signInError)
          ) {
            // Final reconciliation attempt: fetch latest UID-resolved auth email and retry once.
            const { data: refreshedRpcData, error: refreshedRpcError } = await supabase.rpc(
              "app_login",
              {
                p_identifier: identifier,
                p_password: passwordText,
              },
            );
            if (!refreshedRpcError) {
              const refreshedRpcRow = Array.isArray(refreshedRpcData)
                ? (refreshedRpcData[0] || null)
                : (refreshedRpcData || null);
              const refreshedEmail = refreshedRpcRow?.auth_email
                ? String(refreshedRpcRow.auth_email).trim().toLowerCase()
                : null;
              if (refreshedEmail) {
                loginEmail = refreshedEmail;
                ({ error: signInError } = await trySignInWithRetry(loginEmail));
              }
            }

            if (signInError) {
              const canonicalEmail = buildAuthLoginEmail(rpcRow.username || identifier);
              if (canonicalEmail && canonicalEmail !== loginEmail) {
                ({ error: signInError } = await trySignInWithRetry(canonicalEmail));
                if (!signInError) {
                  loginEmail = canonicalEmail;
                }
              }
            }

            if (signInError) {
              const secondRepairAttempt = await attemptRepairAndSignIn();
              if (secondRepairAttempt.repaired) {
                signInError = null;
              }
            }

            if (signInError) {
              const reason = String(signInError?.message || "").trim();
              throw new Error(
                reason
                  ? `Account password was verified, but Supabase Auth is still out of sync (${reason}). Ask an admin to reset this account password in Admin > Account Access.`
                  : "Account password was verified, but Supabase Auth is still out of sync. Ask an admin to reset this account password in Admin > Account Access.",
              );
            }
          }
          if (signInError) {
            throw formatSupabaseError(
              signInError,
              "Secure session sign-in failed.",
            );
          }
        }

        const { data: authUserData } = await supabase.auth.getUser();
        let authUid = authUserData?.user?.id || null;
        let sessionBound = false;

        if (authUid) {
          const { data: bindData, error: bindError } = await supabase.rpc("app_bind_auth_uid_for_user", {
            p_user_id: rpcRow.id,
          });
          if (bindError && !isMissingFunctionError(bindError, "app_bind_auth_uid_for_user")) {
            throw formatSupabaseError(bindError);
          }

          const bindRow = Array.isArray(bindData) ? (bindData[0] || null) : (bindData || null);
          sessionBound =
            Boolean(bindRow?.auth_uid) &&
            String(bindRow.auth_uid) === String(authUid);
        }

        if (authUid && !sessionBound) {
          const repaired = await attemptRepairAndSignIn();
          if (!repaired.repaired) {
            throw new Error(
              "Secure profile linkage is out of sync for this account. Ask an admin to reset password once in Admin > Account Access.",
            );
          }

          if (repaired.authEmail) {
            loginEmail = repaired.authEmail;
          }

          const { data: refreshedAuthData } = await supabase.auth.getUser();
          authUid = refreshedAuthData?.user?.id || null;

          if (authUid) {
            const { error: rebindError } = await supabase.rpc("app_bind_auth_uid_for_user", {
              p_user_id: rpcRow.id,
            });
            if (rebindError && !isMissingFunctionError(rebindError, "app_bind_auth_uid_for_user")) {
              throw formatSupabaseError(rebindError);
            }
          }
        }

        let profileRow: any = null;
        const { data: firstProfileRow, error: profileError } = await supabase
          .from("users")
          .select(USER_SAFE_SELECT)
          .eq("id", rpcRow.id)
          .limit(1)
          .maybeSingle();
        if (profileError) throw formatSupabaseError(profileError);
        profileRow = firstProfileRow || null;

        if (!profileRow) {
          const repaired = await attemptRepairAndSignIn();
          if (repaired.repaired) {
            if (repaired.authEmail) {
              loginEmail = repaired.authEmail;
            }
            const { data: retriedProfileRow, error: retriedProfileError } = await supabase
              .from("users")
              .select(USER_SAFE_SELECT)
              .eq("id", rpcRow.id)
              .limit(1)
              .maybeSingle();
            if (retriedProfileError) throw formatSupabaseError(retriedProfileError);
            profileRow = retriedProfileRow || null;
          }
        }

        if (!profileRow) {
          throw new Error(
            "Authenticated session could not be linked to your user profile. Ask an admin to reset your account password once in Admin > Account Access.",
          );
        }

        const user = normalizeUser(profileRow);
        writeStoredUser(user);

        await logStatusEvent({
          action: "login",
          category: "auth",
          actor_user_id: user?.id,
          actor_username: user?.username,
          actor_role: user?.role,
          target_user_id: user?.id,
          target_username: user?.username,
          target_role: user?.role,
          message: `${user?.full_name || user?.username || "User"} logged in.`,
          metadata: { method: "password" },
        });

        return { success: true, user };
      }

      if (isMissingFunctionError(rpcError, "app_login")) {
        throw new Error(
          "Secure login function app_login is missing. Run the SQL in supabase.txt to enable RLS-safe authentication.",
        );
      }
      throw formatSupabaseError(rpcError);
    }),

  signup: async (_userData) =>
    withApi(async () => {
      throw new Error("Self-service account creation is disabled. Contact an administrator.");
    }),

  updateProfile: async (profileData) => {
    try {
      return await withApi(async () => {
        const currentUser = requireStoredUser();
        const canEditPersonalInfo = normalizeRole(currentUser?.role) !== "student";
        const isForm = profileData instanceof FormData;
        const username = isForm ? profileData.get("username") : profileData?.username;
        const fullName = isForm ? profileData.get("full_name") : profileData?.full_name;
        const gender = isForm ? profileData.get("gender") : profileData?.gender;
        const password = isForm ? profileData.get("password") : profileData?.password;
        const imageFile = isForm
          ? profileData.get("profile_image") || profileData.get("profile_picture")
          : null;

        const updates: LooseRecord = { updated_at: new Date().toISOString() };
        let previousAvatarPath = "";
        if (canEditPersonalInfo && username) updates.username = String(username).trim();
        if (canEditPersonalInfo && fullName) updates.full_name = String(fullName).trim();
        if (canEditPersonalInfo && gender) updates.gender = String(gender).trim();

        if (updates.username && updates.username !== currentUser.username) {
          const { data: existingUsername, error: existingError } = await supabase
            .from("users")
            .select("id")
            .eq("username", updates.username)
            .neq("id", currentUser.id)
            .limit(1);
          if (existingError) throw formatSupabaseError(existingError);
          if ((existingUsername || []).length > 0) {
            throw new Error("Username is already taken.");
          }
        }

        if (password) {
          const rawPassword = String(password);
          const isAdminUser = normalizeRole(currentUser?.role) === "admin";
          if (!isAdminUser) {
            throw new Error(
              "Direct password change is disabled. Submit a password reset request and wait for approval.",
            );
          }
          const { error: authPasswordError } = await supabase.auth.updateUser({
            password: rawPassword,
          });
          if (authPasswordError) {
            throw formatSupabaseError(
              authPasswordError,
              "Failed to update auth password.",
            );
          }
        }

        if (imageFile) {
          const normalizedImage = normalizeImageUploadFile(imageFile, "avatar.jpg");
          if (!normalizedImage) {
            throw new Error("Please select a valid image file.");
          }
          previousAvatarPath = normalizeAvatarPathForUser(currentUser.id, currentUser.image_path);
          const storagePath = buildAvatarStoragePath(currentUser.id, normalizedImage.name);
          const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(storagePath, normalizedImage, { upsert: true });
          if (uploadError) throw formatSupabaseError(uploadError, "Failed to upload avatar.");
          updates.image_path = storagePath;
        }

        const updatedRow = await safeUserUpdate(currentUser.id, updates);
        const normalized = normalizeUser(updatedRow);
        writeStoredUser(normalized);
        const avatar = await getAvatarUrl(normalized.id, normalized.image_path);

        const nextAvatarPath = normalizeAvatarPathForUser(normalized.id, normalized.image_path);
        if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) {
          await removeAvatarPathIfOwned(normalized.id, previousAvatarPath);
        }

        const changedFields = Object.keys(updates).filter((key) => key !== "updated_at");
        await logStatusEvent({
          action: "account_update",
          category: "account",
          actor_user_id: normalized?.id,
          actor_username: normalized?.username,
          actor_role: normalized?.role,
          target_user_id: normalized?.id,
          target_username: normalized?.username,
          target_role: normalized?.role,
          message: `${normalized?.full_name || normalized?.username || "User"} updated account details.`,
          metadata: { changed_fields: changedFields },
        });

        return { success: true, user: normalized, avatar_url: avatar };
      });
    } catch (error) {
      return { success: false, error: error.message || "Failed to update profile." };
    }
  },

  checkSession: async () =>
    withApi(async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw formatSupabaseError(sessionError);

      const sessionUser = sessionData?.session?.user;
      if (!sessionUser) {
        clearStoredUser();
        emitUnauthorized();
        return { authenticated: false, user: null };
      }

      const { data: bindData, error: bindError } = await supabase.rpc("app_bind_auth_uid");
      if (bindError && !isMissingFunctionError(bindError, "app_bind_auth_uid")) {
        throw formatSupabaseError(bindError);
      }

      const boundUserId = Array.isArray(bindData) ? bindData[0]?.id : bindData?.id;

      const { data: rpcData, error: rpcError } = await supabase.rpc("app_get_current_user");
      let data = null;
      if (!rpcError) {
        data = Array.isArray(rpcData) ? (rpcData[0] || null) : (rpcData || null);
      } else if (!isMissingFunctionError(rpcError, "app_get_current_user")) {
        throw formatSupabaseError(rpcError);
      }

      if (!data) {
        let query = supabase.from("users").select(USER_SAFE_SELECT).limit(1);
        if (boundUserId) {
          query = query.eq("id", boundUserId);
        } else {
          query = query.eq("auth_uid", sessionUser.id);
        }

        const { data: fallbackData, error } = await query.maybeSingle();
        if (error) {
          clearStoredUser();
          emitUnauthorized();
          return { authenticated: false, user: null };
        }
        data = fallbackData || null;
      }

      if (!data) {
        clearStoredUser();
        emitUnauthorized();
        return { authenticated: false, user: null };
      }

      const user = normalizeUser(data);
      writeStoredUser(user);
      return { authenticated: true, user };
    }),

  logout: async () =>
    withApi(async () => {
      await supabase.auth.signOut();
      clearStoredUser();
      emitUnauthorized();
      return { success: true };
    }, { silent: true }),

  check: async () => AuthAPI.checkSession(),
};

export const PublicAPI = {
  getStats: async () =>
    withApi(async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc("app_public_stats");
      if (!rpcError) {
        const row = Array.isArray(rpcData) ? (rpcData[0] || null) : (rpcData || null);
        if (row) {
          return {
            users: Number(row.users) || 0,
            buildings: Number(row.buildings) || 0,
            subjects: Number(row.subjects) || 0,
            sections: Number(row.sections) || 0,
          };
        }
      } else if (
        !isMissingFunctionError(rpcError, "app_public_stats") &&
        !isPermissionDeniedError(rpcError)
      ) {
        throw formatSupabaseError(rpcError);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw formatSupabaseError(sessionError);
      if (!sessionData?.session) {
        return { users: 0, buildings: 0, subjects: 0, sections: 0 };
      }

      const [usersCount, buildingsCount, subjectsCount, sectionsCount] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("buildings").select("*", { count: "exact", head: true }),
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("sections").select("*", { count: "exact", head: true }),
      ]);

      const firstError =
        usersCount.error || buildingsCount.error || subjectsCount.error || sectionsCount.error;
      if (firstError) {
        if (isPermissionDeniedError(firstError)) {
          return { users: 0, buildings: 0, subjects: 0, sections: 0 };
        }
        throw formatSupabaseError(firstError);
      }

      return {
        users: usersCount.count || 0,
        buildings: buildingsCount.count || 0,
        subjects: subjectsCount.count || 0,
        sections: sectionsCount.count || 0,
      };
    }),

  getLandingPageStats: async () =>
    withApi(async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc("app_public_landing_stats");
      if (!rpcError) {
        const row = Array.isArray(rpcData) ? (rpcData[0] || null) : (rpcData || null);
        if (row) {
          const rawAvatars = Array.isArray(row.avatars) ? row.avatars : [];
          const urls = await Promise.all(rawAvatars.map((path) => getAvatarUrl(null, path)));
          const avatars = urls.filter(Boolean).slice(0, 3);
          return {
            totalStudents:
              Number(row.total_students ?? row.totalStudents ?? row.students ?? row.users) || 0,
            avatars,
          };
        }
      } else if (
        !isMissingFunctionError(rpcError, "app_public_landing_stats") &&
        !isPermissionDeniedError(rpcError)
      ) {
        throw formatSupabaseError(rpcError);
      }

      // Fallback for projects without public landing RPC.
      const [{ data: students, error: studentsError }, { count, error: countError }] =
        await Promise.all([
          supabase
            .from("users")
            .select("image_path,updated_at")
            .eq("role", "student")
            .not("image_path", "is", null)
            .order("updated_at", { ascending: false })
            .limit(24),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("role", "student"),
        ]);

      if (studentsError && !isPermissionDeniedError(studentsError)) {
        throw formatSupabaseError(studentsError);
      }

      let totalStudents = Number(count) || 0;
      if (countError && !isPermissionDeniedError(countError)) {
        throw formatSupabaseError(countError);
      }

      // Public login page cannot read users directly with strict RLS;
      // use public aggregate stats as a best-effort realtime count fallback.
      if (countError && isPermissionDeniedError(countError)) {
        try {
          const publicStats = await PublicAPI.getStats();
          totalStudents = Number(publicStats?.users) || 0;
        } catch (_) {}
      }

      const avatarPaths = (students || [])
        .map((student) => student?.image_path)
        .filter((path) => !isDefaultAvatarPath(path));
      const avatarUrls = await Promise.all(avatarPaths.map((path) => getAvatarUrl(null, path)));
      const avatars = Array.from(new Set(avatarUrls.filter(Boolean))).slice(0, 3);

      return {
        totalStudents,
        avatars,
      };
    }, { silent: true }),
};

const mapAnnouncement = (row) => ({
  ...row,
  priority: row.priority || "medium",
  target_role: row.target_role || "all",
  is_published: row.is_published == null ? 1 : row.is_published,
});

const mapScheduleRows = async (scheduleRows) => {
  const rows = scheduleRows || [];
  if (!rows.length) return [];

  const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
  const teacherAssignmentIds = rows.map((row) => row.teacher_assignment_id).filter(Boolean);
  const subjectCodes = Array.from(new Set(rows.map((row) => row.subject_code).filter(Boolean)));

  const [sectionsMap, teacherAssignmentsResult, sectionAssignmentsResult, subjectsResult] =
    await Promise.all([
      fetchSectionsByIds(sectionIds),
      teacherAssignmentIds.length
        ? supabase
            .from("teacher_assignments")
            .select("*")
            .in("id", teacherAssignmentIds)
        : Promise.resolve({ data: [], error: null }),
      sectionIds.length
        ? supabase
            .from("section_assignments")
            .select("*")
            .in("section_id", sectionIds)
        : Promise.resolve({ data: [], error: null }),
      subjectCodes.length
        ? supabase
            .from("subjects")
            .select("*")
            .in("subject_code", subjectCodes)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (teacherAssignmentsResult.error) throw formatSupabaseError(teacherAssignmentsResult.error);
  if (sectionAssignmentsResult.error) throw formatSupabaseError(sectionAssignmentsResult.error);
  if (subjectsResult.error) throw formatSupabaseError(subjectsResult.error);

  const teacherAssignments = teacherAssignmentsResult.data || [];
  const sectionAssignments = sectionAssignmentsResult.data || [];
  const subjects = subjectsResult.data || [];

  const teacherUserIds = teacherAssignments.map((row) => row.teacher_id).filter(Boolean);
  const buildingIds = sectionAssignments.map((row) => row.building_id).filter(Boolean);

  const [usersMap, buildingsMap] = await Promise.all([
    fetchUsersByIds(teacherUserIds),
    fetchBuildingsByIds(buildingIds),
  ]);

  const teacherAssignmentMap = new Map();
  teacherAssignments.forEach((row) => teacherAssignmentMap.set(row.id, row));

  const sectionAssignmentBySection = new Map();
  sectionAssignments.forEach((row) => {
    if (!sectionAssignmentBySection.has(row.section_id)) {
      sectionAssignmentBySection.set(row.section_id, row);
    }
  });

  const subjectByCode = new Map();
  subjects.forEach((row) => subjectByCode.set(row.subject_code, mapSubject(row)));

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mapped = rows.map((row) => {
    const section = sectionsMap.get(row.section_id);
    const assignment = teacherAssignmentMap.get(row.teacher_assignment_id);
    const teacher = assignment ? usersMap.get(assignment.teacher_id) : null;
    const roomAssignment = sectionAssignmentBySection.get(row.section_id);
    const building = roomAssignment ? buildingsMap.get(roomAssignment.building_id) : null;
    const subject = subjectByCode.get(row.subject_code);

    const startHour = parseInt(String(row.time_start || "0").split(":")[0], 10);
    const classType =
      row.class_type || (!Number.isNaN(startHour) && startHour >= 18 ? "night" : "day");

    return {
      id: row.id,
      section_id: row.section_id || section?.id || null,
      teacher_assignment_id: row.teacher_assignment_id || null,
      day: row.day_of_week || row.day || "Monday",
      time_start: row.time_start,
      time_end: row.time_end,
      subject: row.subject_code || subject?.subject_code || "",
      subject_id: subject?.id || assignment?.subject_id || null,
      subject_title: subject?.subject_name || "",
      instructor: teacher?.full_name || teacher?.username || null,
      year: section?.grade_level || "",
      section: section?.section_name || "",
      building: building?.name || null,
      floor: roomAssignment?.floor_number ?? null,
      room: roomAssignment?.room_number ?? null,
      class_type: classType,
    };
  });

  mapped.sort((a, b) => {
    const dayA = dayOrder.indexOf(a.day);
    const dayB = dayOrder.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return String(a.time_start || "").localeCompare(String(b.time_start || ""));
  });

  return mapped;
};

const mapUserAssignmentRows = async (rows) => {
  const assignments = rows || [];
  if (!assignments.length) return [];

  const userIds = assignments.map((row) => row.user_id).filter(Boolean);
  const sectionIds = assignments.map((row) => row.section_id).filter(Boolean);
  const [usersMap, sectionsMap] = await Promise.all([
    fetchUsersByIds(userIds),
    fetchSectionsByIds(sectionIds),
  ]);

  return assignments.map((row) => {
    const user = usersMap.get(row.user_id);
    const section = sectionsMap.get(row.section_id);
    const year = normalizeYearLevel(row.year_level || section?.grade_level);
    const sanctions = row.sanctions === true || Number(row.sanctions) > 0;
    return {
      ...row,
      user_id: row.user_id,
      id: row.id,
      username: user?.username || "",
      full_name: user?.full_name || user?.username || "",
      school_id: user?.school_id || "",
      gender: user?.gender || "",
      image_path: user?.image_path || DEFAULT_AVATAR,
      year,
      year_level: year,
      grade_level: year,
      section: row.section || section?.section_name || "",
      section_name: section?.section_name || row.section || "",
      department: row.department || section?.course || "",
      major: row.major || section?.major || "",
      payment: row.payment || "paid",
      amount_lacking: parseNumber(row.amount_lacking, null),
      sanctions,
      sanction_reason: row.sanction_reason || "",
      semester: row.semester || "1st Semester",
      school_year: row.school_year || section?.school_year || currentSchoolYear(),
      student_status: row.student_status || "Regular",
    };
  });
};

const ensureBuilding = async (buildingName) => {
  const normalized = String(buildingName || "").trim();
  if (!normalized) return null;

  const { data: existing, error: existingError } = await supabase
    .from("buildings")
    .select("*")
    .ilike("building_name", normalized)
    .limit(1)
    .maybeSingle();
  if (existingError) throw formatSupabaseError(existingError);
  if (existing) return mapBuilding(existing);

  const { data: inserted, error: insertError } = await supabase
    .from("buildings")
    .insert({
      building_name: normalized,
      num_floors: 4,
      rooms_per_floor: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (insertError) throw formatSupabaseError(insertError);
  return mapBuilding(inserted);
};

const ensureStudyLoad = async ({
  section,
  subject,
  teacherName = null,
  failIfExists = false,
}) => {
  const { data: existing, error: existingError } = await supabase
    .from("study_load")
    .select("*")
    .eq("section_id", section.id)
    .eq("subject_id", subject.id)
    .limit(1);

  if (existingError) throw formatSupabaseError(existingError);
  if ((existing || []).length > 0) {
    if (failIfExists) {
      const duplicateError = new Error("Subject already assigned to this section.");
      duplicateError.status = 409;
      throw duplicateError;
    }
    return existing[0];
  }

  const { data, error } = await supabase
    .from("study_load")
    .insert({
      student_id: null,
      subject_id: subject.id,
      section_id: section.id,
      school_year: section.school_year || currentSchoolYear(),
      semester: subject.semester || "1st Semester",
      enrollment_status: "enrolled",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      course: section.course || subject.course || null,
      major: section.major || subject.major || null,
      year_level: normalizeYearLevel(section.grade_level || subject.year_level),
      section: section.section_name,
      subject_code: subject.subject_code,
      subject_title: subject.subject_name,
      units: subject.units || 0,
      teacher: teacherName,
    })
    .select("*")
    .single();

  if (error) throw formatSupabaseError(error);
  return data;
};

const countExact = async (table) => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw formatSupabaseError(error);
  return count || 0;
};

const fetchUserLogSnapshot = async (userId) => {
  const numericUserId = normalizeLogUserId(userId);
  if (!numericUserId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id,username,full_name,role")
    .eq("id", numericUserId)
    .limit(1)
    .maybeSingle();
  if (error) throw formatSupabaseError(error);
  return data || null;
};

const deleteUserRecords = async (userId: number, options: LooseRecord = {}) => {
  const targetSnapshot =
    options?.target_user && typeof options.target_user === "object"
      ? options.target_user
      : await fetchUserLogSnapshot(userId).catch(() => null);

  await Promise.all([
    supabase.from("user_assignments").delete().eq("user_id", userId),
    supabase.from("teacher_assignments").delete().eq("teacher_id", userId),
    supabase.from("grades").delete().eq("student_id", userId),
    supabase.from("grades").delete().eq("teacher_id", userId),
    supabase.from("teacher_evaluations").delete().eq("student_id", userId),
    supabase.from("teacher_evaluations").delete().eq("teacher_id", userId),
    supabase.from("announcements").delete().eq("author_id", userId),
    supabase.from("feedbacks").delete().eq("student_id", userId),
    supabase.from("feedbacks").update({ replied_by: null }).eq("replied_by", userId),
  ]);

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw formatSupabaseError(error);

  if (!options?.skip_log) {
    await logStatusEvent({
      action: options?.action || "delete_account",
      category: options?.category || "account",
      actor_user_id: options?.actor_user_id,
      actor_username: options?.actor_username,
      actor_role: options?.actor_role,
      target_user_id: targetSnapshot?.id ?? userId,
      target_username: targetSnapshot?.username || null,
      target_role: targetSnapshot?.role || null,
      message:
        options?.message ||
        `Account "${targetSnapshot?.full_name || targetSnapshot?.username || userId}" was deleted.`,
      metadata: options?.metadata || {},
    });
  }

  return { success: true };
};

const mapScopedRecordEvent = (row) => {
  const metadata =
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const targetUserId =
    parseNumber(row?.target_user_id, null) ??
    parseNumber(metadata?.target_user_id, null) ??
    parseNumber(metadata?.user_id, null) ??
    parseNumber(metadata?.student_id, null);
  const targetUsername =
    String(row?.target_username || "").trim() ||
    String(metadata?.target_username || "").trim() ||
    String(metadata?.student_name || "").trim() ||
    "";

  return {
    id: parseNumber(row?.id, null),
    created_at: row?.created_at || null,
    action: String(row?.action || "")
      .trim()
      .toLowerCase(),
    message: String(row?.message || "").trim(),
    target_user_id: targetUserId,
    target_username: targetUsername,
    metadata,
  };
};

const matchesAssignmentFilters = (assignment: LooseRecord, filters: LooseRecord = {}) => {
  const targetYear = String(filters?.year || filters?.year_level || "").trim().toLowerCase();
  const targetSection = String(filters?.section || "").trim().toLowerCase();
  const targetDepartment = String(filters?.department || "").trim().toLowerCase();
  const schoolYearInput = String(filters?.school_year || "").trim();
  const targetSchoolYear = schoolYearInput ? normalizeSchoolYearValue(schoolYearInput) : "";

  if (targetYear) {
    const assignmentYear = String(assignment?.year || assignment?.year_level || "")
      .trim()
      .toLowerCase();
    if (assignmentYear && assignmentYear !== targetYear) return false;
  }

  if (targetSection) {
    const assignmentSection = String(assignment?.section || assignment?.section_name || "")
      .trim()
      .toLowerCase();
    if (assignmentSection && assignmentSection !== targetSection) return false;
  }

  if (targetDepartment) {
    const assignmentDepartment = String(assignment?.department || "")
      .trim()
      .toLowerCase();
    if (assignmentDepartment && assignmentDepartment !== targetDepartment) return false;
  }

  if (targetSchoolYear) {
    const assignmentSchoolYearRaw = String(assignment?.school_year || "").trim();
    const assignmentSchoolYear = assignmentSchoolYearRaw
      ? normalizeSchoolYearValue(assignmentSchoolYearRaw)
      : "";
    if (assignmentSchoolYear && assignmentSchoolYear !== targetSchoolYear) return false;
  }

  return true;
};

const fetchScopedRecordEvents = async (rpcName: string, args: LooseRecord = {}) => {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    if (isMissingFunctionError(error, rpcName) || isPermissionDeniedError(error)) {
      return [];
    }
    throw formatSupabaseError(error);
  }
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map(mapScopedRecordEvent);
};

export const AdminAPI = {
  getUsers: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const fetchUsers = async (): Promise<any[]> => {
        const primarySelect = `${USER_SAFE_SELECT},expires_at`;
        let data: any[] | null = null;
        let error: any = null;

        const primary = await supabase
          .from("users")
          .select(primarySelect)
          .order("full_name", { ascending: true });
        data = primary.data as any[] | null;
        error = primary.error;

        if (error && isMissingColumnError(error, "expires_at")) {
          const fallback = await supabase
            .from("users")
            .select(USER_SAFE_SELECT)
            .order("full_name", { ascending: true });
          data = fallback.data;
          error = fallback.error;
        }
        if (error) throw formatSupabaseError(error);
        return (data || []).map(normalizeUser);
      };

      let mapped: any[] = await fetchUsers();

      const now = new Date();
      const expiredUsers = mapped.filter((user) => {
        if (!user?.expires_at) return false;
        const expiresAt = new Date(user.expires_at);
        return !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
      });

      if (expiredUsers.length > 0) {
        for (const user of expiredUsers) {
          await deleteUserRecords(user.id, {
            action: "account_expired_cleanup",
            category: "account",
            actor_username: "system",
            actor_role: "system",
            target_user: user,
            message: `Expired account "${user.full_name || user.username || user.id}" was removed.`,
            metadata: {
              expires_at: user.expires_at || null,
              source: "account_access_refresh",
            },
          });
        }
        mapped = await fetchUsers();
      }

      if (filters?.includePurgeSummary) {
        return {
          users: mapped,
          deletedExpiredCount: expiredUsers.length,
        };
      }

      if (!filters?.role) return mapped;
      const role = normalizeRole(filters.role);
      return mapped.filter((user) => user.roles.includes(role));
    }),

  getStatusLogs: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const limitValue = Number(filters?.limit);
      const limit = Number.isFinite(limitValue)
        ? Math.min(1000, Math.max(20, Math.trunc(limitValue)))
        : 500;

      let query = supabase
        .from("status_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      const actionFilter = String(filters?.action || "")
        .trim()
        .toLowerCase();
      if (actionFilter) {
        query = query.eq("action", actionFilter);
      }

      const actorRoleFilter = normalizeLogRole(filters?.actor_role);
      if (actorRoleFilter) {
        query = query.eq("actor_role", actorRoleFilter);
      }

      const categoryFilter = String(filters?.category || "")
        .trim()
        .toLowerCase();
      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      const dateFromRaw = String(filters?.date_from || "").trim();
      if (dateFromRaw) {
        const fromDate = new Date(dateFromRaw);
        if (!Number.isNaN(fromDate.getTime())) {
          query = query.gte("created_at", fromDate.toISOString());
        }
      }

      const dateToRaw = String(filters?.date_to || "").trim();
      if (dateToRaw) {
        const toDate = new Date(dateToRaw);
        if (!Number.isNaN(toDate.getTime())) {
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateToRaw);
          if (isDateOnly) {
            toDate.setHours(23, 59, 59, 999);
          }
          query = query.lte("created_at", toDate.toISOString());
        }
      }

      const search = sanitizeLike(filters?.search);
      if (search) {
        query = query.or(
          [
            `actor_username.ilike.%${search}%`,
            `actor_role.ilike.%${search}%`,
            `target_username.ilike.%${search}%`,
            `target_role.ilike.%${search}%`,
            `action.ilike.%${search}%`,
            `category.ilike.%${search}%`,
            `message.ilike.%${search}%`,
          ].join(","),
        );
      }

      const { data, error } = await query;
      if (error) {
        const message = String(error?.message || "").toLowerCase();
        if (isMissingRelation(error) && message.includes("status_logs")) {
          throw new Error(
            "Status logs table is missing. Run the latest supabase.txt SQL patch to enable admin activity logs.",
          );
        }
        throw formatSupabaseError(error, "Failed to load status logs.");
      }

      return (data || []).map(mapStatusLog);
    }),

  getAccountRequests: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const status = String(filters?.status || "").trim().toLowerCase();
      const requestType = String(filters?.request_type || "").trim().toLowerCase();
      const limitValue = Number(filters?.limit);
      const limit = Number.isFinite(limitValue)
        ? Math.min(1000, Math.max(1, Math.trunc(limitValue)))
        : 200;

      const { data, error } = await supabase.rpc("app_get_account_requests", {
        p_status: status || null,
        p_request_type: requestType || null,
        p_limit: limit,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_get_account_requests")) {
          throw new Error(
            "Account request RPC is missing. Run the latest supabase.txt to enable request approval workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to load account requests.");
      }

      return (Array.isArray(data) ? data : data ? [data] : []).map(mapAccountRequest);
    }),

  setAccountRequestStatus: async (requestId, status, note = null) =>
    withApi(async () => {
      const numericId = Number(requestId);
      const normalizedStatus = String(status || "").trim().toLowerCase();
      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error("Invalid request selected.");
      }
      if (!["approved", "rejected"].includes(normalizedStatus)) {
        throw new Error("Invalid request status.");
      }

      const { data, error } = await supabase.rpc("app_set_account_request_status", {
        p_request_id: numericId,
        p_status: normalizedStatus,
        p_note: note == null ? null : String(note).trim() || null,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_set_account_request_status")) {
          throw new Error(
            "Account request status RPC is missing. Run the latest supabase.txt to enable approval workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to update request status.");
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row || { id: numericId, status: normalizedStatus };
    }),

  approveAllAccountRequests: async (requestType = null) =>
    withApi(async () => {
      const normalizedType = String(requestType || "").trim().toLowerCase();
      const { data, error } = await supabase.rpc("app_approve_all_account_requests", {
        p_request_type: normalizedType || null,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_approve_all_account_requests")) {
          throw new Error(
            "Batch approval RPC is missing. Run the latest supabase.txt to enable approve-all requests.",
          );
        }
        throw formatSupabaseError(error, "Failed to approve requests.");
      }

      const value = Array.isArray(data) ? data[0] : data;
      const approvedCount = Number(value || 0);
      return Number.isFinite(approvedCount) ? approvedCount : 0;
    }),

  createUserWithPassword: async (payload: LooseRecord = {}) =>
    withApi(async () => {
      const fullName = String(payload?.full_name || "").trim();
      const username = String(payload?.username || "").trim();
      const rawPassword = String(payload?.password || "");
      const role = normalizeRole(payload?.role || "student");
      const schoolId = await buildAutoSchoolId();
      const allowedRoles = ["student", "teacher", "admin", "nt"];
      const expiresAt = parseOptionalFutureDate(payload?.expires_at, "account duration");

      if (!fullName || !username || !rawPassword) {
        throw new Error("Full name, username, and password are required.");
      }
      if (rawPassword.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      if (!allowedRoles.includes(role)) {
        throw new Error("Invalid role selected.");
      }

      const rpcPayload = {
        p_username: username,
        p_password_hash: rawPassword,
        p_full_name: fullName,
        p_school_id: schoolId || null,
        p_role: role,
        p_auth_uid: null,
        p_expires_at: expiresAt,
      };

      const applyUserExpiry = async (userRow) => {
        if (!userRow?.id || !expiresAt) return userRow;
        await safeUserUpdate(userRow.id, {
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        });
        return { ...userRow, expires_at: expiresAt };
      };

      const ensureSecureAuthProvisioning = async (userRow) => {
        if (!userRow?.id) {
          return { user: userRow, warning: "" };
        }

        const syncResult = await syncAuthUser(userRow.id, rawPassword);

        if (!syncResult.success) {
          return {
            user: userRow,
            warning:
              `User created, but secure auth profile sync failed (${syncResult.error}). Password creation must run through Supabase auth.admin (set-auth-password).`,
          };
        }

        const { data: refreshedRow, error: refreshedError } = await supabase
          .from("users")
          .select(`${USER_SAFE_SELECT},expires_at,auth_uid`)
          .eq("id", userRow.id)
          .limit(1)
          .maybeSingle();

        if (!refreshedError && refreshedRow) {
          const normalizedRefreshed = normalizeUser(refreshedRow);
          if (!normalizedRefreshed?.auth_uid) {
            return {
              user: normalizedRefreshed,
              warning:
                "User created, but secure auth profile is missing auth_uid after sync. Please reset the password in Account Access.",
            };
          }
          return { user: normalizedRefreshed, warning: "" };
        }

        if (!syncResult.auth_uid) {
          return {
            user: userRow,
            warning:
              "User created, but secure auth profile sync returned no auth_uid. Please reset the password in Account Access.",
          };
        }

        return { user: { ...userRow, auth_uid: syncResult.auth_uid }, warning: "" };
      };

      const finalizeCreatedUser = async (userRow) => {
        const provisioned = await ensureSecureAuthProvisioning(userRow);
        const finalUser = provisioned?.user || userRow;
        const warning = String(provisioned?.warning || "").trim();

        if (warning) {
          // Prevent leaving behind accounts that cannot sign in securely.
          if (finalUser?.id) {
            const { error: rollbackError } = await supabase
              .from("users")
              .delete()
              .eq("id", finalUser.id);
            if (rollbackError) {
              console.warn(
                "Account rollback delete failed:",
                rollbackError?.message || rollbackError,
              );
            }
          }
          throw new Error(`${warning} Account creation was rolled back.`);
        }

        await logStatusEvent({
          action: "create_account",
          category: "account",
          target_user_id: finalUser?.id || null,
          target_username: finalUser?.username || null,
          target_role: finalUser?.role || null,
          message: `Created account "${finalUser?.full_name || finalUser?.username || "Unknown"}".`,
          metadata: {
            role: finalUser?.role || role,
            has_expiry: Boolean(finalUser?.expires_at),
            secure_auth_provisioned: true,
          },
        });

        return {
          success: true,
          user: finalUser,
          warning: "",
        };
      };

      const { data, error } = await supabase.rpc("app_register_user", rpcPayload);
      if (error) {
        if (
          isMissingFunctionError(error, "app_register_user") ||
          isAmbiguousColumnError(error, "username")
        ) {
          const details = [error?.code, error?.message, error?.hint]
            .filter((part) => typeof part === "string" && part.trim().length > 0)
            .join(" | ");
          throw new Error(
            details
              ? `Secure account creation RPC is missing or outdated. Run the latest supabase.txt before creating users. (${details})`
              : "Secure account creation RPC is missing or outdated. Run the latest supabase.txt before creating users.",
          );
        }

        if (isUsernameConflictError(error)) throw new Error("Username already exists.");
        throw formatSupabaseError(error, "Failed to create user account.");
      }

      const row = Array.isArray(data) ? (data[0] || null) : (data || null);
      const normalized = await applyUserExpiry(normalizeUser(row));
      return finalizeCreatedUser(normalized);
    }),

  updateUserAccount: async (userId: number, payload: LooseRecord = {}) =>
    withApi(async () => {
      const numericUserId = Number(userId);
      const fullName = String(payload?.full_name || "").trim();
      const username = String(payload?.username || "").trim();
      const role = normalizeRole(payload?.role || "student");
      const schoolId = String(payload?.school_id || "").trim();
      const expiresRaw = String(payload?.expires_at || "").trim();
      const expiresAt = expiresRaw ? parseOptionalFutureDate(expiresRaw, "account duration") : null;
      const allowedRoles = ["student", "teacher", "admin", "nt"];

      if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        throw new Error("Invalid user selected.");
      }
      if (!fullName) {
        throw new Error("Full name is required.");
      }
      if (!username) {
        throw new Error("Username is required.");
      }
      if (!allowedRoles.includes(role)) {
        throw new Error("Invalid role selected.");
      }

      const { data: existingUsername, error: usernameError } = await supabase
        .from("users")
        .select("id,username")
        .ilike("username", escapeLikePattern(username))
        .neq("id", numericUserId)
        .limit(1);
      if (usernameError) throw formatSupabaseError(usernameError);
      if ((existingUsername || []).length > 0) {
        throw new Error("Username already exists.");
      }

      const updatedRow = await safeUserUpdate(numericUserId, {
        full_name: fullName,
        username,
        role,
        roles: [role],
        school_id: schoolId || null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });

      const normalized = normalizeUser(updatedRow);
      await logStatusEvent({
        action: "account_update_admin",
        category: "account",
        target_user_id: normalized?.id || numericUserId,
        target_username: normalized?.username || username,
        target_role: normalized?.role || role,
        message: `Admin updated account details for "${normalized?.full_name || normalized?.username || numericUserId}".`,
        metadata: {
          updated_fields: ["full_name", "username", "role", "school_id", "expires_at"],
        },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "account_update_admin",
        category: "account",
        target_user_id: normalized?.id || numericUserId,
        title: "Account updated",
        message: `Your account details were updated by ${actor.label}.`,
        metadata: {
          updated_fields: ["full_name", "username", "role", "school_id", "expires_at"],
        },
      });

      return { success: true, user: normalized };
    }),

  adminSetUserPassword: async (userId, newPassword) =>
    withApi(async () => {
      const numericUserId = Number(userId);
      const rawPassword = String(newPassword || "");

      if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        throw new Error("Invalid user selected.");
      }
      if (rawPassword.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const targetUser = await fetchUserLogSnapshot(numericUserId).catch(() => null);

      let authUid = null;
      const syncResult = await syncAuthUser(numericUserId, rawPassword);

      if (!syncResult.success) {
        throw new Error(
          `Failed to sync password to Supabase Auth via auth.admin flow: ${syncResult.error || "Unknown error"}`,
        );
      }
      authUid = syncResult.auth_uid || null;

      if (!authUid) {
        const { data: refreshedUser, error: refreshedError } = await supabase
          .from("users")
          .select("id,auth_uid")
          .eq("id", numericUserId)
          .limit(1)
          .maybeSingle();
        if (!refreshedError && refreshedUser?.auth_uid) {
          authUid = refreshedUser.auth_uid;
        }
      }

      if (!authUid) {
        throw new Error("Password reset succeeded, but no auth_uid is linked to this user.");
      }


      await logStatusEvent({
        action: "reset_password",
        category: "account",
        target_user_id: targetUser?.id || numericUserId,
        target_username: targetUser?.username || null,
        target_role: targetUser?.role || null,
        message: `Password reset and synced for "${targetUser?.full_name || targetUser?.username || numericUserId}".`,
        metadata: { auth_synced: true, auth_uid: authUid },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "reset_password",
        category: "account",
        target_user_id: targetUser?.id || numericUserId,
        title: "Password changed",
        message: `Your account password was changed by ${actor.label}.`,
        metadata: { auth_synced: true, auth_uid: authUid },
      });

      return { success: true };
    }),

  updateUserRoles: async (userId, roles) =>
    withApi(async () => {
      const normalized = normalizeRoles(roles, "student");
      const updatedRow = await safeUserUpdate(userId, {
        role: normalized[0],
        roles: normalized,
        updated_at: new Date().toISOString(),
      });

      const normalizedUser = normalizeUser(updatedRow);
      await logStatusEvent({
        action: "account_role_update",
        category: "role",
        target_user_id: normalizedUser?.id || userId,
        target_username: normalizedUser?.username || null,
        target_role: normalizedUser?.role || null,
        message: `Updated access roles for "${normalizedUser?.full_name || normalizedUser?.username || userId}".`,
        metadata: { roles: normalized },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "account_role_update",
        category: "role",
        target_user_id: normalizedUser?.id || userId,
        title: "Role updated",
        message: `Your account role access was updated by ${actor.label}.`,
        metadata: { roles: normalized },
      });

      return { success: true };
    }),

  updateUserSubRole: async (userId, primarySubRole, subRoles = []) =>
    withApi(async () => {
      const normalized = normalizeSubRoles(subRoles, primarySubRole);
      const updatedRow = await safeUserUpdate(userId, {
        sub_role: normalized[0] || null,
        sub_roles: normalized,
        updated_at: new Date().toISOString(),
      });

      const normalizedUser = normalizeUser(updatedRow);
      await logStatusEvent({
        action: "account_sub_role_update",
        category: "role",
        target_user_id: normalizedUser?.id || userId,
        target_username: normalizedUser?.username || null,
        target_role: normalizedUser?.role || null,
        message: `Updated functional roles for "${normalizedUser?.full_name || normalizedUser?.username || userId}".`,
        metadata: {
          sub_role: normalized[0] || null,
          sub_roles: normalized,
        },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "account_sub_role_update",
        category: "role",
        target_user_id: normalizedUser?.id || userId,
        title: "Functional role updated",
        message: `Your functional role access was updated by ${actor.label}.`,
        metadata: {
          sub_role: normalized[0] || null,
          sub_roles: normalized,
        },
      });

      return { success: true };
    }),

  deleteUser: async (userId) =>
    withApi(async () => {
      const numericUserId = Number(userId);
      if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        throw new Error("Invalid user selected.");
      }
      const targetUser = await fetchUserLogSnapshot(numericUserId).catch(() => null);
      return deleteUserRecords(numericUserId, {
        action: "delete_account",
        category: "account",
        target_user: targetUser,
        message: `Deleted account "${targetUser?.full_name || targetUser?.username || numericUserId}".`,
      });
    }),

  getDashboardStats: async () =>
    withApi(async () => {
      const getDashboardStatsFromEdgeCache = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw formatSupabaseError(sessionError, "Failed to load auth session for dashboard cache.");
        }

        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          throw new Error("No active authenticated session.");
        }

        const { data, error } = await supabase.functions.invoke("cached-dashboard-stats", {
          body: {},
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (error) {
          let errorMessage =
            error?.message ||
            (typeof data?.error === "string" ? data.error : "") ||
            "Edge function error";

          const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
          if (context?.json) {
            const body = await context.json().catch(() => null) as
              | { error?: unknown; message?: unknown }
              | null;
            const detailed =
              (typeof body?.error === "string" && body.error.trim()) ||
              (typeof body?.message === "string" && body.message.trim()) ||
              "";
            if (detailed) errorMessage = detailed;
          }

          throw new Error(errorMessage);
        }

        const payload =
          data && typeof data === "object" && data.stats && typeof data.stats === "object"
            ? data.stats
            : data;

        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid dashboard stats payload from edge cache.");
        }

        return payload;
      };

      const cachedStats = await getDashboardStatsFromEdgeCache().catch((error) => {
        console.warn(
          "cached-dashboard-stats invoke failed; falling back to direct dashboard queries:",
          error?.message || error,
        );
        return null;
      });

      if (cachedStats && typeof cachedStats.users !== "undefined") {
        const cachedBuildings = Array.isArray(cachedStats.buildings)
          ? cachedStats.buildings
              .map((row) => (row && typeof row === "object" ? mapBuilding(row) : null))
              .filter(Boolean)
          : [];

        const cachedAnnouncements = Array.isArray(cachedStats.recent_announcements)
          ? cachedStats.recent_announcements
              .map((row) => (row && typeof row === "object" ? mapAnnouncement(row) : null))
              .filter(Boolean)
          : [];

        return {
          users: Number(cachedStats.users || 0),
          subjects: Number(cachedStats.subjects || 0),
          sections: Number(cachedStats.sections || 0),
          schedules: Number(cachedStats.schedules || 0),
          announcements: Number(cachedStats.announcements || 0),
          study_load: Number(cachedStats.study_load || 0),
          students: Number(cachedStats.students || 0),
          teachers: Number(cachedStats.teachers || 0),
          admins: Number(cachedStats.admins || 0),
          non_teaching: Number(cachedStats.non_teaching || 0),
          buildings: cachedBuildings,
          recent_announcements: cachedAnnouncements,
        };
      }

      const [
        usersCount,
        subjectsCount,
        sectionsCount,
        schedulesCount,
        announcementsCount,
        studyLoadCount,
        usersResult,
        buildingsResult,
        announcementsResult,
      ] = await Promise.all([
        countExact("users"),
        countExact("subjects"),
        countExact("sections"),
        countExact("schedules"),
        countExact("announcements"),
        countExact("study_load"),
        supabase.from("users").select(USER_SAFE_SELECT),
        supabase.from("buildings").select("*"),
        supabase
          .from("announcements")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(5),
      ]);

      if (usersResult.error) throw formatSupabaseError(usersResult.error);
      if (buildingsResult.error) throw formatSupabaseError(buildingsResult.error);
      if (announcementsResult.error) throw formatSupabaseError(announcementsResult.error);

      const normalizedUsers = (usersResult.data || []).map(normalizeUser);
      const students = normalizedUsers.filter((user) => user.roles.includes("student")).length;
      const teachers = normalizedUsers.filter((user) => user.roles.includes("teacher")).length;
      const admins = normalizedUsers.filter((user) => user.roles.includes("admin")).length;
      const nonTeaching = normalizedUsers.filter((user) => user.roles.includes("nt")).length;

      return {
        users: usersCount,
        subjects: subjectsCount,
        sections: sectionsCount,
        schedules: schedulesCount,
        announcements: announcementsCount,
        study_load: studyLoadCount,
        students,
        teachers,
        admins,
        non_teaching: nonTeaching,
        buildings: (buildingsResult.data || []).map(mapBuilding),
        recent_announcements: (announcementsResult.data || []).map(mapAnnouncement),
      };
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapAnnouncement);
    }),

  createAnnouncement: async (payload) =>
    withApi(async () => {
      const currentUser = readStoredUser();
      const insertPayload = {
        title: payload?.title || "",
        content: payload?.content || "",
        year: payload?.year || null,
        department: payload?.department || null,
        major: payload?.major || null,
        author_id: currentUser?.id || 1,
        target_role: payload?.target_role || "all",
        priority: payload?.priority || "medium",
        is_published: payload?.is_published == null ? 1 : payload.is_published,
        published_at: payload?.published_at || new Date().toISOString(),
        expires_at: payload?.expires_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("announcements")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      const mapped = mapAnnouncement(data);
      await createUserNotification({
        action: "announcement_created",
        category: "announcement",
        target_role: normalizeNotificationTargetRole(insertPayload.target_role) || "all",
        title: `New announcement: ${mapped?.title || "Campus update"}`,
        message: mapped?.content || "A new announcement has been posted.",
        metadata: {
          announcement_id: mapped?.id || null,
          priority: mapped?.priority || insertPayload.priority || "medium",
          target_role: mapped?.target_role || insertPayload.target_role || "all",
        },
      });

      return mapped;
    }),

  updateAnnouncement: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("announcements")
        .update({
          title: payload?.title,
          content: payload?.content,
          year: payload?.year || null,
          department: payload?.department || null,
          major: payload?.major || null,
          target_role: payload?.target_role,
          priority: payload?.priority,
          expires_at: payload?.expires_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      const mapped = mapAnnouncement(data);
      await createUserNotification({
        action: "announcement_updated",
        category: "announcement",
        target_role: normalizeNotificationTargetRole(mapped?.target_role || payload?.target_role) || "all",
        title: `Announcement updated: ${mapped?.title || "Campus update"}`,
        message: mapped?.content || "An announcement has been updated.",
        metadata: {
          announcement_id: mapped?.id || id,
          priority: mapped?.priority || payload?.priority || "medium",
          target_role: mapped?.target_role || payload?.target_role || "all",
        },
      });

      return mapped;
    }),

  deleteAnnouncement: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getEvaluationSettings: async () =>
    withApi(async () => {
      const { data, error } = await supabase.from("evaluation_settings").select("*");
      if (error) throw formatSupabaseError(error);

      const byKey = new Map();
      (data || []).forEach((row) => byKey.set(row.setting_key, row.setting_value));

      let template = null;
      const rawTemplate = byKey.get("template");
      if (rawTemplate) {
        try {
          template = typeof rawTemplate === "string" ? JSON.parse(rawTemplate) : rawTemplate;
        } catch (_) {
          template = null;
        }
      }

      return {
        enabled: toBoolean(
          byKey.get("enabled") ?? byKey.get("evaluation_enabled"),
          true,
        ),
        template,
      };
    }),

  updateEvaluationSettings: async (settings) =>
    withApi(async () => {
      let evaluationEnabledChanged = false;
      let nextEnabledValue = null;
      let previousEnabledValue = null;

      if (settings?.enabled !== undefined) {
        const { data: existingEnabledRows, error: existingEnabledError } = await supabase
          .from("evaluation_settings")
          .select("setting_key,setting_value")
          .in("setting_key", ["enabled", "evaluation_enabled"]);
        if (existingEnabledError) {
          throw formatSupabaseError(existingEnabledError, "Failed to read evaluation settings.");
        }

        const existingEnabledMap = new Map();
        (existingEnabledRows || []).forEach((row) => {
          existingEnabledMap.set(String(row?.setting_key || "").trim().toLowerCase(), row?.setting_value);
        });

        previousEnabledValue = toBoolean(
          existingEnabledMap.get("enabled") ?? existingEnabledMap.get("evaluation_enabled"),
          true,
        );
        nextEnabledValue = Boolean(settings.enabled);

        const enabled = settings.enabled ? "true" : "false";
        await upsertSetting("enabled", enabled, "Enable/disable teacher evaluation system");
        await upsertSetting("evaluation_enabled", enabled, "Enable/disable teacher evaluation system");
        evaluationEnabledChanged = previousEnabledValue !== nextEnabledValue;
      }

      if (settings?.template !== undefined) {
        await upsertSetting("template", JSON.stringify(settings.template), "Evaluation template");
      }

      if (evaluationEnabledChanged) {
        const actor = describeCurrentActor();
        await createUserNotification({
          action: nextEnabledValue ? "evaluation_enabled" : "evaluation_disabled",
          category: "evaluation",
          target_role: "all",
          title: nextEnabledValue ? "Evaluation enabled" : "Evaluation disabled",
          message: nextEnabledValue
            ? `Teacher evaluation is now enabled by ${actor.label}.`
            : `Teacher evaluation is now disabled by ${actor.label}.`,
          metadata: {
            enabled_before: previousEnabledValue,
            enabled_after: nextEnabledValue,
          },
        });
      }

      return { success: true };
    }),

  getLowestRatedTeachers: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("teacher_id,rating_overall,created_at");
      if (error) throw formatSupabaseError(error);

      const groups = new Map();
      (data || []).forEach((row) => {
        if (!row.teacher_id) return;
        if (!groups.has(row.teacher_id)) {
          groups.set(row.teacher_id, { total: 0, count: 0 });
        }
        const group = groups.get(row.teacher_id);
        const rating = parseNumber(row.rating_overall, null);
        if (rating != null) {
          group.total += rating;
          group.count += 1;
        }
      });

      const teacherIds = Array.from(groups.keys());
      const usersMap = await fetchUsersByIds(teacherIds);

      const teachers = teacherIds
        .map((teacherId) => {
          const totals = groups.get(teacherId);
          const average = totals.count ? totals.total / totals.count : 0;
          const user = usersMap.get(teacherId);
          return {
            id: teacherId,
            full_name: user?.full_name || user?.username || `Teacher ${teacherId}`,
            image_path: user?.image_path || DEFAULT_AVATAR,
            average_rating: Number(average.toFixed(2)),
            total_evaluations: totals.count,
            percentage: Number(((average / 4) * 100).toFixed(1)),
          };
        })
        .sort((a, b) => a.average_rating - b.average_rating);

      return { teachers };
    }),

  getBuildings: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("building_name", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapBuilding);
    }),

  createBuilding: async (payload) =>
    withApi(async () => {
      const name = payload?.building_name || payload?.name;
      if (!name) throw new Error("Building name is required.");

      const { data, error } = await supabase
        .from("buildings")
        .insert({
          building_name: String(name).trim(),
          num_floors: parseNumber(payload?.num_floors ?? payload?.floors, 1),
          rooms_per_floor: parseNumber(payload?.rooms_per_floor, 10),
          description: payload?.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapBuilding(data);
    }),

  deleteBuilding: async (identifier) =>
    withApi(async () => {
      let query = supabase.from("buildings").select("*");
      if (Number.isFinite(Number(identifier))) {
        query = query.eq("id", Number(identifier));
      } else {
        query = query.ilike("building_name", String(identifier));
      }

      const { data, error } = await query;
      if (error) throw formatSupabaseError(error);
      const buildings = (data || []).map(mapBuilding);
      if (!buildings.length) return { success: true };

      await Promise.all(
        buildings.map((building) =>
          supabase.from("section_assignments").delete().eq("building_id", building.id),
        ),
      );
      await Promise.all(
        buildings.map((building) => supabase.from("buildings").delete().eq("id", building.id)),
      );
      return { success: true };
    }),

  getSections: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapSection);
    }),

  createSection: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .insert({
          section_name: payload?.section_name,
          grade_level: normalizeYearLevel(payload?.grade_level),
          school_year: payload?.school_year || currentSchoolYear(),
          course: payload?.course || null,
          major: payload?.major || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSection(data);
    }),

  updateSection: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .update({
          section_name: payload?.section_name,
          grade_level: normalizeYearLevel(payload?.grade_level),
          school_year: payload?.school_year || currentSchoolYear(),
          course: payload?.course || null,
          major: payload?.major || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSection(data);
    }),

  deleteSection: async (id) =>
    withApi(async () => {
      await Promise.all([
        supabase.from("user_assignments").delete().eq("section_id", id),
        supabase.from("teacher_assignments").delete().eq("section_id", id),
        supabase.from("section_assignments").delete().eq("section_id", id),
        supabase.from("schedules").delete().eq("section_id", id),
        supabase.from("study_load").delete().eq("section_id", id),
        supabase.from("grades").delete().eq("section_id", id),
      ]);
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getSectionAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("section_assignments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const buildingIds = rows.map((row) => row.building_id).filter(Boolean);
      const [sectionsMap, buildingsMap] = await Promise.all([
        fetchSectionsByIds(sectionIds),
        fetchBuildingsByIds(buildingIds),
      ]);

      return rows.map((row) => {
        const section = sectionsMap.get(row.section_id);
        const building = buildingsMap.get(row.building_id);
        return {
          ...row,
          year: normalizeYearLevel(section?.grade_level),
          section: section?.section_name || "",
          building: building?.name || "",
          floor: parseNumber(row.floor_number, null),
          room: parseNumber(row.room_number, null),
        };
      });
    }),

  createSectionAssignment: async (payload) =>
    withApi(async () => {
      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const building = await ensureBuilding(payload?.building);
      if (!building) throw new Error("Building is required.");

      const { data: existing, error: existingError } = await supabase
        .from("section_assignments")
        .select("*")
        .eq("section_id", section.id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      const assignmentPayload = {
        section_id: section.id,
        building_id: building.id,
        floor_number: parseNumber(payload?.floor, 1),
        room_number: parseNumber(payload?.room, null),
        school_year: section.school_year || currentSchoolYear(),
        status: "active",
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data, error } = await supabase
          .from("section_assignments")
          .update(assignmentPayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);
        return data;
      }

      const { data, error } = await supabase
        .from("section_assignments")
        .insert({ ...assignmentPayload, created_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  updateSectionAssignment: async (id, payload) =>
    withApi(async () => {
      let buildingId = payload?.building_id || null;
      if (!buildingId && payload?.building) {
        const building = await ensureBuilding(payload.building);
        buildingId = building?.id || null;
      }

      const { data, error } = await supabase
        .from("section_assignments")
        .update({
          building_id: buildingId,
          floor_number: parseNumber(payload?.floor, 1),
          room_number: parseNumber(payload?.room, null),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteSectionAssignment: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("section_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getUserAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("user_assignments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return mapUserAssignmentRows(data || []);
    }),

  getDisciplineRecords: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const allAssignments = await AdminAPI.getUserAssignments();
      const scopedAssignments = (allAssignments || []).filter((assignment) =>
        matchesAssignmentFilters(assignment, filters),
      );

      const schoolYear = normalizeSchoolYearValue(filters?.school_year || currentSchoolYear());
      const events = await fetchScopedRecordEvents("app_get_discipline_records", {
        p_school_year: schoolYear || null,
        p_department: String(filters?.department || "").trim() || null,
        p_year_level: String(filters?.year || filters?.year_level || "").trim() || null,
        p_section: String(filters?.section || "").trim() || null,
        p_user_id: parseNumber(filters?.user_id, null),
        p_limit: 5000,
      });

      const summaryByUser = new Map();
      scopedAssignments.forEach((assignment) => {
        const userId = parseNumber(assignment?.user_id, null);
        if (!userId) return;
        summaryByUser.set(userId, {
          user_id: userId,
          assignment_id: assignment.id,
          full_name: assignment.full_name || assignment.username || `Student #${userId}`,
          username: assignment.username || "",
          school_id: assignment.school_id || "",
          year_level: assignment.year_level || assignment.year || "",
          section: assignment.section || assignment.section_name || "",
          department: assignment.department || "",
          school_year: normalizeSchoolYearValue(assignment.school_year || schoolYear),
          warning_count: 0,
          sanction_count: assignment.sanctions ? 1 : 0,
          current_sanction: Boolean(assignment.sanctions),
          current_sanction_reason: assignment.sanction_reason || "",
          last_sanction_level:
            normalizeOffenseLevel(
              inferSanctionLevelFromReason(assignment.sanction_reason || ""),
              "",
            ) || null,
          last_event_at: null,
          events: [],
        });
      });

      events.forEach((event) => {
        const userId = parseNumber(event?.target_user_id, null);
        if (!userId) return;

        if (!summaryByUser.has(userId)) {
          summaryByUser.set(userId, {
            user_id: userId,
            assignment_id: null,
            full_name: event.target_username || `Student #${userId}`,
            username: event.target_username || "",
            school_id: "",
            year_level: String(event?.metadata?.year_level || "").trim(),
            section: String(event?.metadata?.section || "").trim(),
            department: String(event?.metadata?.department || "").trim(),
            school_year: normalizeSchoolYearValue(event?.metadata?.school_year || schoolYear),
            warning_count: 0,
            sanction_count: 0,
            current_sanction: false,
            current_sanction_reason: "",
            last_sanction_level: null,
            last_event_at: null,
            events: [],
          });
        }

        const summary = summaryByUser.get(userId);
        summary.events.push(event);
        if (!summary.last_event_at || String(event.created_at || "") > String(summary.last_event_at || "")) {
          summary.last_event_at = event.created_at || summary.last_event_at;
        }

        if (event.action.includes("warning")) {
          summary.warning_count += 1;
        }
        if (event.action.includes("sanction")) {
          summary.sanction_count += 1;
          const level =
            normalizeOffenseLevel(
              event?.metadata?.sanction_level ||
                inferSanctionLevelFromReason(event?.message || ""),
              "",
            ) || null;
          if (level) summary.last_sanction_level = level;
        }
      });

      return Array.from(summaryByUser.values())
        .map((item) => ({
          ...item,
          events: (item.events || []).sort((a, b) =>
            String(b.created_at || "").localeCompare(String(a.created_at || "")),
          ),
        }))
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    }),

  getDisciplineRecordForStudent: async (userId: number, filters: LooseRecord = {}) =>
    withApi(async () => {
      const targetUserId = parseNumber(userId, null);
      if (!targetUserId) throw new Error("Invalid student selected.");

      const rows = await AdminAPI.getDisciplineRecords({ ...filters, user_id: targetUserId });
      const row = (rows || []).find((item) => parseNumber(item?.user_id, null) === targetUserId);
      if (!row) {
        return {
          user_id: targetUserId,
          warning_count: 0,
          sanction_count: 0,
          current_sanction: false,
          events: [],
        };
      }
      return row;
    }),

  issueStudentWarning: async (assignmentInput: any, payload: LooseRecord = {}) =>
    withApi(async () => {
      const assignmentId =
        parseNumber(assignmentInput?.id, null) ?? parseNumber(assignmentInput, null);
      if (!assignmentId) throw new Error("Invalid student assignment.");

      const description = String(payload?.description || payload?.reason || "").trim();
      if (!description) throw new Error("Warning description is required.");

      const offenseLevel = normalizeOffenseLevel(
        payload?.offense_level || payload?.sanction_level || payload?.level,
        "minor",
      );

      const { data: assignmentRow, error: assignmentError } = await supabase
        .from("user_assignments")
        .select("*")
        .eq("id", assignmentId)
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw formatSupabaseError(assignmentError);
      if (!assignmentRow?.user_id) throw new Error("Student assignment not found.");

      const targetUser = await fetchUserLogSnapshot(assignmentRow.user_id).catch(() => null);
      const schoolYear = normalizeSchoolYearValue(
        payload?.school_year || assignmentRow?.school_year || currentSchoolYear(),
      );
      const sectionName = String(assignmentRow?.section || payload?.section || "").trim();
      const yearLevel = normalizeYearLevel(
        payload?.year_level || assignmentRow?.year_level || assignmentRow?.grade_level || "",
      );
      const department = String(payload?.department || assignmentRow?.department || "").trim();

      const previousEvents = await fetchScopedRecordEvents("app_get_discipline_records", {
        p_school_year: schoolYear || null,
        p_department: department || null,
        p_year_level: yearLevel || null,
        p_section: sectionName || null,
        p_user_id: assignmentRow.user_id,
        p_limit: 5000,
      });
      const warningEvents = (previousEvents || []).filter((event) =>
        String(event?.action || "").includes("warning"),
      );
      const warningCount = warningEvents.length + 1;
      const priorMinorWarningCount = warningEvents.filter((event) => {
        const level = normalizeOffenseLevel(event?.metadata?.offense_level, "");
        return !level || level === "minor";
      }).length;
      const minorWarningCount = offenseLevel === "major" ? priorMinorWarningCount : priorMinorWarningCount + 1;
      const previousSanctions = (previousEvents || []).filter((event) =>
        String(event?.action || "").includes("sanction"),
      ).length;

      await logStatusEvent({
        action: "student_warning_issued",
        category: "discipline",
        target_user_id: assignmentRow.user_id,
        target_username: targetUser?.username || null,
        target_role: targetUser?.role || "student",
        message: `Warning issued to "${targetUser?.full_name || targetUser?.username || assignmentRow.user_id}": ${description}`,
        metadata: {
          assignment_id: assignmentId,
          warning_count: warningCount,
          minor_warning_count: minorWarningCount,
          description,
          offense_level: offenseLevel,
          school_year: schoolYear,
          section: sectionName,
          year_level: yearLevel,
          department,
        },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "student_warning_issued",
        category: "discipline",
        target_user_id: assignmentRow.user_id,
        title: "New warning issued",
        message: `You received a ${offenseLevel} warning from ${actor.label}: ${description}`,
        metadata: {
          warning_count: warningCount,
          offense_level: offenseLevel,
          school_year: schoolYear,
          section: sectionName || null,
          year_level: yearLevel || null,
          department: department || null,
        },
      });

      let sanctionApplied = false;
      let sanctionReason = "";
      let sanctionDays = 0;
      const isMajorOffense = offenseLevel === "major";
      const shouldAutoSanction =
        isMajorOffense || (minorWarningCount > 0 && minorWarningCount % 3 === 0);
      if (shouldAutoSanction) {
        sanctionApplied = true;
        sanctionDays = isMajorOffense ? 7 : 3;
        sanctionReason = `${sanctionDays} days: ${description}`;

        const { error: sanctionUpdateError } = await supabase
          .from("user_assignments")
          .update({
            sanctions: 1,
            sanction_reason: sanctionReason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignmentId);
        if (sanctionUpdateError) throw formatSupabaseError(sanctionUpdateError);

        await logStatusEvent({
          action: "student_sanction_applied",
          category: "discipline",
          target_user_id: assignmentRow.user_id,
          target_username: targetUser?.username || null,
          target_role: targetUser?.role || "student",
          message: isMajorOffense
            ? `Major offense sanction applied immediately (${sanctionDays} days) to "${targetUser?.full_name || targetUser?.username || assignmentRow.user_id}".`
            : `Minor offense reached 3 warnings. Auto-sanction applied (${sanctionDays} days) to "${targetUser?.full_name || targetUser?.username || assignmentRow.user_id}".`,
          metadata: {
            assignment_id: assignmentId,
            warning_count: warningCount,
            minor_warning_count: minorWarningCount,
            sanction_count: previousSanctions + 1,
            sanction_level: offenseLevel,
            sanction_days: sanctionDays,
            sanction_reason: sanctionReason,
            source: isMajorOffense ? "auto_major_immediate" : "auto_minor_three_warnings",
            school_year: schoolYear,
            section: sectionName,
            year_level: yearLevel,
            department,
          },
        });

        await createUserNotification({
          action: "student_sanction_applied",
          category: "discipline",
          target_user_id: assignmentRow.user_id,
          title: "Sanction applied",
          message: `A ${sanctionDays}-day sanction was applied by ${actor.label}. Reason: ${description}`,
          metadata: {
            sanction_level: offenseLevel,
            sanction_days: sanctionDays,
            sanction_reason: sanctionReason,
            source: isMajorOffense ? "auto_major_immediate" : "auto_minor_three_warnings",
            school_year: schoolYear,
            section: sectionName || null,
            year_level: yearLevel || null,
            department: department || null,
          },
        });
      }

      return {
        success: true,
        warning_count: warningCount,
        sanction_applied: sanctionApplied,
        sanction_level: sanctionApplied ? offenseLevel : null,
        sanction_days: sanctionApplied ? sanctionDays : null,
        sanction_reason: sanctionReason || null,
      };
    }),

  issueStudentSanction: async (assignmentInput: any, payload: LooseRecord = {}) =>
    withApi(async () => {
      const assignmentId =
        parseNumber(assignmentInput?.id, null) ?? parseNumber(assignmentInput, null);
      if (!assignmentId) throw new Error("Invalid student assignment.");

      const sanctionDays = parsePositiveInteger(payload?.days, null);
      if (!sanctionDays) throw new Error("Sanction days must be at least 1.");

      const reason = String(payload?.reason || payload?.description || "").trim();
      if (!reason) throw new Error("Sanction reason is required.");

      const offenseLevel = normalizeOffenseLevel(payload?.offense_level || payload?.level, "");

      const { data: assignmentRow, error: assignmentError } = await supabase
        .from("user_assignments")
        .select("*")
        .eq("id", assignmentId)
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw formatSupabaseError(assignmentError);
      if (!assignmentRow?.user_id) throw new Error("Student assignment not found.");

      const targetUser = await fetchUserLogSnapshot(assignmentRow.user_id).catch(() => null);
      const schoolYear = normalizeSchoolYearValue(
        payload?.school_year || assignmentRow?.school_year || currentSchoolYear(),
      );
      const sectionName = String(assignmentRow?.section || payload?.section || "").trim();
      const yearLevel = normalizeYearLevel(
        payload?.year_level || assignmentRow?.year_level || assignmentRow?.grade_level || "",
      );
      const department = String(payload?.department || assignmentRow?.department || "").trim();
      const sanctionReason = `${sanctionDays} days: ${reason}`;

      const { error: sanctionUpdateError } = await supabase
        .from("user_assignments")
        .update({
          sanctions: 1,
          sanction_reason: sanctionReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);
      if (sanctionUpdateError) throw formatSupabaseError(sanctionUpdateError);

      await logStatusEvent({
        action: "student_sanction_applied",
        category: "discipline",
        target_user_id: assignmentRow.user_id,
        target_username: targetUser?.username || null,
        target_role: targetUser?.role || "student",
        message: `Manual sanction applied (${sanctionDays} days) to "${targetUser?.full_name || targetUser?.username || assignmentRow.user_id}": ${reason}`,
        metadata: {
          assignment_id: assignmentId,
          sanction_level: offenseLevel || null,
          sanction_days: sanctionDays,
          sanction_reason: sanctionReason,
          source: "manual_sanction",
          school_year: schoolYear,
          section: sectionName,
          year_level: yearLevel,
          department,
        },
      });

      const actor = describeCurrentActor();
      await createUserNotification({
        action: "student_sanction_applied",
        category: "discipline",
        target_user_id: assignmentRow.user_id,
        title: "Sanction applied",
        message: `A ${sanctionDays}-day sanction was applied by ${actor.label}. Reason: ${reason}`,
        metadata: {
          sanction_level: offenseLevel || null,
          sanction_days: sanctionDays,
          sanction_reason: sanctionReason,
          school_year: schoolYear,
          section: sectionName || null,
          year_level: yearLevel || null,
          department: department || null,
        },
      });

      return {
        success: true,
        sanction_applied: true,
        sanction_days: sanctionDays,
        sanction_level: offenseLevel || null,
        sanction_reason: sanctionReason,
      };
    }),

  applyGeneralPayment: async (payload: LooseRecord = {}) =>
    withApi(async () => {
      const amount = parseNumber(payload?.amount, null);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be greater than 0.");
      }

      const deadlineInput = String(payload?.deadline || payload?.payment_deadline || "").trim();
      let normalizedDeadline: string | null = null;
      if (deadlineInput) {
        const deadlineDate = new Date(deadlineInput);
        if (Number.isNaN(deadlineDate.getTime())) {
          throw new Error("Deadline must be a valid date.");
        }
        normalizedDeadline = deadlineDate.toISOString().slice(0, 10);
      }

      const filters = {
        department: String(payload?.department || "").trim(),
        year: String(payload?.year || payload?.year_level || "").trim(),
        section: String(payload?.section || "").trim(),
        school_year: String(payload?.school_year || "").trim(),
      };

      if (!filters.department && !filters.year && !filters.section) {
        throw new Error("Select at least department, year, or section before applying payment.");
      }

      const reason = String(payload?.reason || payload?.description || "General lacking payment")
        .trim();
      const allAssignments = await AdminAPI.getUserAssignments();
      const scopedAssignments = (allAssignments || []).filter((assignment) =>
        matchesAssignmentFilters(assignment, filters),
      );

      if (!scopedAssignments.length) {
        throw new Error("No student records match the selected scope.");
      }

      const nowIso = new Date().toISOString();
      await Promise.all(
        scopedAssignments.map(async (assignment) => {
          const { error: updateError } = await supabase
            .from("user_assignments")
            .update({
              payment: "owing",
              amount_lacking: amount,
              updated_at: nowIso,
            })
            .eq("id", assignment.id);
          if (updateError) throw formatSupabaseError(updateError);

          await logStatusEvent({
            action: "payment_lacking_assigned",
            category: "payment",
            target_user_id: assignment.user_id,
            target_username: assignment.username || null,
            target_role: "student",
            message: `Assigned lacking payment of PHP ${amount.toFixed(2)} to "${assignment.full_name || assignment.username || assignment.user_id}".`,
            metadata: {
              assignment_id: assignment.id,
              amount,
              reason,
              deadline: normalizedDeadline,
              school_year: filters.school_year
                ? normalizeSchoolYearValue(filters.school_year)
                : null,
              department: assignment.department || filters.department || null,
              year_level: assignment.year_level || assignment.year || filters.year || null,
              section: assignment.section || filters.section || null,
            },
          });
        }),
      );

      return {
        success: true,
        updated_count: scopedAssignments.length,
        amount,
      };
    }),

  recordStudentPayment: async (assignmentInput: any, payload: LooseRecord = {}) =>
    withApi(async () => {
      const assignmentId =
        parseNumber(assignmentInput?.id, null) ?? parseNumber(assignmentInput, null);
      if (!assignmentId) throw new Error("Invalid student assignment.");

      const paidAmount = parseNumber(payload?.amount, null);
      if (!Number.isFinite(paidAmount) || Number(paidAmount) <= 0) {
        throw new Error("Paid amount must be greater than 0.");
      }

      const paymentReason = String(payload?.reason || payload?.description || "").trim();
      if (!paymentReason) throw new Error("Payment reason is required.");

      const { data: assignmentRow, error: assignmentError } = await supabase
        .from("user_assignments")
        .select("*")
        .eq("id", assignmentId)
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw formatSupabaseError(assignmentError);
      if (!assignmentRow?.user_id) throw new Error("Student assignment not found.");

      const previousAmount = parseNumber(assignmentRow.amount_lacking, 0) || 0;
      if (previousAmount <= 0) {
        throw new Error("This student has no pending amount to pay.");
      }

      const normalizedPaidAmount = Math.min(previousAmount, Number(paidAmount));
      const remainingAmount = Math.max(0, Number((previousAmount - normalizedPaidAmount).toFixed(2)));
      const nextPaymentStatus = remainingAmount > 0 ? "owing" : "paid";
      const nowIso = new Date().toISOString();

      const { data: updatedAssignment, error: updateError } = await supabase
        .from("user_assignments")
        .update({
          payment: nextPaymentStatus,
          amount_lacking: remainingAmount,
          updated_at: nowIso,
        })
        .eq("id", assignmentId)
        .select("*")
        .single();
      if (updateError) throw formatSupabaseError(updateError);

      const targetUser = await fetchUserLogSnapshot(updatedAssignment.user_id).catch(() => null);
      const schoolYear = normalizeSchoolYearValue(
        payload?.school_year || updatedAssignment?.school_year || currentSchoolYear(),
      );
      const sectionName = String(updatedAssignment?.section || assignmentRow?.section || "").trim();
      const yearLevel = normalizeYearLevel(
        updatedAssignment?.year_level || assignmentRow?.year_level || "",
      );
      const department = String(
        updatedAssignment?.department || assignmentRow?.department || "",
      ).trim();

      await logStatusEvent({
        action: remainingAmount > 0 ? "payment_partial_received" : "payment_settled",
        category: "payment",
        target_user_id: updatedAssignment.user_id,
        target_username: targetUser?.username || null,
        target_role: targetUser?.role || "student",
        message: remainingAmount > 0
          ? `Payment received from "${targetUser?.full_name || targetUser?.username || updatedAssignment.user_id}": PHP ${normalizedPaidAmount.toFixed(2)} for ${paymentReason}. Remaining balance: PHP ${remainingAmount.toFixed(2)}.`
          : `Payment settled for "${targetUser?.full_name || targetUser?.username || updatedAssignment.user_id}": PHP ${normalizedPaidAmount.toFixed(2)} for ${paymentReason}.`,
        metadata: {
          assignment_id: assignmentId,
          paid_amount: normalizedPaidAmount,
          reason: paymentReason,
          previous_amount_lacking: previousAmount,
          remaining_amount_lacking: remainingAmount,
          payment_status_after: nextPaymentStatus,
          school_year: schoolYear,
          section: sectionName,
          year_level: yearLevel,
          department,
          source: "treasury_paid_button",
        },
      });

      const mapped = await mapUserAssignmentRows([updatedAssignment]);
      return {
        success: true,
        assignment: mapped[0] || updatedAssignment,
        paid_amount: normalizedPaidAmount,
        remaining_amount_lacking: remainingAmount,
        payment_status: nextPaymentStatus,
      };
    }),

  getPaymentRecords: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const allAssignments = await AdminAPI.getUserAssignments();
      const scopedAssignments = (allAssignments || []).filter((assignment) =>
        matchesAssignmentFilters(assignment, filters),
      );

      const schoolYearInput = String(filters?.school_year || "").trim();
      const schoolYear = schoolYearInput ? normalizeSchoolYearValue(schoolYearInput) : "";
      const events = await fetchScopedRecordEvents("app_get_payment_records", {
        p_school_year: schoolYear || null,
        p_department: String(filters?.department || "").trim() || null,
        p_year_level: String(filters?.year || filters?.year_level || "").trim() || null,
        p_section: String(filters?.section || "").trim() || null,
        p_user_id: parseNumber(filters?.user_id, null),
        p_limit: 5000,
      });

      const summaryByUser = new Map();
      scopedAssignments.forEach((assignment) => {
        const userId = parseNumber(assignment?.user_id, null);
        if (!userId) return;
        summaryByUser.set(userId, {
          user_id: userId,
          assignment_id: assignment.id,
          full_name: assignment.full_name || assignment.username || `Student #${userId}`,
          username: assignment.username || "",
          school_id: assignment.school_id || "",
          year_level: assignment.year_level || assignment.year || "",
          section: assignment.section || assignment.section_name || "",
          department: assignment.department || "",
          school_year: assignment.school_year
            ? normalizeSchoolYearValue(assignment.school_year)
            : schoolYear || null,
          payment_status: assignment.payment || "paid",
          amount_lacking: parseNumber(assignment.amount_lacking, 0) || 0,
          deadline: String(
            assignment.payment_deadline || assignment.deadline || assignment.due_date || "",
          ).trim(),
          warning_issued: false,
          receipt_count: 0,
          last_payment_at: null,
          receipts: [],
        });
      });

      events.forEach((event) => {
        const userId = parseNumber(event?.target_user_id, null);
        if (!userId) return;

        if (!summaryByUser.has(userId)) {
          summaryByUser.set(userId, {
            user_id: userId,
            assignment_id: null,
            full_name: event.target_username || `Student #${userId}`,
            username: event.target_username || "",
            school_id: "",
            year_level: String(event?.metadata?.year_level || "").trim(),
            section: String(event?.metadata?.section || "").trim(),
            department: String(event?.metadata?.department || "").trim(),
            school_year: event?.metadata?.school_year
              ? normalizeSchoolYearValue(event.metadata.school_year)
              : schoolYear || null,
            payment_status: "paid",
            amount_lacking: 0,
            deadline: "",
            warning_issued: false,
            receipt_count: 0,
            last_payment_at: null,
            receipts: [],
          });
        }

        const summary = summaryByUser.get(userId);
        summary.receipts.push(event);
        summary.receipt_count += 1;
        if (!summary.last_payment_at || String(event.created_at || "") > String(summary.last_payment_at || "")) {
          summary.last_payment_at = event.created_at || summary.last_payment_at;
        }

        const eventDeadline = String(
          event?.metadata?.deadline || event?.metadata?.payment_deadline || "",
        ).trim();
        if (eventDeadline) {
          summary.deadline = eventDeadline;
        }

        const eventAction = String(event?.action || "")
          .trim()
          .toLowerCase();
        const amountAfterUpdate =
          parseNumber(event?.metadata?.remaining_amount_lacking, null) ??
          parseNumber(event?.metadata?.next_amount_lacking, null) ??
          parseNumber(event?.metadata?.amount_lacking, null);
        const assignedAmount = parseNumber(event?.metadata?.amount, null);

        if (amountAfterUpdate != null && amountAfterUpdate >= 0) {
          summary.amount_lacking = amountAfterUpdate;
          summary.payment_status = amountAfterUpdate > 0 ? "owing" : "paid";
        } else if (
          eventAction === "payment_lacking_assigned" &&
          assignedAmount != null &&
          assignedAmount >= 0
        ) {
          summary.amount_lacking = assignedAmount;
          summary.payment_status = assignedAmount > 0 ? "owing" : "paid";
        }

        if (eventAction === "payment_deadline_warning_issued") {
          summary.warning_issued = true;
        }
      });

      return Array.from(summaryByUser.values())
        .map((item) => ({
          ...item,
          receipts: (item.receipts || []).sort((a, b) =>
            String(b.created_at || "").localeCompare(String(a.created_at || "")),
          ),
        }))
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    }),

  getPaymentRecordForStudent: async (userId: number, filters: LooseRecord = {}) =>
    withApi(async () => {
      const targetUserId = parseNumber(userId, null);
      if (!targetUserId) throw new Error("Invalid student selected.");

      const rows = await AdminAPI.getPaymentRecords({ ...filters, user_id: targetUserId });
      const row = (rows || []).find((item) => parseNumber(item?.user_id, null) === targetUserId);
      if (!row) {
        return {
          user_id: targetUserId,
          payment_status: "paid",
          amount_lacking: 0,
          receipt_count: 0,
          receipts: [],
        };
      }
      return row;
    }),

  warnOverduePayments: async (rows: any[] = []) =>
    withApi(async () => {
      const now = new Date();
      let warnedCount = 0;

      for (const row of Array.isArray(rows) ? rows : []) {
        const paymentStatus = String(row?.payment_status || row?.payment || "")
          .trim()
          .toLowerCase();
        if (paymentStatus !== "owing") continue;

        const deadlineRaw = String(row?.deadline || row?.payment_deadline || "").trim();
        if (!deadlineRaw) continue;
        const deadlineDate = new Date(deadlineRaw);
        if (Number.isNaN(deadlineDate.getTime())) continue;

        const normalizedDeadline = deadlineDate.toISOString().slice(0, 10);
        const deadlineCutoff = new Date(`${normalizedDeadline}T23:59:59.999`);
        if (Number.isNaN(deadlineCutoff.getTime()) || now <= deadlineCutoff) continue;

        const assignmentId = parseNumber(row?.assignment_id, null);
        const targetUserId = parseNumber(row?.user_id, null);
        if (!targetUserId) continue;

        const existingWarning = (Array.isArray(row?.receipts) ? row.receipts : []).some((event) => {
          const action = String(event?.action || "")
            .trim()
            .toLowerCase();
          if (action !== "payment_deadline_warning_issued") return false;

          const eventAssignmentId = parseNumber(event?.metadata?.assignment_id, null);
          const eventDeadline = String(event?.metadata?.deadline || "").trim();
          if (eventDeadline && eventDeadline !== normalizedDeadline) return false;
          if (assignmentId && eventAssignmentId && assignmentId !== eventAssignmentId) return false;
          return true;
        });
        if (existingWarning) continue;

        await logStatusEvent({
          action: "payment_deadline_warning_issued",
          category: "payment",
          target_user_id: targetUserId,
          target_username: row?.username || null,
          target_role: "student",
          message: `Payment deadline reached for "${row?.full_name || row?.username || targetUserId}". Please settle outstanding balance.`,
          metadata: {
            assignment_id: assignmentId,
            deadline: normalizedDeadline,
            amount_lacking: parseNumber(row?.amount_lacking, 0) || 0,
            department: row?.department || null,
            year_level: row?.year_level || row?.year || null,
            section: row?.section || null,
            source: "treasury_overdue_check",
          },
        });
        warnedCount += 1;
      }

      return { warned_count: warnedCount };
    }),

  createUserAssignment: async (payload) =>
    withApi(async () => {
      let userId = payload?.user_id || payload?.existing_user_id || null;
      if (!userId && payload?.full_name) {
        const q = sanitizeLike(payload.full_name);
        if (q) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select(USER_SAFE_SELECT)
            .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
            .limit(1);
          if (usersError) throw formatSupabaseError(usersError);
          userId = users?.[0]?.id || null;
        }
      }
      if (!userId) throw new Error("User not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const insertPayload = {
        user_id: userId,
        section_id: section.id,
        assignment_type: "primary",
        status: "active",
        year_level: normalizeYearLevel(payload?.year || section.grade_level),
        section: section.section_name,
        department: payload?.department || section.course || null,
        major: payload?.major || section.major || null,
        payment: payload?.payment || "paid",
        amount_lacking:
          payload?.amount_lacking === "" || payload?.amount_lacking == null
            ? payload?.payment === "owing"
              ? 0
              : null
            : parseNumber(payload.amount_lacking, 0),
        sanctions: toSmallintFlag(payload?.sanctions, 0),
        sanction_reason: payload?.sanction_reason || null,
        semester: payload?.semester || "1st Semester",
        school_year: normalizeSchoolYearValue(payload?.school_year || section.school_year || currentSchoolYear()),
        student_status: normalizeStudentStatusValue(payload?.student_status),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_assignments")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await safeSyncUserGender(userId, payload?.gender);

      const mapped = await mapUserAssignmentRows([data]);
      return mapped[0] || data;
    }),

  updateUserAssignment: async (id, payload) =>
    withApi(async () => {
      const { data: previousAssignment, error: previousAssignmentError } = await supabase
        .from("user_assignments")
        .select(
          "id,user_id,section_id,section,student_status,payment,amount_lacking,sanctions,sanction_reason,year_level,department,school_year",
        )
        .eq("id", id)
        .limit(1)
        .maybeSingle();
      if (previousAssignmentError) throw formatSupabaseError(previousAssignmentError);

      const updates: LooseRecord = {
        updated_at: new Date().toISOString(),
      };

      if (payload?.year !== undefined) {
        updates.year_level = normalizeYearLevel(payload.year);
      }

      if (payload?.section !== undefined || payload?.section_id !== undefined) {
        const section = await findSection({
          sectionId: payload?.section_id,
          sectionName: payload?.section,
          year: payload?.year,
        });
        if (section) {
          updates.section_id = section.id;
          updates.section = section.section_name;
        } else if (payload?.section === null || payload?.section === "") {
          updates.section_id = null;
          updates.section = null;
        }
      }

      if (payload?.department !== undefined) updates.department = payload.department || null;
      if (payload?.major !== undefined) updates.major = payload.major || null;
      if (payload?.payment !== undefined) updates.payment = payload.payment || "paid";
      if (payload?.amount_lacking !== undefined) {
        updates.amount_lacking =
          payload.amount_lacking === "" || payload.amount_lacking == null
            ? null
            : parseNumber(payload.amount_lacking, 0);
      } else if (payload?.payment === "paid") {
        updates.amount_lacking = 0;
      }
      if (payload?.sanctions !== undefined) {
        updates.sanctions = toSmallintFlag(payload.sanctions, 0);
      }
      if (payload?.sanction_reason !== undefined) {
        updates.sanction_reason = payload.sanction_reason || null;
      }
      if (payload?.semester !== undefined) updates.semester = payload.semester || "1st Semester";
      if (payload?.school_year !== undefined) {
        updates.school_year = normalizeSchoolYearValue(payload.school_year || currentSchoolYear());
      }
      if (payload?.student_status !== undefined) {
        updates.student_status = normalizeStudentStatusValue(payload.student_status);
      }

      const { data, error } = await supabase
        .from("user_assignments")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await safeSyncUserGender(data?.user_id || previousAssignment?.user_id, payload?.gender);

      const previousStatus = normalizeStudentStatusValue(previousAssignment?.student_status).toLowerCase();
      const nextStatus = normalizeStudentStatusValue(data?.student_status).toLowerCase();
      const isIrregularToRegular = previousStatus === "irregular" && nextStatus === "regular";

      if (isIrregularToRegular && data?.user_id) {
        const { error: clearCustomLoadError } = await supabase
          .from("study_load")
          .delete()
          .eq("student_id", data.user_id);
        if (clearCustomLoadError && !isMissingRelation(clearCustomLoadError)) {
          throw formatSupabaseError(clearCustomLoadError);
        }
      }

      const targetUser = data?.user_id
        ? await fetchUserLogSnapshot(data.user_id).catch(() => null)
        : null;
      const schoolYear = normalizeSchoolYearValue(
        data?.school_year || previousAssignment?.school_year || currentSchoolYear(),
      );
      const yearLevel = normalizeYearLevel(
        data?.year_level || previousAssignment?.year_level || "",
      );
      const sectionName = String(data?.section || previousAssignment?.section || "").trim();
      const department = String(data?.department || previousAssignment?.department || "").trim();

      const previousPayment = String(previousAssignment?.payment || "paid").trim().toLowerCase();
      const nextPayment = String(data?.payment || previousPayment || "paid").trim().toLowerCase();
      const previousAmount = parseNumber(previousAssignment?.amount_lacking, 0) || 0;
      const nextAmount = parseNumber(data?.amount_lacking, 0) || 0;
      if (previousPayment !== nextPayment || previousAmount !== nextAmount) {
        await logStatusEvent({
          action: "payment_status_updated",
          category: "payment",
          target_user_id: data?.user_id || previousAssignment?.user_id || null,
          target_username: targetUser?.username || null,
          target_role: targetUser?.role || "student",
          message: `Payment status updated for "${targetUser?.full_name || targetUser?.username || data?.user_id || id}".`,
          metadata: {
            assignment_id: data?.id || id,
            previous_payment: previousPayment,
            next_payment: nextPayment,
            previous_amount_lacking: previousAmount,
            next_amount_lacking: nextAmount,
            school_year: schoolYear,
            section: sectionName,
            year_level: yearLevel,
            department,
          },
        });
      }

      const previousSanctions = toSmallintFlag(previousAssignment?.sanctions, 0);
      const nextSanctions = toSmallintFlag(data?.sanctions, previousSanctions);
      const previousSanctionReason = String(previousAssignment?.sanction_reason || "").trim();
      const nextSanctionReason = String(data?.sanction_reason || "").trim();
      if (previousSanctions !== nextSanctions || previousSanctionReason !== nextSanctionReason) {
        await logStatusEvent({
          action: nextSanctions ? "student_sanction_applied" : "student_sanction_cleared",
          category: "discipline",
          target_user_id: data?.user_id || previousAssignment?.user_id || null,
          target_username: targetUser?.username || null,
          target_role: targetUser?.role || "student",
          message: nextSanctions
            ? `Sanction updated for "${targetUser?.full_name || targetUser?.username || data?.user_id || id}".`
            : `Sanction cleared for "${targetUser?.full_name || targetUser?.username || data?.user_id || id}".`,
          metadata: {
            assignment_id: data?.id || id,
            sanctions_before: previousSanctions,
            sanctions_after: nextSanctions,
            sanction_reason_before: previousSanctionReason || null,
            sanction_reason_after: nextSanctionReason || null,
            sanction_level:
              normalizeOffenseLevel(
                inferSanctionLevelFromReason(nextSanctionReason || previousSanctionReason || ""),
                "",
              ) || null,
            school_year: schoolYear,
            section: sectionName,
            year_level: yearLevel,
            department,
          },
        });

        const actor = describeCurrentActor();
        await createUserNotification({
          action: nextSanctions ? "student_sanction_applied" : "student_sanction_cleared",
          category: "discipline",
          target_user_id: data?.user_id || previousAssignment?.user_id || null,
          title: nextSanctions ? "Sanction updated" : "Sanction cleared",
          message: nextSanctions
            ? `Your sanction status was updated by ${actor.label}.`
            : `Your sanction was cleared by ${actor.label}.`,
          metadata: {
            sanctions_before: previousSanctions,
            sanctions_after: nextSanctions,
            sanction_reason_before: previousSanctionReason || null,
            sanction_reason_after: nextSanctionReason || null,
            school_year: schoolYear,
            section: sectionName || null,
            year_level: yearLevel || null,
            department: department || null,
          },
        });
      }

      const mapped = await mapUserAssignmentRows([data]);
      return mapped[0] || data;
    }),

  deleteUserAssignment: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("user_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getUserSuggestions: async (query, role = null) =>
    withApi(async () => {
      const safe = sanitizeLike(query);
      if (!safe || safe.length < 2) return [];

      const { data, error } = await supabase
        .from("users")
        .select(USER_SAFE_SELECT)
        .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
        .limit(10);
      if (error) throw formatSupabaseError(error);

      const mapped = (data || []).map(normalizeUser);
      if (!role) return mapped;
      const targetRole = normalizeRole(role);
      return mapped.filter((user) => user.roles.includes(targetRole));
    }),

  getSubjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("course", { ascending: true })
        .order("year_level", { ascending: true })
        .order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapSubject);
    }),

  createSubject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .insert({
          subject_code: String(payload?.subject_code || "").trim(),
          subject_name: String(payload?.subject_name || payload?.title || "").trim(),
          title: payload?.title || payload?.subject_name || null,
          description: payload?.description || null,
          units: parseNumber(payload?.units, 0),
          course: payload?.course || null,
          major: payload?.major || null,
          year_level: parseNumber(payload?.year_level, null),
          semester: payload?.semester || "First Semester",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSubject(data);
    }),

  updateSubject: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .update({
          subject_code: String(payload?.subject_code || "").trim(),
          subject_name: String(payload?.subject_name || payload?.title || "").trim(),
          title: payload?.title || payload?.subject_name || null,
          description: payload?.description || null,
          units: parseNumber(payload?.units, 0),
          course: payload?.course || null,
          major: payload?.major || null,
          year_level: parseNumber(payload?.year_level, null),
          semester: payload?.semester || "First Semester",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSubject(data);
    }),

  deleteSubject: async (id) =>
    withApi(async () => {
      const { data: subjectRow, error: subjectError } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .limit(1)
        .maybeSingle();
      if (subjectError) throw formatSupabaseError(subjectError);
      if (!subjectRow) return { success: true };

      await Promise.all([
        supabase.from("teacher_assignments").delete().eq("subject_id", id),
        supabase.from("grades").delete().eq("subject_id", id),
        supabase.from("study_load").delete().eq("subject_id", id),
        supabase.from("study_load").delete().eq("subject_code", subjectRow.subject_code),
        supabase.from("section_assignments").delete().eq("subject_id", id),
        supabase.from("schedules").delete().eq("subject_code", subjectRow.subject_code),
      ]);

      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getTeacherAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);

      const [usersMap, subjectsMap, sectionsMap] = await Promise.all([
        fetchUsersByIds(teacherIds),
        fetchSubjectsByIds(subjectIds),
        fetchSectionsByIds(sectionIds),
      ]);

      return rows.map((row) => {
        const teacher = usersMap.get(row.teacher_id);
        const subject = subjectsMap.get(row.subject_id);
        const section = sectionsMap.get(row.section_id);
        return {
          id: row.id,
          teacher_id: row.teacher_id,
          subject_id: row.subject_id,
          section_id: row.section_id,
          status: row.status,
          created_at: row.created_at,
          full_name: teacher?.full_name || "",
          username: teacher?.username || "",
          subject_code: subject?.subject_code || row.subject_code || "",
          subject_title: subject?.subject_name || row.subject_title || "",
          section_name: section?.section_name || row.section || "",
          grade_level: section?.grade_level || "",
        };
      });
    }),

  createTeacherAssignment: async (payload) =>
    withApi(async () => {
      let teacherId = payload?.user_id || null;
      if (!teacherId && payload?.teacher_name) {
        const q = sanitizeLike(payload.teacher_name);
        const { data: teachers, error: teacherError } = await supabase
          .from("users")
          .select(USER_SAFE_SELECT)
          .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(25);
        if (teacherError) throw formatSupabaseError(teacherError);
        const match = (teachers || [])
          .map(normalizeUser)
          .find((user) => user.roles.includes("teacher"));
        teacherId = match?.id || null;
      }
      if (!teacherId) throw new Error("Teacher not found.");

      const subject = await findSubjectByCode(payload?.subject_code);
      if (!subject) throw new Error("Subject not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });

      const { data: existing, error: existingError } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("subject_id", subject.id)
        .eq("status", "active")
        .limit(1);
      if (existingError) throw formatSupabaseError(existingError);
      if ((existing || []).length > 0) {
        const duplicateError = new Error("Assignment already exists.");
        duplicateError.status = 409;
        throw duplicateError;
      }

      const { data, error } = await supabase
        .from("teacher_assignments")
        .insert({
          teacher_id: teacherId,
          subject_id: subject.id,
          section_id: section?.id || null,
          section: section?.section_name || null,
          school_year: section?.school_year || currentSchoolYear(),
          semester: subject?.semester || "1st Semester",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteTeacherAssignment: async (id) =>
    withApi(async () => {
      await supabase
        .from("schedules")
        .delete()
        .eq("teacher_assignment_id", id);
      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getSchedules: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("time_start", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return mapScheduleRows(data || []);
    }),

  createSchedule: async (payload) =>
    withApi(async () => {
      const subject = await findSubjectByCode(payload?.subject);
      if (!subject) throw new Error("Subject not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const schoolYear = section.school_year || currentSchoolYear();
      const timeStart = String(payload?.time_start || "").trim();
      const timeEnd = String(payload?.time_end || "").trim();
      const isPlaceholderTime =
        ["00:00", "00:00:00"].includes(timeStart || "00:00") &&
        ["00:00", "00:00:00"].includes(timeEnd || "00:00");

      const { data: directAssignment, error: directAssignmentError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("subject_id", subject.id)
        .eq("section_id", section.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (directAssignmentError) throw formatSupabaseError(directAssignmentError);

      let teacherAssignment = directAssignment;
      if (!teacherAssignment) {
        const { data: fallbackAssignment, error: fallbackAssignmentError } = await supabase
          .from("teacher_assignments")
          .select("*")
          .eq("subject_id", subject.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (fallbackAssignmentError) throw formatSupabaseError(fallbackAssignmentError);
        teacherAssignment = fallbackAssignment || null;
      }

      let teacherName = null;
      if (teacherAssignment?.teacher_id) {
        const usersMap = await fetchUsersByIds([teacherAssignment.teacher_id]);
        const teacher = usersMap.get(teacherAssignment.teacher_id);
        teacherName = teacher?.full_name || teacher?.username || null;
      }

      const upsertRoomAssignment = async () => {
        const buildingName = String(payload?.building || "").trim();
        const roomInput = String(payload?.room || "").trim();
        if (!buildingName || !roomInput || roomInput.toLowerCase() === "tba") return null;

        const roomNumber = parseNumber(roomInput, null);
        if (roomNumber == null) {
          if (isPlaceholderTime) return null;
          throw new Error("Room must be numeric.");
        }
        const floorNumber = parseNumber(payload?.floor, Math.floor(roomNumber / 100) || 1);

        const building = await ensureBuilding(buildingName);
        if (!building?.id) throw new Error("Building not found.");

        const { data: conflicts, error: conflictError } = await supabase
          .from("section_assignments")
          .select("id,section_id")
          .eq("building_id", building.id)
          .eq("floor_number", floorNumber)
          .eq("room_number", roomNumber)
          .eq("school_year", schoolYear)
          .neq("section_id", section.id);
        if (conflictError) throw formatSupabaseError(conflictError);
        if ((conflicts || []).length > 0) {
          const roomConflict = new Error("Room already assigned for this school year.");
          roomConflict.status = 409;
          throw roomConflict;
        }

        const { data: existing, error: existingError } = await supabase
          .from("section_assignments")
          .select("*")
          .eq("section_id", section.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingError) throw formatSupabaseError(existingError);

        const assignmentPayload = {
          section_id: section.id,
          building_id: building.id,
          floor_number: floorNumber,
          room_number: roomNumber,
          school_year: schoolYear,
          status: "active",
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { data: updated, error: updateError } = await supabase
            .from("section_assignments")
            .update(assignmentPayload)
            .eq("id", existing.id)
            .select("*")
            .single();
          if (updateError) throw formatSupabaseError(updateError);
          return updated.id;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("section_assignments")
          .insert({
            ...assignmentPayload,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insertError) throw formatSupabaseError(insertError);
        return inserted.id;
      };

      if (isPlaceholderTime) {
        await upsertRoomAssignment();
        await ensureStudyLoad({
          section,
          subject,
          teacherName,
          failIfExists: true,
        });
        return { success: true };
      }

      if (!teacherAssignment) {
        throw new Error("No teacher assigned to this subject.");
      }

      const toMinutes = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return null;
        const [hours, minutes] = raw.split(":").map((part) => parseInt(part, 10));
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
        return hours * 60 + minutes;
      };

      const startMinutes = toMinutes(timeStart);
      const endMinutes = toMinutes(timeEnd);
      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        throw new Error("Invalid schedule time range.");
      }

      const { data: teacherAssignments, error: teacherAssignmentsError } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacherAssignment.teacher_id)
        .eq("status", "active");
      if (teacherAssignmentsError) throw formatSupabaseError(teacherAssignmentsError);
      const teacherAssignmentIds = (teacherAssignments || []).map((row) => row.id);

      if (teacherAssignmentIds.length > 0) {
        const { data: daySchedules, error: daySchedulesError } = await supabase
          .from("schedules")
          .select("*")
          .eq("day_of_week", payload?.day)
          .in("teacher_assignment_id", teacherAssignmentIds);
        if (daySchedulesError) throw formatSupabaseError(daySchedulesError);

        const conflict = (daySchedules || []).find((row) => {
          const rowStart = toMinutes(row.time_start);
          const rowEnd = toMinutes(row.time_end);
          if (rowStart == null || rowEnd == null) return false;
          return startMinutes < rowEnd && endMinutes > rowStart;
        });

        if (conflict) {
          const scheduleConflict = new Error("Teacher conflict detected.");
          scheduleConflict.status = 409;
          throw scheduleConflict;
        }
      }

      const roomAssignmentId = await upsertRoomAssignment();
      const { data, error } = await supabase
        .from("schedules")
        .insert({
          teacher_assignment_id: teacherAssignment.id,
          day_of_week: payload?.day || "Monday",
          time_start: timeStart,
          time_end: timeEnd,
          room_id: roomAssignmentId,
          subject_code: subject.subject_code,
          section_id: section.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await ensureStudyLoad({
        section,
        subject,
        teacherName,
      });

      return data;
    }),

  deleteSchedule: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getProjects: async () =>
    withApi(async () => {
      const { data: campusProjects, error: campusError } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!campusError) {
        return (campusProjects || []).map(mapProject);
      }

      if (!isMissingRelation(campusError)) {
        throw formatSupabaseError(campusError);
      }

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (projectsError) throw formatSupabaseError(projectsError);
      return (projects || []).map(mapProject);
    }),

  createProject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .insert({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Ongoing",
          budget: payload?.budget || null,
          start_date: payload?.started || payload?.start_date || null,
          description: payload?.description || null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  updateProject: async (id, payload) =>
    withApi(async () => {
      const { data: campusUpdated, error: campusUpdateError } = await supabase
        .from("campus_projects")
        .update({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Ongoing",
          budget: payload?.budget || null,
          start_date: payload?.started || payload?.start_date || null,
          description: payload?.description || null,
        })
        .eq("id", id)
        .select("*");

      if (!campusUpdateError && (campusUpdated || []).length > 0) {
        return mapProject(campusUpdated[0]);
      }

      if (campusUpdateError && !isMissingRelation(campusUpdateError)) {
        throw formatSupabaseError(campusUpdateError);
      }

      const { data: projectUpdated, error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          title: payload?.title || payload?.name || "",
          name: payload?.name || payload?.title || "",
          description: payload?.description || null,
          due_date: payload?.due_date || null,
          max_score: parseNumber(payload?.max_score, 100),
          status: payload?.status || "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*");

      if (projectUpdateError) throw formatSupabaseError(projectUpdateError);
      if ((projectUpdated || []).length === 0) {
        throw new Error("Project not found.");
      }
      return mapProject(projectUpdated[0]);
    }),

  deleteProject: async (id) =>
    withApi(async () => {
      const { error: campusDeleteError } = await supabase
        .from("campus_projects")
        .delete()
        .eq("id", id);
      if (campusDeleteError && !isMissingRelation(campusDeleteError)) {
        throw formatSupabaseError(campusDeleteError);
      }

      await supabase.from("projects").delete().eq("id", id);
      return { success: true };
    }),

  getSectionsWithLoad: async () =>
    withApi(async () => {
      const [sectionsResult, loadResult] = await Promise.all([
        supabase.from("sections").select("*"),
        supabase.from("study_load").select("section_id"),
      ]);

      if (sectionsResult.error) throw formatSupabaseError(sectionsResult.error);
      if (loadResult.error && !isMissingRelation(loadResult.error)) {
        throw formatSupabaseError(loadResult.error);
      }

      const counts = new Map();
      (loadResult.data || []).forEach((row) => {
        const key = row.section_id;
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      return (sectionsResult.data || []).map((row) => {
        const count = counts.get(row.id) || 0;
        return {
          ...mapSection(row),
          subject_count: count,
          load_count: count,
          status: count > 0 ? "Assigned" : "Not Assigned",
        };
      });
    }),

  getSectionLoadDetails: async (id) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("study_load")
        .select("*")
        .eq("section_id", id)
        .order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);

      return (data || []).map((row) => ({
        ...row,
        semester:
          normalizeSemester(row.semester) === "2nd Semester"
            ? "Second Semester"
            : normalizeSemester(row.semester) === "1st Semester"
              ? "First Semester"
              : normalizeSemester(row.semester),
      }));
    }),

  clearSectionLoad: async (sectionId) =>
    withApi(async () => {
      const { error } = await supabase
        .from("study_load")
        .delete()
        .eq("section_id", sectionId);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  deleteStudyLoad: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("study_load")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getIrregularStudents: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("user_assignments")
        .select("*")
        .eq("status", "active")
        .ilike("student_status", "irregular")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return mapUserAssignmentRows(data || []);
    }),

  getStudentCustomStudyLoad: async (studentId) =>
    withApi(async () => {
      const numericStudentId = parseNumber(studentId, null);
      if (!numericStudentId) return [];

      const { data, error } = await supabase
        .from("study_load")
        .select("*")
        .eq("student_id", numericStudentId)
        .order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const [subjectsMap, sectionsMap] = await Promise.all([
        fetchSubjectsByIds(subjectIds),
        fetchSectionsByIds(sectionIds),
      ]);

      return rows.map((row) => {
        const subject = subjectsMap.get(row.subject_id);
        const section = sectionsMap.get(row.section_id);
        return {
          id: row.id,
          student_id: row.student_id,
          section_id: row.section_id,
          section: section?.section_name || row.section || "",
          subject_id: row.subject_id,
          subject_code: subject?.subject_code || row.subject_code || "",
          subject_title: subject?.subject_name || row.subject_title || "",
          units: parseNumber(subject?.units ?? row.units, 0),
          semester:
            normalizeSemester(row.semester) === "2nd Semester"
              ? "Second Semester"
              : normalizeSemester(row.semester) === "1st Semester"
                ? "First Semester"
                : normalizeSemester(row.semester),
          school_year: row.school_year || null,
          teacher: row.teacher || null,
          created_at: row.created_at || null,
          updated_at: row.updated_at || null,
        };
      });
    }),

  addStudentCustomStudyLoad: async (payload) =>
    withApi(async () => {
      const studentId = parseNumber(payload?.student_id, null);
      if (!studentId) throw new Error("Student is required.");

      const subject = await findSubjectByCode(payload?.subject_code || payload?.subject);
      if (!subject) throw new Error("Subject not found.");

      const assignment = await getActiveAssignmentForUser(studentId);
      if (!assignment) throw new Error("Student has no active section assignment.");
      if (normalizeStudentStatusValue(assignment?.student_status) !== "Irregular") {
        throw new Error("Custom study load is only allowed for students marked as Irregular.");
      }

      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id && !section?.section_name) {
        throw new Error("Student section is not configured.");
      }

      const { data: existingBySubjectId, error: existingBySubjectIdError } = await supabase
        .from("study_load")
        .select("id")
        .eq("student_id", studentId)
        .eq("subject_id", subject.id)
        .limit(1);
      if (existingBySubjectIdError) throw formatSupabaseError(existingBySubjectIdError);
      if ((existingBySubjectId || []).length > 0) {
        const duplicateError = new Error("This subject is already in the student's custom load.");
        duplicateError.status = 409;
        throw duplicateError;
      }

      const { data: existingByCode, error: existingByCodeError } = await supabase
        .from("study_load")
        .select("id")
        .eq("student_id", studentId)
        .ilike("subject_code", subject.subject_code)
        .limit(1);
      if (existingByCodeError) throw formatSupabaseError(existingByCodeError);
      if ((existingByCode || []).length > 0) {
        const duplicateError = new Error("This subject is already in the student's custom load.");
        duplicateError.status = 409;
        throw duplicateError;
      }

      let teacherName = null;
      if (section?.id) {
        const { data: teacherAssignment, error: teacherAssignmentError } = await supabase
          .from("teacher_assignments")
          .select("teacher_id")
          .eq("status", "active")
          .eq("section_id", section.id)
          .eq("subject_id", subject.id)
          .limit(1)
          .maybeSingle();
        if (teacherAssignmentError && !isMissingRelation(teacherAssignmentError)) {
          throw formatSupabaseError(teacherAssignmentError);
        }

        if (teacherAssignment?.teacher_id) {
          const usersMap = await fetchUsersByIds([teacherAssignment.teacher_id]);
          const teacher = usersMap.get(teacherAssignment.teacher_id);
          teacherName = teacher?.full_name || teacher?.username || null;
        }
      }

      const semester = normalizeSemester(
        payload?.semester || assignment?.semester || subject?.semester || "1st Semester",
      );

      const { data, error } = await supabase
        .from("study_load")
        .insert({
          student_id: studentId,
          subject_id: subject.id,
          section_id: section?.id || assignment?.section_id || null,
          school_year: assignment?.school_year || section?.school_year || currentSchoolYear(),
          semester,
          enrollment_status: "enrolled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          course: section?.course || assignment?.department || subject?.course || null,
          major: section?.major || assignment?.major || subject?.major || null,
          year_level: normalizeYearLevel(section?.grade_level || assignment?.year_level || subject?.year_level),
          section: section?.section_name || assignment?.section || null,
          subject_code: subject.subject_code,
          subject_title: subject.subject_name,
          units: subject.units || 0,
          teacher: teacherName,
        })
        .select("*")
        .single();

      if (error) throw formatSupabaseError(error);
      return data;
    }),

  removeStudentCustomStudyLoad: async (id) =>
    withApi(async () => {
      const numericId = parseNumber(id, null);
      if (!numericId) throw new Error("Invalid custom study load record.");

      const { error } = await supabase
        .from("study_load")
        .delete()
        .eq("id", numericId)
        .not("student_id", "is", null);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getGrades: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const studentIds = rows.map((row) => row.student_id).filter(Boolean);
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);

      const [studentsMap, teachersMap, sectionsMap, subjectsMap] = await Promise.all([
        fetchUsersByIds(studentIds),
        fetchUsersByIds(teacherIds),
        fetchSectionsByIds(sectionIds),
        fetchSubjectsByIds(subjectIds),
      ]);

      return rows.map((row) => {
        const student = studentsMap.get(row.student_id);
        const teacher = teachersMap.get(row.teacher_id);
        const section = sectionsMap.get(row.section_id);
        const subject = subjectsMap.get(row.subject_id);

        return {
          id: row.id,
          user_id: row.student_id,
          username: student?.username || null,
          student_name: student?.full_name || student?.username || null,
          subject_id: row.subject_id,
          subject_code: subject?.subject_code || row.subject_code || null,
          subject_name: subject?.subject_name || row.subject_name || null,
          teacher_id: row.teacher_id,
          teacher_name: teacher?.full_name || teacher?.username || null,
          section_id: row.section_id,
          section_name: section?.section_name || null,
          year: section?.grade_level || null,
          school_year: row.school_year || null,
          semester:
            normalizeSemester(row.semester) === "2nd Semester"
              ? "Second Semester"
              : normalizeSemester(row.semester) === "1st Semester"
                ? "First Semester"
                : normalizeSemester(row.semester),
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
          final_grade: row.final_grade,
          remarks: row.remarks,
        };
      });
    }),

  createGrade: async (payload) =>
    withApi(async () => {
      const studentId = parseNumber(payload?.student_id, null);
      if (!studentId) throw new Error("Student is required.");

      let subjectId = parseNumber(payload?.subject_id, null);
      if (!subjectId && payload?.subject_code) {
        const subject = await findSubjectByCode(payload.subject_code);
        subjectId = subject?.id || null;
      }
      if (!subjectId) throw new Error("Subject not found.");

      let sectionId = parseNumber(payload?.section_id, null);
      if (!sectionId) {
        const { data: assignment, error: assignmentError } = await supabase
          .from("user_assignments")
          .select("section_id,section")
          .eq("user_id", studentId)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (assignmentError && !isMissingRelation(assignmentError)) {
          throw formatSupabaseError(assignmentError);
        }
        if (assignment?.section_id) {
          sectionId = assignment.section_id;
        } else if (assignment?.section) {
          const section = await findSection({ sectionName: assignment.section });
          sectionId = section?.id || null;
        }
      }
      if (!sectionId) throw new Error("Could not determine student section.");

      const schoolYear = payload?.school_year || currentSchoolYear();
      const semester = normalizeSemester(payload?.semester || "1st Semester");

      const gradePayload = {
        student_id: studentId,
        subject_id: subjectId,
        teacher_id: parseNumber(payload?.teacher_id, null),
        section_id: sectionId,
        school_year: schoolYear,
        semester,
        prelim_grade: parseNumber(payload?.prelim_grade, null),
        midterm_grade: parseNumber(payload?.midterm_grade, null),
        finals_grade: parseNumber(payload?.finals_grade, null),
        final_grade: parseNumber(payload?.final_grade, null),
        remarks: payload?.remarks || null,
        updated_at: new Date().toISOString(),
      };
      const actor = describeCurrentActor();
      const subjectMap = await fetchSubjectsByIds([subjectId]);
      const sectionMap = await fetchSectionsByIds([sectionId]);
      const subject = subjectMap.get(subjectId);
      const section = sectionMap.get(sectionId);
      const gradeSummaryParts = [];
      if (gradePayload.prelim_grade != null) {
        gradeSummaryParts.push(`Prelim ${Number(gradePayload.prelim_grade).toFixed(1)}`);
      }
      if (gradePayload.midterm_grade != null) {
        gradeSummaryParts.push(`Midterm ${Number(gradePayload.midterm_grade).toFixed(1)}`);
      }
      if (gradePayload.finals_grade != null) {
        gradeSummaryParts.push(`Finals ${Number(gradePayload.finals_grade).toFixed(1)}`);
      }
      const gradeSummary = gradeSummaryParts.join(", ");

      const { data: existing, error: existingError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .eq("subject_id", subjectId)
        .eq("school_year", schoolYear)
        .eq("semester", semester)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      if (existing) {
        const { data, error } = await supabase
          .from("grades")
          .update(gradePayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);

        await createUserNotification({
          action: "grade_updated",
          category: "grade",
          target_user_id: studentId,
          title: `Grade updated: ${subject?.subject_code || subject?.subject_name || "Subject"}`,
          message: `${subject?.subject_name || subject?.subject_code || "Subject"} (${semester}) updated by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
          metadata: {
            grade_id: data?.id || existing.id,
            subject_id: subjectId,
            subject_code: subject?.subject_code || null,
            subject_name: subject?.subject_name || null,
            section_id: sectionId,
            section: section?.section_name || null,
            school_year: schoolYear,
            semester,
            prelim_grade: gradePayload.prelim_grade,
            midterm_grade: gradePayload.midterm_grade,
            finals_grade: gradePayload.finals_grade,
            final_grade: gradePayload.final_grade,
          },
        });

        return data;
      }

      const { data, error } = await supabase
        .from("grades")
        .insert({
          ...gradePayload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await createUserNotification({
        action: "grade_created",
        category: "grade",
        target_user_id: studentId,
        title: `New grade uploaded: ${subject?.subject_code || subject?.subject_name || "Subject"}`,
        message: `${subject?.subject_name || subject?.subject_code || "Subject"} (${semester}) uploaded by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
        metadata: {
          grade_id: data?.id || null,
          subject_id: subjectId,
          subject_code: subject?.subject_code || null,
          subject_name: subject?.subject_name || null,
          section_id: sectionId,
          section: section?.section_name || null,
          school_year: schoolYear,
          semester,
          prelim_grade: gradePayload.prelim_grade,
          midterm_grade: gradePayload.midterm_grade,
          finals_grade: gradePayload.finals_grade,
          final_grade: gradePayload.final_grade,
        },
      });

      return data;
    }),

  updateGrade: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("grades")
        .update({
          prelim_grade: payload?.prelim_grade ?? null,
          midterm_grade: payload?.midterm_grade ?? null,
          finals_grade: payload?.finals_grade ?? null,
          final_grade: payload?.final_grade ?? null,
          remarks: payload?.remarks ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      const subjectMap = await fetchSubjectsByIds([data?.subject_id]);
      const sectionMap = await fetchSectionsByIds([data?.section_id]);
      const subject = subjectMap.get(data?.subject_id);
      const section = sectionMap.get(data?.section_id);
      const actor = describeCurrentActor();
      const gradeSummaryParts = [];
      if (data?.prelim_grade != null) gradeSummaryParts.push(`Prelim ${Number(data.prelim_grade).toFixed(1)}`);
      if (data?.midterm_grade != null) gradeSummaryParts.push(`Midterm ${Number(data.midterm_grade).toFixed(1)}`);
      if (data?.finals_grade != null) gradeSummaryParts.push(`Finals ${Number(data.finals_grade).toFixed(1)}`);
      const gradeSummary = gradeSummaryParts.join(", ");

      await createUserNotification({
        action: "grade_updated",
        category: "grade",
        target_user_id: data?.student_id || null,
        title: `Grade updated: ${subject?.subject_code || subject?.subject_name || "Subject"}`,
        message: `${subject?.subject_name || subject?.subject_code || "Subject"} grade updated by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
        metadata: {
          grade_id: data?.id || id,
          subject_id: data?.subject_id || null,
          subject_code: subject?.subject_code || null,
          subject_name: subject?.subject_name || null,
          section_id: data?.section_id || null,
          section: section?.section_name || null,
          school_year: data?.school_year || null,
          semester: data?.semester || null,
          prelim_grade: data?.prelim_grade ?? null,
          midterm_grade: data?.midterm_grade ?? null,
          finals_grade: data?.finals_grade ?? null,
          final_grade: data?.final_grade ?? null,
        },
      });

      return data;
    }),

  deleteGrade: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  cleanupPictures: async () =>
    withApi(async () => {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, image_path");
      if (usersError) throw formatSupabaseError(usersError);

      const userRows = users || [];
      const existingUserIds = new Set(
        userRows
          .map((row) => String(row?.id || "").trim())
          .filter(Boolean),
      );

      const referencedPaths = new Set(
        userRows
          .map((row) => normalizeAvatarPathForUser(row?.id, row?.image_path))
          .filter(Boolean),
      );

      const storedFiles = await listStorageFilesRecursive(AVATAR_BUCKET, "profiles");
      const stalePaths = storedFiles
        .map((row) => String(row.full_path || "").replace(/^\/+/, ""))
        .filter((path) => {
          if (!path) return false;

          const ownerId = extractAvatarOwnerId(path);
          if (!ownerId) return true;
          if (!existingUserIds.has(ownerId)) return true;

          return !referencedPaths.has(path);
        });

      if (stalePaths.length > 0) {
        for (const batch of chunkArray(stalePaths, 100)) {
          const { error: removeError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove(batch);
          if (removeError) {
            throw formatSupabaseError(removeError, "Failed to remove unused profile images.");
          }
        }
      }

      return {
        deleted: stalePaths.length,
        total_users: userRows.length,
        scanned_files: storedFiles.length,
        active_files: referencedPaths.size,
        files: stalePaths,
      };
    }),

  clearStatusLogsByDateRange: async (filters: LooseRecord = {}) =>
    withApi(async () => {
      const fromRaw = String(filters?.date_from || "").trim();
      const toRaw = String(filters?.date_to || "").trim();
      const category = String(filters?.category || "").trim().toLowerCase();

      if (!fromRaw || !toRaw) {
        throw new Error("Start and end date are required.");
      }

      const fromDate = new Date(fromRaw);
      const toDate = new Date(toRaw);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new Error("Invalid date range.");
      }
      if (toDate < fromDate) {
        throw new Error("End date must be after start date.");
      }

      const toDateInclusive = new Date(toDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
        toDateInclusive.setHours(23, 59, 59, 999);
      }

      let countQuery = supabase
        .from("status_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDateInclusive.toISOString());

      let deleteQuery = supabase
        .from("status_logs")
        .delete()
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDateInclusive.toISOString());

      if (category) {
        countQuery = countQuery.eq("category", category);
        deleteQuery = deleteQuery.eq("category", category);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        if (isMissingRelation(countError)) {
          throw new Error("Status logs table is missing.");
        }
        throw formatSupabaseError(countError, "Failed to count logs.");
      }

      const total = Number(count || 0);
      if (total <= 0) {
        return { deleted: 0, date_from: fromDate.toISOString(), date_to: toDateInclusive.toISOString(), category };
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        throw formatSupabaseError(deleteError, "Failed to clear logs.");
      }

      await logStatusEvent({
        action: "status_logs_cleared",
        category: "system",
        message: `Cleared ${total} status log record(s) from ${fromDate.toISOString()} to ${toDateInclusive.toISOString()}.`,
        metadata: {
          deleted_count: total,
          date_from: fromDate.toISOString(),
          date_to: toDateInclusive.toISOString(),
          category: category || null,
        },
      });

      return {
        deleted: total,
        date_from: fromDate.toISOString(),
        date_to: toDateInclusive.toISOString(),
        category: category || null,
      };
    }),

  getStorageHealth: async (options: LooseRecord = {}) =>
    withApi(async () => {
      const largeFileThresholdMb = Math.max(1, parseNumber(options?.large_file_threshold_mb, 5) || 5);
      const spikeThresholdMb = Math.max(10, parseNumber(options?.spike_threshold_mb, 100) || 100);
      const largeFileThresholdBytes = largeFileThresholdMb * 1024 * 1024;
      const spikeThresholdBytes = spikeThresholdMb * 1024 * 1024;

      const [avatarFiles, backupFiles] = await Promise.all([
        listStorageFilesRecursive(AVATAR_BUCKET, "profiles"),
        listStorageFilesRecursive(BACKUP_BUCKET, BACKUP_PREFIX),
      ]);

      const avatarBytes = sumStorageBytes(avatarFiles);
      const backupBytes = sumStorageBytes(backupFiles);
      const totalBytes = avatarBytes + backupBytes;

      const largeFiles = [...avatarFiles, ...backupFiles]
        .map((entry) => ({
          bucket: entry?.bucket || (entry?.full_path?.startsWith("profiles/") ? AVATAR_BUCKET : BACKUP_BUCKET),
          path: entry?.full_path,
          size: parseNumber(entry?.metadata?.size, 0) || 0,
          created_at: entry?.created_at || entry?.updated_at || null,
        }))
        .filter((entry) => entry.size >= largeFileThresholdBytes)
        .sort((a, b) => b.size - a.size);

      const previousTotalBytes = parseNumber(localStorage.getItem(MAINTENANCE_STORAGE_BASELINE_KEY), 0) || 0;
      const deltaBytes = totalBytes - previousTotalBytes;
      const spikeDetected = previousTotalBytes > 0 && deltaBytes >= spikeThresholdBytes;
      localStorage.setItem(MAINTENANCE_STORAGE_BASELINE_KEY, String(totalBytes));

      if (spikeDetected || largeFiles.length > 0) {
        await logStatusEvent({
          action: "storage_alert_detected",
          category: "system",
          message: spikeDetected
            ? "Storage spike detected during maintenance health check."
            : "Large storage files detected during maintenance health check.",
          metadata: {
            total_bytes: totalBytes,
            previous_total_bytes: previousTotalBytes,
            delta_bytes: deltaBytes,
            spike_detected: spikeDetected,
            large_file_threshold_mb: largeFileThresholdMb,
            spike_threshold_mb: spikeThresholdMb,
            large_files_count: largeFiles.length,
            largest_files: largeFiles.slice(0, 20),
          },
        });
      }

      return {
        avatar_bucket: {
          bucket: AVATAR_BUCKET,
          file_count: avatarFiles.length,
          total_bytes: avatarBytes,
        },
        backup_bucket: {
          bucket: BACKUP_BUCKET,
          file_count: backupFiles.length,
          total_bytes: backupBytes,
        },
        total_bytes: totalBytes,
        previous_total_bytes: previousTotalBytes,
        delta_bytes: deltaBytes,
        spike_detected: spikeDetected,
        large_file_threshold_mb: largeFileThresholdMb,
        spike_threshold_mb: spikeThresholdMb,
        large_files: largeFiles,
      };
    }),

  getDatabaseHealth: async () =>
    withApi(async () => {
      const startedAt = performance.now();
      const nowIso = new Date().toISOString();

      const [{ error: usersError }, { error: logsError }, { error: requestsError }] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("status_logs").select("id", { count: "exact", head: true }),
        supabase.from("account_requests").select("id", { count: "exact", head: true }),
      ]);

      const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const healthy = !usersError && !logsError && !requestsError;

      return {
        checked_at: nowIso,
        healthy,
        latency_ms: latencyMs,
        checks: [
          { name: "users_table", ok: !usersError, error: usersError?.message || null },
          { name: "status_logs_table", ok: !logsError, error: logsError?.message || null },
          { name: "account_requests_table", ok: !requestsError, error: requestsError?.message || null },
        ],
      };
    }),

  findDuplicateUsers: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, school_id, auth_uid, image_path, created_at, updated_at")
        .order("created_at", { ascending: true });

      if (error) throw formatSupabaseError(error, "Failed to scan users for duplicates.");

      const rows = data || [];
      const byUsername = new Map<string, any[]>();
      const bySchoolId = new Map<string, any[]>();
      const byAuthUid = new Map<string, any[]>();

      for (const row of rows) {
        const usernameKey = String(row?.username || "").trim().toLowerCase();
        const schoolIdKey = String(row?.school_id || "").trim().toLowerCase();
        const authUidKey = String(row?.auth_uid || "").trim().toLowerCase();

        if (usernameKey) {
          if (!byUsername.has(usernameKey)) byUsername.set(usernameKey, []);
          byUsername.get(usernameKey)?.push(row);
        }
        if (schoolIdKey) {
          if (!bySchoolId.has(schoolIdKey)) bySchoolId.set(schoolIdKey, []);
          bySchoolId.get(schoolIdKey)?.push(row);
        }
        if (authUidKey) {
          if (!byAuthUid.has(authUidKey)) byAuthUid.set(authUidKey, []);
          byAuthUid.get(authUidKey)?.push(row);
        }
      }

      const toDuplicateGroups = (map: Map<string, any[]>, kind: string) =>
        Array.from(map.entries())
          .filter(([, group]) => (group || []).length > 1)
          .map(([key, group]) => ({
            type: kind,
            key,
            count: group.length,
            users: group.map((row) => ({
              id: row.id,
              username: row.username || "",
              full_name: row.full_name || "",
              school_id: row.school_id || "",
              auth_uid: row.auth_uid || null,
              image_path: row.image_path || null,
              created_at: row.created_at || null,
              updated_at: row.updated_at || null,
            })),
          }))
          .sort((a, b) => b.count - a.count);

      const usernameDuplicates = toDuplicateGroups(byUsername, "username");
      const schoolIdDuplicates = toDuplicateGroups(bySchoolId, "school_id");
      const authUidDuplicates = toDuplicateGroups(byAuthUid, "auth_uid");

      return {
        total_users: rows.length,
        duplicate_groups:
          usernameDuplicates.length + schoolIdDuplicates.length + authUidDuplicates.length,
        username_duplicates: usernameDuplicates,
        school_id_duplicates: schoolIdDuplicates,
        auth_uid_duplicates: authUidDuplicates,
      };
    }),

  restoreBackup: async (backupPath: string, options: LooseRecord = {}) =>
    withApi(async () => {
      const path = String(backupPath || "").trim().replace(/^\/+/, "");
      if (!path) throw new Error("Backup path is required.");

      const graceDays = Math.max(1, parseNumber(options?.grace_days, 30) || 30);
      const selectedTables = Array.isArray(options?.tables)
        ? options.tables.map((table) => String(table || "").trim()).filter(Boolean)
        : [];

      const tableAllowList = [
        "users",
        "buildings",
        "rooms",
        "sections",
        "subjects",
        "announcements",
        "campus_projects",
        "evaluation_settings",
        "section_assignments",
        "teacher_assignments",
        "schedules",
        "user_assignments",
        "study_load",
        "grades",
        "teacher_evaluations",
        "feedbacks",
        "projects",
        "attendance_logs",
        "settings",
        "section_subjects",
      ];

      const backups = await AdminAPI.getBackups();
      const targetBackup = (backups || []).find((entry) => String(entry?.path || "").trim() === path);
      if (!targetBackup?.created_at) {
        throw new Error("Backup not found.");
      }

      const createdAt = new Date(targetBackup.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error("Backup has invalid creation date.");
      }

      const now = Date.now();
      const ageMs = now - createdAt.getTime();
      const allowedMs = graceDays * 24 * 60 * 60 * 1000;
      if (ageMs > allowedMs) {
        throw new Error(`Backup is older than ${graceDays} day grace period and cannot be restored.`);
      }

      const { data: blobData, error: downloadError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .download(path);
      if (downloadError || !blobData) {
        throw formatSupabaseError(downloadError, "Failed to download backup file.");
      }

      let payload: any = null;
      try {
        payload = JSON.parse(await blobData.text());
      } catch (_) {
        throw new Error("Backup file is invalid JSON.");
      }

      const records = payload?.records && typeof payload.records === "object" ? payload.records : {};
      const tablesToRestore = (selectedTables.length > 0 ? selectedTables : tableAllowList)
        .filter((table) => tableAllowList.includes(table));

      const restored: Record<string, number> = {};
      const skipped: Record<string, number> = {};

      for (const table of tablesToRestore) {
        const rows = Array.isArray(records?.[table]) ? records[table] : [];
        if (rows.length <= 0) {
          skipped[table] = 0;
          continue;
        }

        let restoredCount = 0;
        for (const batch of chunkArray(rows, 200)) {
          const { error: upsertError } = await supabase
            .from(table)
            .upsert(batch, { onConflict: "id" });

          if (upsertError) {
            if (isMissingRelation(upsertError)) {
              skipped[table] = rows.length;
              restoredCount = 0;
              break;
            }
            throw formatSupabaseError(upsertError, `Failed to restore "${table}".`);
          }
          restoredCount += batch.length;
        }
        if (restoredCount > 0) {
          restored[table] = restoredCount;
        }
      }

      await logStatusEvent({
        action: "backup_restored",
        category: "system",
        message: `Backup restored from ${path}.`,
        metadata: {
          path,
          grace_days: graceDays,
          restored,
          skipped,
        },
      });

      return {
        path,
        restored,
        skipped,
      };
    }),

  runMaintenanceSuite: async (options: LooseRecord = {}) =>
    withApi(async () => {
      const dateFrom = String(options?.logs_date_from || "").trim();
      const dateTo = String(options?.logs_date_to || "").trim();
      const clearLogs = Boolean(options?.clear_logs && dateFrom && dateTo);

      const [cleanupResult, storageHealth, dbHealth, duplicateUsers] = await Promise.all([
        AdminAPI.cleanupPictures(),
        AdminAPI.getStorageHealth({
          large_file_threshold_mb: parseNumber(options?.large_file_threshold_mb, 5) || 5,
          spike_threshold_mb: parseNumber(options?.spike_threshold_mb, 100) || 100,
        }),
        AdminAPI.getDatabaseHealth(),
        AdminAPI.findDuplicateUsers(),
      ]);

      let logsResult = null;
      if (clearLogs) {
        logsResult = await AdminAPI.clearStatusLogsByDateRange({
          date_from: dateFrom,
          date_to: dateTo,
          category: String(options?.logs_category || "").trim().toLowerCase() || null,
        });
      }

      const report = {
        generated_at: new Date().toISOString(),
        cleanup_pictures: cleanupResult,
        storage_health: storageHealth,
        database_health: dbHealth,
        duplicate_users: duplicateUsers,
        logs_cleanup: logsResult,
      };

      await logStatusEvent({
        action: "maintenance_suite_completed",
        category: "system",
        message: "Admin maintenance suite completed.",
        metadata: report,
      });

      return report;
    }),

  getMaintenanceScheduler: async () =>
    withApi(async () => {
      const keys = [
        "maintenance_schedule_enabled",
        "maintenance_schedule_frequency",
        "maintenance_schedule_day",
        "maintenance_schedule_time",
        "maintenance_schedule_last_report_at",
      ];

      const { data, error } = await supabase
        .from("evaluation_settings")
        .select("setting_key,setting_value")
        .in("setting_key", keys);
      if (error) throw formatSupabaseError(error, "Failed to load maintenance scheduler settings.");

      const byKey = new Map<string, any>();
      (data || []).forEach((row) => byKey.set(String(row?.setting_key || ""), row?.setting_value));

      const enabledRaw = String(byKey.get("maintenance_schedule_enabled") || "")
        .trim()
        .toLowerCase();

      return {
        enabled: enabledRaw === "true" || enabledRaw === "1" || enabledRaw === "yes",
        frequency: String(byKey.get("maintenance_schedule_frequency") || "weekly")
          .trim()
          .toLowerCase(),
        day: String(byKey.get("maintenance_schedule_day") || "monday")
          .trim()
          .toLowerCase(),
        time: String(byKey.get("maintenance_schedule_time") || "08:00").trim(),
        last_report_at: byKey.get("maintenance_schedule_last_report_at") || null,
      };
    }),

  updateMaintenanceScheduler: async (payload: LooseRecord = {}) =>
    withApi(async () => {
      const enabled = Boolean(payload?.enabled);
      const frequency = String(payload?.frequency || "weekly")
        .trim()
        .toLowerCase();
      const day = String(payload?.day || "monday")
        .trim()
        .toLowerCase();
      const time = String(payload?.time || "08:00").trim();

      if (!["weekly", "monthly"].includes(frequency)) {
        throw new Error("Frequency must be weekly or monthly.");
      }
      if (!/^\d{2}:\d{2}$/.test(time)) {
        throw new Error("Time must be in HH:mm format.");
      }

      await upsertSetting(
        "maintenance_schedule_enabled",
        enabled ? "true" : "false",
        "Enable or disable automated maintenance scheduler",
      );
      await upsertSetting(
        "maintenance_schedule_frequency",
        frequency,
        "Maintenance schedule frequency",
      );
      await upsertSetting(
        "maintenance_schedule_day",
        day,
        "Maintenance schedule day (weekday or month day)",
      );
      await upsertSetting(
        "maintenance_schedule_time",
        time,
        "Maintenance schedule time HH:mm",
      );

      await logStatusEvent({
        action: "maintenance_scheduler_updated",
        category: "system",
        message: "Maintenance scheduler configuration updated.",
        metadata: { enabled, frequency, day, time },
      });

      return { enabled, frequency, day, time };
    }),

  sendMaintenanceReportNow: async (options: LooseRecord = {}) =>
    withApi(async () => {
      const report = await AdminAPI.runMaintenanceSuite({
        large_file_threshold_mb: parseNumber(options?.large_file_threshold_mb, 5) || 5,
        spike_threshold_mb: parseNumber(options?.spike_threshold_mb, 100) || 100,
        clear_logs: false,
      });

      const sentAt = new Date().toISOString();
      await upsertSetting(
        "maintenance_schedule_last_report_at",
        sentAt,
        "Last maintenance report dispatch time",
      );

      await logStatusEvent({
        action: "maintenance_report_sent",
        category: "system",
        message: "Maintenance report sent to admins.",
        metadata: {
          sent_at: sentAt,
          recipient_group: "admins",
          report,
        },
      });

      return {
        sent_at: sentAt,
        recipient_group: "admins",
        report,
      };
    }),

  createBackup: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const tables = [
        "users",
        "buildings",
        "rooms",
        "sections",
        "subjects",
        "announcements",
        "campus_projects",
        "evaluation_settings",
        "section_assignments",
        "teacher_assignments",
        "schedules",
        "user_assignments",
        "study_load",
        "grades",
        "teacher_evaluations",
        "feedbacks",
        "projects",
        "attendance_logs",
        "settings",
        "section_subjects",
      ];

      const records = {};
      const totals = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          if (isMissingRelation(error)) {
            records[table] = [];
            totals[table] = 0;
            continue;
          }
          throw formatSupabaseError(error, `Failed to read "${table}" for backup.`);
        }

        records[table] = data || [];
        totals[table] = (data || []).length;
      }

      const createdAt = new Date().toISOString();
      const payload = {
        created_at: createdAt,
        generated_by: {
          id: currentUser.id,
          username: currentUser.username || null,
          full_name: currentUser.full_name || null,
        },
        totals,
        records,
      };

      const serialized = JSON.stringify(payload, null, 2);
      const size = new TextEncoder().encode(serialized).length;
      const backupBlob = new Blob([serialized], { type: "application/json" });
      const stamp = createdAt.replace(/[:.]/g, "-");
      const filename = `backup_${stamp}.json`;
      const path = [BACKUP_PREFIX, filename].filter(Boolean).join("/");

      const { error: uploadError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(path, backupBlob, { contentType: "application/json", upsert: false });
      if (uploadError) {
        throw formatSupabaseError(uploadError, "Failed to upload backup to Supabase Storage.");
      }

      const { data: publicData } = supabase.storage.from(BACKUP_BUCKET).getPublicUrl(path);
      return {
        success: true,
        filename,
        size,
        created_at: createdAt,
        path,
        download_url: publicData?.publicUrl || null,
        totals,
      };
    }),

  getBackups: async () =>
    withApi(async () => {
      const files = await listStorageFilesRecursive(BACKUP_BUCKET, BACKUP_PREFIX);

      return files
        .filter((entry) => String(entry?.name || "").toLowerCase().endsWith(".json"))
        .map((entry) => {
          const path = entry.full_path;
          const { data: publicData } = supabase.storage.from(BACKUP_BUCKET).getPublicUrl(path);
          const createdAt = entry.created_at || entry.updated_at || null;
          return {
            filename: entry.name,
            path,
            size: parseNumber(entry?.metadata?.size, 0) || 0,
            created_at: createdAt,
            created: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : null,
            download_url: publicData?.publicUrl || null,
          };
        })
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }),

  getFeedbacks: async (status = "") =>
    withApi(async () => {
      let query = supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }

      const rows = data || [];
      const replierIds = rows.map((row) => row.replied_by).filter(Boolean);
      const repliers = await fetchUsersByIds(replierIds);

      return rows.map((row) => {
        const replier = row.replied_by ? repliers.get(row.replied_by) : null;
        return {
          id: row.id,
          message: row.message,
          category: row.category,
          status: row.status || "unread",
          reply: row.reply || null,
          replied_by_name: replier?.full_name || null,
          replied_by_role: replier?.role || null,
          replied_at: row.replied_at ? formatDateTime(row.replied_at) : null,
          created_at: row.created_at ? formatDateTime(row.created_at) : "",
        };
      });
    }),

  replyFeedback: async (id, replyText) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("feedbacks")
        .update({
          reply: String(replyText || "").trim(),
          replied_by: currentUser.id,
          replied_at: new Date().toISOString(),
          status: "replied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  getFeedbackStats: async () =>
    withApi(async () => {
      const [unread, replied] = await Promise.all([
        supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("status", "unread"),
        supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("status", "replied"),
      ]);

      if (unread.error || replied.error) {
        if (isMissingRelation(unread.error) || isMissingRelation(replied.error)) {
          return { unread: 0, replied: 0, total: 0 };
        }
        throw formatSupabaseError(unread.error || replied.error);
      }

      const unreadCount = unread.count || 0;
      const repliedCount = replied.count || 0;
      return {
        unread: unreadCount,
        replied: repliedCount,
        total: unreadCount + repliedCount,
      };
    }),
};

export const NotificationAPI = {
  getUnread: async (options: LooseRecord = {}) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const limitValue = Number(options?.limit);
      const limit = Number.isFinite(limitValue)
        ? Math.min(100, Math.max(1, Math.trunc(limitValue)))
        : 20;
      const fetchLimit = Math.min(400, Math.max(limit * 4, 40));

      const { data: notificationRows, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      if (notificationsError) {
        if (isMissingNotificationFeatureError(notificationsError)) return [];
        throw formatSupabaseError(notificationsError, "Failed to load notifications.");
      }

      const notifications = (notificationRows || []).map(mapNotification);
      if (!notifications.length) return [];

      const notificationIds = notifications
        .map((row) => parseNumber(row?.id, null))
        .filter(Boolean);
      if (!notificationIds.length) return [];

      const { data: readRows, error: readError } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", currentUser.id)
        .in("notification_id", notificationIds);

      if (readError) {
        if (isMissingNotificationFeatureError(readError)) {
          return notifications.slice(0, limit);
        }
        throw formatSupabaseError(readError, "Failed to load notification read status.");
      }

      const readSet = new Set(
        (readRows || [])
          .map((row) => parseNumber(row?.notification_id, null))
          .filter(Boolean),
      );

      return notifications
        .filter((notification) => !readSet.has(parseNumber(notification?.id, null)))
        .slice(0, limit);
    }, { silent: true }),

  markAsRead: async (notificationId) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const numericNotificationId = parseNumber(notificationId, null);
      if (!numericNotificationId) throw new Error("Invalid notification selected.");

      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          {
            notification_id: numericNotificationId,
            user_id: currentUser.id,
            read_at: new Date().toISOString(),
          },
          { onConflict: "notification_id,user_id" },
        );

      if (error && !isMissingNotificationFeatureError(error)) {
        throw formatSupabaseError(error, "Failed to mark notification as read.");
      }

      return { success: true };
    }, { silent: true }),

  markAllAsRead: async (options: LooseRecord = {}) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const limitValue = Number(options?.limit);
      const fetchLimit = Number.isFinite(limitValue)
        ? Math.min(2000, Math.max(20, Math.trunc(limitValue)))
        : 1000;

      const { data: notificationRows, error: notificationsError } = await supabase
        .from("notifications")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

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
        user_id: currentUser.id,
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

      return { success: true, marked_count: payloadRows.length };
    }, { silent: true }),

  subscribeToInbox: (onChange) => {
    if (typeof onChange !== "function") return () => {};

    const currentUser = readStoredUser();
    const currentUserId = parseNumber(currentUser?.id, null);
    if (!currentUserId) return () => {};

    const channelName = `notification-inbox-${currentUserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_reads",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => undefined);
    };
  },
};

const detectMissingColumn = (error) => {
  const message = String(error?.message || "");
  return (
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1] ||
    message.match(/could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)?.[1] ||
    null
  );
};

const safeInsertWithFallback = async (
  table: string,
  payload: LooseRecord,
  selectClause = "*",
): Promise<any> => {
  const mutable: LooseRecord = { ...payload };

  while (Object.keys(mutable).length > 0) {
    const { data, error } = await supabase
      .from(table)
      .insert(mutable)
      .select(selectClause)
      .single();

    if (!error) return data;

    const missingColumn = detectMissingColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(mutable, missingColumn)) {
      delete mutable[missingColumn];
      continue;
    }

    throw formatSupabaseError(error);
  }

  throw new Error(`No valid columns available for insert on ${table}.`);
};

const normalizeSemesterCode = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "1st";
  if (raw.includes("2") || raw.includes("second")) return "2nd";
  if (raw.includes("summer")) return "summer";
  return "1st";
};

const buildSemesterVariants = (value) => {
  const code = normalizeSemesterCode(value);
  if (code === "2nd") {
    return [
      "2nd",
      "2nd semester",
      "second semester",
      "second",
      "2nd_semester",
      "2nd-semester",
      "Second Semester",
      "2nd Semester",
    ];
  }
  if (code === "summer") {
    return ["summer", "Summer", "Summer Semester", "summer semester"];
  }
  return [
    "1st",
    "1st semester",
    "first semester",
    "first",
    "1st_semester",
    "1st-semester",
    "First Semester",
    "1st Semester",
  ];
};

const formatSemesterLabel = (value) => {
  const code = normalizeSemesterCode(value);
  if (code === "2nd") return "Second Semester";
  if (code === "summer") return "Summer";
  return "First Semester";
};

const getActiveAssignmentForUser = async (userId) => {
  await ensureAuthUidBoundForStoredUser();

  const { data, error } = await supabase
    .from("user_assignments")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingRelation(error)) return null;
    throw formatSupabaseError(error);
  }

  const rows = data || [];
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => {
    const priorityDiff = assignmentStatusPriority(a?.status) - assignmentStatusPriority(b?.status);
    if (priorityDiff !== 0) return priorityDiff;
    const updatedDiff = String(b?.updated_at || "").localeCompare(String(a?.updated_at || ""));
    if (updatedDiff !== 0) return updatedDiff;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  const activeLike = sorted.find((row) => !isInactiveAssignmentStatus(row?.status));
  return activeLike || sorted[0] || null;
};

const resolveSectionFromAssignment = async (assignment) => {
  if (!assignment) return null;
  return (
    (await findSection({
      sectionId: assignment.section_id,
      sectionName: assignment.section,
      year: assignment.year_level,
    })) || {
      id: assignment.section_id || null,
      section_name: assignment.section || "",
      grade_level: normalizeYearLevel(assignment.year_level),
      school_year: assignment.school_year || currentSchoolYear(),
      course: assignment.department || null,
      major: assignment.major || null,
    }
  );
};

const resolveSectionRoomDetails = async (sectionId) => {
  if (!sectionId) {
    return { building: null, room: null, floor: null };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("section_assignments")
    .select("*")
    .eq("section_id", sectionId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assignmentError) {
    if (isMissingRelation(assignmentError)) {
      return { building: null, room: null, floor: null };
    }
    throw formatSupabaseError(assignmentError);
  }

  if (!assignment) return { building: null, room: null, floor: null };

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", assignment.building_id)
    .limit(1)
    .maybeSingle();
  if (buildingError && !isMissingRelation(buildingError)) {
    throw formatSupabaseError(buildingError);
  }

  return {
    building: building?.building_name || null,
    room: assignment.room_number ?? null,
    floor: assignment.floor_number ?? null,
  };
};

const tryParseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

export const StudentAPI = {
  requestProfilePictureUpdate: async (note = null) =>
    withApi(async () => {
      const { data, error } = await supabase.rpc("app_request_profile_picture_update", {
        p_image_path: null,
        p_note: note == null ? null : String(note).trim() || null,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_request_profile_picture_update")) {
          throw new Error(
            "Profile picture request RPC is missing. Run the latest supabase.txt to enable this approval workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to submit profile picture request.");
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row || null;
    }),

  completeApprovedProfilePictureUpdate: async (imageFile) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const previousAvatarPath = normalizeAvatarPathForUser(currentUser.id, currentUser.image_path);
      const normalizedImage = normalizeImageUploadFile(imageFile, "profile.jpg");
      if (!normalizedImage) {
        throw new Error("Please select a valid image file.");
      }

      const storagePath = buildAvatarStoragePath(currentUser.id, normalizedImage.name);
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(storagePath, normalizedImage, { upsert: true });
      if (uploadError) {
        throw formatSupabaseError(uploadError, "Failed to upload profile picture.");
      }

      const { data, error } = await supabase.rpc("app_complete_approved_profile_picture_update", {
        p_image_path: storagePath,
      });

      if (error) {
        await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
        if (isMissingFunctionError(error, "app_complete_approved_profile_picture_update")) {
          throw new Error(
            "Approved profile picture RPC is missing. Run the latest supabase.txt to enable this workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to apply approved profile picture update.");
      }

      const value = Array.isArray(data) ? data[0] : data;
      let synced = null;
      if (typeof value === "boolean") {
        synced = value;
      } else if (value && typeof value === "object") {
        if (typeof value.app_complete_approved_profile_picture_update === "boolean") {
          synced = value.app_complete_approved_profile_picture_update;
        } else if (typeof value.success === "boolean") {
          synced = value.success;
        }
      }
      if (synced == null) {
        synced = toBoolean(value, false);
      }
      if (!synced) {
        throw new Error("Profile picture update was not completed. Please try again.");
      }

      if (previousAvatarPath && previousAvatarPath !== storagePath) {
        await removeAvatarPathIfOwned(currentUser.id, previousAvatarPath);
      }

      return true;
    }),

  requestPasswordReset: async (note = null) =>
    withApi(async () => {
      const { data, error } = await supabase.rpc("app_request_password_reset", {
        p_note: note == null ? null : String(note).trim() || null,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_request_password_reset")) {
          throw new Error(
            "Password reset request RPC is missing. Run the latest supabase.txt to enable request workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to submit password reset request.");
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row || null;
    }),

  getMyAccountRequests: async (limit = 20) =>
    withApi(async () => {
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(100, Math.trunc(Number(limit))))
        : 20;
      const { data, error } = await supabase.rpc("app_get_my_account_requests", {
        p_limit: safeLimit,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_get_my_account_requests")) {
          throw new Error(
            "Account request RPC is missing. Run the latest supabase.txt to enable request workflow.",
          );
        }
        throw formatSupabaseError(error, "Failed to load account requests.");
      }

      return (Array.isArray(data) ? data : data ? [data] : []).map(mapAccountRequest);
    }),

  completeApprovedPasswordReset: async (newPassword) =>
    withApi(async () => {
      const password = String(newPassword || "");
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const { data, error } = await supabase.rpc("app_complete_approved_password_reset", {
        p_new_password: password,
      });

      if (error) {
        if (isMissingFunctionError(error, "app_complete_approved_password_reset")) {
          throw new Error(
            "Approved reset RPC is missing. Run the latest supabase.txt to enable approved password reset.",
          );
        }
        throw formatSupabaseError(error, "Failed to reset password.");
      }

      const value = Array.isArray(data) ? data[0] : data;

      // Support scalar and object RPC return formats from PostgREST.
      let synced = null;
      if (typeof value === "boolean") {
        synced = value;
      } else if (value && typeof value === "object") {
        if (typeof value.app_complete_approved_password_reset === "boolean") {
          synced = value.app_complete_approved_password_reset;
        } else if (typeof value.auth_synced === "boolean") {
          synced = value.auth_synced;
        } else if (typeof value.success === "boolean") {
          synced = value.success;
        }
      }

      if (synced == null) {
        synced = toBoolean(value, false);
      }

      if (!synced) {
        throw new Error(
          "Password reset was not fully applied. Run the latest supabase.txt and try again.",
        );
      }

      // Best-effort session sync: RPC already updates auth.users securely.
      // Some legacy/stale sessions are not eligible for updateUser and should not fail the flow.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        const { error: authUpdateError } = await supabase.auth.updateUser({ password });
        if (authUpdateError) {
          console.warn(
            "Password reset RPC succeeded, but auth.updateUser failed for current session:",
            authUpdateError,
          );
        }
      }

      return true;
    }),

  getAssignment: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return null;

      const section = await resolveSectionFromAssignment(assignment);
      const sectionId = section?.id || assignment.section_id || null;
      const sectionName = section?.section_name || assignment.section || "";
      const roomInfo = await resolveSectionRoomDetails(sectionId);

      const usersMap = await fetchUsersByIds([currentUser.id]);
      const user = usersMap.get(currentUser.id);
      const yearLevel = normalizeYearLevel(assignment.year_level || section?.grade_level);
      const department = assignment.department || section?.course || null;
      const major = assignment.major || section?.major || null;

      return {
        id: assignment.id,
        year: yearLevel,
        year_level: yearLevel,
        grade_level: yearLevel,
        section: sectionName,
        section_name: sectionName,
        section_id: sectionId,
        section_full_name: sectionName,
        section_code: sectionName,
        school_id: user?.school_id || currentUser?.school_id || null,
        section_course: department,
        department,
        major,
        payment: assignment.payment || "paid",
        amount_lacking: assignment.amount_lacking,
        sanctions: assignment.sanctions,
        sanction_reason: assignment.sanction_reason || "",
        student_status: assignment.student_status || "Regular",
        semester: assignment.semester || "1st Semester",
        school_year: section?.school_year || assignment.school_year || currentSchoolYear(),
        gender:
          assignment?.gender ||
          user?.gender ||
          currentUser?.gender ||
          currentUser?.sex ||
          null,
        building: roomInfo.building,
        floor: roomInfo.floor,
        room: roomInfo.room,
      };
    }),

  getStudyLoad: async (semester = "all") =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return [];

      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id && !section?.section_name) return [];

      let query = supabase.from("study_load").select("*");
      if (section?.id) {
        query = query.eq("section_id", section.id);
      } else {
        query = query.eq("section", section.section_name);
      }

      const { data, error } = await query.order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);

      let rows = data || [];
      if (semester && String(semester).toLowerCase() !== "all") {
        const variants = buildSemesterVariants(semester).map((item) => item.toLowerCase());
        rows = rows.filter((row) => {
          const raw = String(row.semester || "").trim().toLowerCase();
          if (!raw) return true;
          return variants.includes(raw);
        });
      }

      return rows.map((row) => ({
        ...row,
        subject_code: row.subject_code || "",
        subject_title: row.subject_title || "",
        units: parseNumber(row.units, 0),
        semester: formatSemesterLabel(row.semester),
        teacher: row.teacher || "TBA",
      }));
    }),

  getGrades: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);

      const [subjectsMap, sectionsMap, teachersMap] = await Promise.all([
        fetchSubjectsByIds(subjectIds),
        fetchSectionsByIds(sectionIds),
        fetchUsersByIds(teacherIds),
      ]);

      return rows.map((row) => {
        const subject = subjectsMap.get(row.subject_id);
        const section = sectionsMap.get(row.section_id);
        const teacher = teachersMap.get(row.teacher_id);
        return {
          id: row.id,
          subject_code: subject?.subject_code || row.subject_code || "",
          subject_name: subject?.subject_name || row.subject_name || "",
          subject: subject?.subject_name || row.subject_name || "",
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
          final_grade: row.final_grade,
          remarks: row.remarks,
          semester: formatSemesterLabel(row.semester),
          school_year: row.school_year,
          year: normalizeYearLevel(section?.grade_level),
          instructor: teacher?.full_name || teacher?.username || null,
        };
      });
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);

      const { data, error } = await supabase.from("announcements").select("*");
      if (error) throw formatSupabaseError(error);

      const department = String(assignment?.department || "").trim();
      const yearLevel = normalizeYearLevel(assignment?.year_level || "");
      const now = new Date();
      const priorityOrder = { high: 3, medium: 2, low: 1 };

      const filtered = (data || [])
        .filter((row) => {
          const targetRole = String(row.target_role || "all").toLowerCase();
          if (!["all", "student"].includes(targetRole)) return false;
          if (!toBoolean(row.is_published, true)) return false;
          if (row.expires_at) {
            const expiresAt = new Date(row.expires_at);
            if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= now) return false;
          }

          const rowDepartment = String(row.department || "").trim();
          if (rowDepartment && department && rowDepartment !== department) return false;

          const rowYear = normalizeYearLevel(row.year);
          if (rowYear && yearLevel && rowYear !== yearLevel) return false;

          return true;
        })
        .map(mapAnnouncement)
        .sort((a, b) => {
          const prioDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (prioDiff !== 0) return prioDiff;
          return String(b.published_at || b.created_at || "").localeCompare(
            String(a.published_at || a.created_at || ""),
          );
        });

      return filtered;
    }),

  getProjects: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return [];
      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("section_id", section.id)
        .order("due_date", { ascending: true });
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }
      return (data || []).map(mapProject);
    }),

  getCampusProjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapProject);
    }),

  getEvaluationSettings: async () =>
    withApi(async () => {
      const { data, error } = await supabase.from("evaluation_settings").select("*");
      if (error) {
        if (isMissingRelation(error)) {
          return { enabled: true, template: null };
        }
        throw formatSupabaseError(error);
      }

      const byKey = new Map();
      (data || []).forEach((row) => byKey.set(row.setting_key, row.setting_value));

      const enabledValue = byKey.get("enabled") ?? byKey.get("evaluation_enabled");
      const templateRaw = byKey.get("template");

      return {
        enabled: toBoolean(enabledValue, true),
        template: tryParseJson(templateRaw),
      };
    }),

  getEvaluationTeachers: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return { teachers: [] };

      const section = await resolveSectionFromAssignment(assignment);
      const scopedSectionName = String(section?.section_name || assignment?.section || "").trim();
      const scopedSectionPattern = buildContainsPattern(scopedSectionName);
      if (!section?.id && !scopedSectionName) return { teachers: [] };

      const rowsByKey = new Map();
      const scheduleSubjectCodes = new Set();
      const subjectCodesByAssignmentId = new Map();

      const addAssignmentRow = (row) => {
        if (!row) return;
        const key =
          row.id != null
            ? `id:${row.id}`
            : `teacher:${row.teacher_id || "null"}|subject:${row.subject_id || "null"}|section:${row.section_id || row.section || ""}`;
        if (!rowsByKey.has(key)) {
          rowsByKey.set(key, {
            ...row,
            schedule_subject_codes: [],
          });
        }
      };

      if (section?.id) {
        const { data: schedules, error: schedulesError } = await supabase
          .from("schedules")
          .select("teacher_assignment_id,subject_code")
          .eq("section_id", section.id);
        if (schedulesError && !isMissingRelation(schedulesError)) {
          throw formatSupabaseError(schedulesError);
        }

        const scheduleRows = schedules || [];
        scheduleRows.forEach((row) => {
          const code = String(row?.subject_code || "").trim();
          if (code) scheduleSubjectCodes.add(code);

          const assignmentId = row?.teacher_assignment_id;
          if (!assignmentId || !code) return;
          if (!subjectCodesByAssignmentId.has(assignmentId)) {
            subjectCodesByAssignmentId.set(assignmentId, new Set());
          }
          subjectCodesByAssignmentId.get(assignmentId).add(code);
        });

        const assignmentIds = Array.from(subjectCodesByAssignmentId.keys());
        if (assignmentIds.length > 0) {
          const { data: teacherAssignments, error: assignmentError } = await supabase
            .from("teacher_assignments")
            .select("*")
            .in("id", assignmentIds)
            .eq("status", "active");
          if (assignmentError) {
            if (!isMissingRelation(assignmentError)) {
              throw formatSupabaseError(assignmentError);
            }
          } else {
            (teacherAssignments || []).forEach(addAssignmentRow);
          }
        }
      }

      const fallbackQueries = [];
      if (section?.id) {
        fallbackQueries.push(
          supabase
            .from("teacher_assignments")
            .select("*")
            .eq("status", "active")
            .eq("section_id", section.id),
        );
      }
      if (scopedSectionName) {
        fallbackQueries.push(
          supabase
            .from("teacher_assignments")
            .select("*")
            .eq("status", "active")
            .ilike("section", scopedSectionPattern || scopedSectionName),
        );
      }

      if (fallbackQueries.length > 0) {
        const fallbackResults = await Promise.all(fallbackQueries);
        fallbackResults.forEach((result) => {
          if (result?.error) {
            if (isMissingRelation(result.error)) return;
            throw formatSupabaseError(result.error);
          }
          (result?.data || []).forEach(addAssignmentRow);
        });
      }

      const rows = Array.from(rowsByKey.values()).map((row) => ({
        ...row,
        schedule_subject_codes: Array.from(subjectCodesByAssignmentId.get(row.id) || new Set()),
      }));

      if (!rows.length) return { teachers: [] };

      const teacherIds = Array.from(new Set(rows.map((row) => row.teacher_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id).filter(Boolean)));
      if (!teacherIds.length) return { teachers: [] };

      const [teachersMap, subjectsMap, scheduleSubjectsResult] = await Promise.all([
        fetchUsersByIds(teacherIds),
        fetchSubjectsByIds(subjectIds),
        scheduleSubjectCodes.size > 0
          ? supabase.from("subjects").select("*").in("subject_code", Array.from(scheduleSubjectCodes))
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (scheduleSubjectsResult.error) {
        throw formatSupabaseError(scheduleSubjectsResult.error);
      }

      const subjectsByCode = new Map();
      (scheduleSubjectsResult.data || []).forEach((row) => {
        const mapped = mapSubject(row);
        if (mapped?.subject_code) {
          subjectsByCode.set(mapped.subject_code, mapped);
        }
      });

      let evaluatedIds = new Set();
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("teacher_evaluations")
        .select("teacher_id")
        .eq("student_id", currentUser.id)
        .in("teacher_id", teacherIds);
      if (!evaluationsError) {
        evaluatedIds = new Set((evaluations || []).map((row) => row.teacher_id));
      } else if (!isMissingRelation(evaluationsError)) {
        throw formatSupabaseError(evaluationsError);
      }

      const grouped = new Map();
      rows.forEach((row) => {
        const teacherId = parseNumber(row?.teacher_id, null);
        if (!teacherId) return;

        const teacher = teachersMap.get(teacherId);
        const fallbackTeacherName =
          String(row?.teacher_name || "").trim() ||
          String(row?.teacher_username || "").trim() ||
          `Teacher #${teacherId}`;

        if (!grouped.has(teacherId)) {
          grouped.set(teacherId, {
            id: teacherId,
            name: teacher?.full_name || teacher?.username || fallbackTeacherName,
            image_path: teacher?.image_path || row?.image_path || DEFAULT_AVATAR,
            subjects: [],
            evaluated: evaluatedIds.has(teacherId),
          });
        }

        const current = grouped.get(teacherId);
        const upsertSubject = (subjectCodeValue = "", subjectTitleValue = "") => {
          const code = String(subjectCodeValue || "").trim();
          const title = String(subjectTitleValue || "").trim();
          if (!code && !title) return;
          const exists = current.subjects.some(
            (entry) => entry.code === code && entry.title === title,
          );
          if (!exists) {
            current.subjects.push({
              code,
              title,
            });
          }
        };

        const subject = subjectsMap.get(row.subject_id);
        upsertSubject(
          subject?.subject_code || row.subject_code || "",
          subject?.subject_name || row.subject_title || "",
        );

        const scheduleCodes = Array.isArray(row.schedule_subject_codes)
          ? row.schedule_subject_codes
          : [];
        scheduleCodes.forEach((code) => {
          const matchedSubject = subjectsByCode.get(code);
          upsertSubject(
            matchedSubject?.subject_code || code,
            matchedSubject?.subject_name || code,
          );
        });
      });

      return { teachers: Array.from(grouped.values()) };
    }),

  getEvaluation: async (teacherId) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const parsedTeacherId = parseNumber(teacherId, null);
      if (!parsedTeacherId) {
        return { success: false, message: "Invalid teacher id." };
      }

      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("*")
        .eq("student_id", currentUser.id)
        .eq("teacher_id", parsedTeacherId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isMissingRelation(error)) {
          return { success: false, message: "Evaluation table is not configured." };
        }
        throw formatSupabaseError(error);
      }

      if (!data) {
        return { success: false, message: "Evaluation not found." };
      }

      const parsedPayload =
        tryParseJson(data.ratings_json) ||
        tryParseJson(data.response_payload) ||
        {};
      const ratings =
        parsedPayload?.ratings && typeof parsedPayload.ratings === "object"
          ? { ...parsedPayload.ratings }
          : {};

      if (Object.keys(ratings).length === 0) {
        if (data.rating_teaching_quality != null) ratings.part1_q1 = Number(data.rating_teaching_quality);
        if (data.rating_communication != null) ratings.part1_q2 = Number(data.rating_communication);
        if (data.rating_preparation != null) ratings.part1_q3 = Number(data.rating_preparation);
        if (data.rating_responsiveness != null) ratings.part1_q4 = Number(data.rating_responsiveness);
        if (data.rating_overall != null) ratings.part2_q1 = Number(data.rating_overall);
        if (data.satisfaction_rating != null) ratings.satisfaction_rating = Number(data.satisfaction_rating);
        if (data.recommend_teacher) ratings.recommend_teacher = data.recommend_teacher;
      }

      return {
        success: true,
        data: {
          student_status: data.student_status || parsedPayload.student_status || "",
          student_gender: data.student_gender || parsedPayload.student_gender || "",
          comments: parsedPayload.comments ?? data.comments ?? "",
          ratings,
        },
      };
    }),

  submitEvaluation: async (formLike) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const input =
        formLike instanceof FormData ? Object.fromEntries(formLike.entries()) : { ...(formLike || {}) };

      const teacherId = parseNumber(input.teacher_id, null);
      if (!teacherId) {
        return { success: false, message: "Teacher is required." };
      }

      const { data: existing, error: existingError } = await supabase
        .from("teacher_evaluations")
        .select("id")
        .eq("student_id", currentUser.id)
        .eq("teacher_id", teacherId)
        .limit(1);
      if (existingError && !isMissingRelation(existingError)) {
        throw formatSupabaseError(existingError);
      }
      if ((existing || []).length > 0) {
        return { success: false, message: "You have already evaluated this teacher." };
      }

      const assignment = await getActiveAssignmentForUser(currentUser.id);
      const section = await resolveSectionFromAssignment(assignment);

      const subjectText = String(input.subject || "")
        .split(",")[0]
        .trim();
      const subjectCode = subjectText.includes(" - ")
        ? subjectText.split(" - ")[0].trim()
        : subjectText;
      const subject = await findSubjectByCode(subjectCode);

      const ratings: LooseRecord = {};
      Object.keys(input).forEach((key) => {
        if (/^part\d+_q\d+$/i.test(key) || key === "satisfaction_rating" || key === "recommend_teacher") {
          ratings[key] = input[key];
        }
      });

      const scaleRatings = Object.entries(ratings)
        .filter(([key]) => /^part\d+_q\d+$/i.test(key))
        .map(([, value]) => parseNumber(value, null))
        .filter((value) => value != null && value >= 1 && value <= 5);

      const ratingOverall = scaleRatings.length
        ? Number((scaleRatings.reduce((sum, value) => sum + value, 0) / scaleRatings.length).toFixed(2))
        : parseNumber(ratings.satisfaction_rating, null);

      const payload = {
        teacher_id: teacherId,
        student_id: currentUser.id,
        subject_id: subject?.id || null,
        school_year: assignment?.school_year || section?.school_year || currentSchoolYear(),
        semester: assignment?.semester || "1st Semester",
        rating_teaching_quality: parseNumber(ratings.part1_q1, null),
        rating_communication: parseNumber(ratings.part1_q2, null),
        rating_preparation: parseNumber(ratings.part1_q3, null),
        rating_responsiveness: parseNumber(ratings.part1_q4, null),
        rating_overall: ratingOverall,
        comments: input.comments || "",
        is_anonymous: 1,
        student_status: input.student_status || null,
        student_gender: input.student_gender || null,
        satisfaction_rating: parseNumber(ratings.satisfaction_rating, null),
        recommend_teacher: ratings.recommend_teacher || null,
        ratings_json: JSON.stringify({
          ratings,
          comments: input.comments || "",
          student_status: input.student_status || null,
          student_gender: input.student_gender || null,
        }),
        response_payload: JSON.stringify({
          ratings,
          comments: input.comments || "",
          student_status: input.student_status || null,
          student_gender: input.student_gender || null,
        }),
        created_at: new Date().toISOString(),
      };

      await safeInsertWithFallback("teacher_evaluations", payload);
      return { success: true, message: "Evaluation submitted successfully." };
    }),

  submitFeedback: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const message = String(payload?.message || "").trim();
      if (!message) throw new Error("Feedback message is required.");

      const normalizedMap = {
        suggestion: "Suggestion",
        complaint: "Complaint",
        inquiry: "Inquiry",
        shoutout: "Shoutout",
        academic: "Academic",
        facilities: "Facilities",
        service: "Service",
        other: "Other",
      };
      const rawCategory = String(payload?.category || "Other")
        .trim()
        .toLowerCase();
      const category = normalizedMap[rawCategory] || payload?.category || "Other";

      const inserted = await safeInsertWithFallback("feedbacks", {
        student_id: currentUser.id,
        message,
        category,
        status: "unread",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, "id");

      return {
        success: true,
        id: inserted?.id || null,
      };
    }),

  getMyFeedbacks: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }

      const rows = data || [];
      const replierIds = rows.map((row) => row.replied_by).filter(Boolean);
      const repliers = await fetchUsersByIds(replierIds);

      return rows.map((row) => {
        const replier = row.replied_by ? repliers.get(row.replied_by) : null;
        return {
          id: row.id,
          message: row.message,
          category: row.category,
          reply: row.reply || null,
          replied_by_name: replier?.full_name || null,
          replied_by_role: replier?.role || null,
          status: row.status || "unread",
          created_at: row.created_at ? formatDateTime(row.created_at) : "",
          replied_at: row.replied_at ? formatDateTime(row.replied_at) : null,
        };
      });
    }),
};

export const TeacherAPI = {
  getSchedule: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });
      if (assignmentsError) throw formatSupabaseError(assignmentsError);

      let assignmentIds = Array.from(
        new Set(
          (assignments || [])
            .filter((row) => !isInactiveAssignmentStatus(row?.status))
            .map((row) => row.id)
            .filter(Boolean),
        ),
      );
      if (!assignmentIds.length) {
        assignmentIds = Array.from(new Set((assignments || []).map((row) => row.id).filter(Boolean)));
      }
      if (!assignmentIds.length) return [];

      const { data: schedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .in("teacher_assignment_id", assignmentIds);
      if (schedulesError) throw formatSupabaseError(schedulesError);

      return mapScheduleRows(schedules || []);
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const now = new Date();
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const { data, error } = await supabase.from("announcements").select("*");
      if (error) throw formatSupabaseError(error);

      return (data || [])
        .filter((row) => {
          const targetRole = String(row.target_role || "all").toLowerCase();
          if (!["all", "teacher"].includes(targetRole)) return false;
          if (!toBoolean(row.is_published, true)) return false;
          if (!row.expires_at) return true;
          const expiresAt = new Date(row.expires_at);
          if (Number.isNaN(expiresAt.getTime())) return true;
          return expiresAt > now;
        })
        .map(mapAnnouncement)
        .sort((a, b) => {
          const prioDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (prioDiff !== 0) return prioDiff;
          return String(b.published_at || b.created_at || "").localeCompare(
            String(a.published_at || a.created_at || ""),
          );
        });
    }),

  createAnnouncement: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: payload?.title || "",
          content: payload?.content || "",
          year: payload?.year || null,
          department: payload?.department || null,
          major: payload?.major || null,
          author_id: currentUser.id,
          target_role: payload?.target_role || "teacher",
          priority: payload?.priority || "medium",
          is_published: payload?.is_published == null ? 1 : payload.is_published,
          published_at: payload?.published_at || new Date().toISOString(),
          expires_at: payload?.expires_at || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      const mapped = mapAnnouncement(data);
      await createUserNotification({
        action: "announcement_created",
        category: "announcement",
        target_role: normalizeNotificationTargetRole(mapped?.target_role || payload?.target_role) || "all",
        title: `New announcement: ${mapped?.title || "Campus update"}`,
        message: mapped?.content || "A new announcement has been posted.",
        metadata: {
          announcement_id: mapped?.id || null,
          priority: mapped?.priority || payload?.priority || "medium",
          target_role: mapped?.target_role || payload?.target_role || "all",
        },
      });

      return mapped;
    }),

  deleteAnnouncement: async (id) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const currentRoles = normalizeRoles(currentUser.roles, currentUser.role);

      let query = supabase.from("announcements").delete().eq("id", id);
      if (!currentRoles.includes("admin")) {
        query = query.eq("author_id", currentUser.id);
      }

      const { error } = await query;
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getProjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }
      return (data || []).map(mapProject);
    }),

  createProject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .insert({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Planned",
          budget: payload?.budget || null,
          start_date: payload?.start_date || payload?.started || null,
          description: payload?.description || null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  updateProject: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .update({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Planned",
          budget: payload?.budget || null,
          start_date: payload?.start_date || payload?.started || null,
          description: payload?.description || null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  deleteProject: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("campus_projects").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getGrades: async (params: LooseRecord = {}) =>
    withApi(async () => {
      const section = await findSection({
        sectionId: params?.section_id,
        sectionName: params?.section,
      });
      const subject = await findSubjectByCode(params?.subject);
      if (!section?.id || !subject?.id) return {};

      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("section_id", section.id)
        .eq("subject_id", subject.id);
      if (error) throw formatSupabaseError(error);

      return (data || []).reduce((acc, row) => {
        acc[row.student_id] = {
          student_id: row.student_id,
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
        };
        return acc;
      }, {});
    }),

  getTeacherSubjects: async () => TeacherAPI.getSections(),

  getSections: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("id,status")
        .eq("teacher_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw formatSupabaseError(error);

      let assignmentIds = Array.from(
        new Set(
          (data || [])
            .filter((row) => !isInactiveAssignmentStatus(row?.status))
            .map((row) => row.id)
            .filter(Boolean),
        ),
      );
      if (!assignmentIds.length) {
        assignmentIds = Array.from(new Set((data || []).map((row) => row.id).filter(Boolean)));
      }
      if (!assignmentIds.length) return [];

      const { data: scheduleRows, error: scheduleError } = await supabase
        .from("schedules")
        .select("*")
        .in("teacher_assignment_id", assignmentIds);
      if (scheduleError) throw formatSupabaseError(scheduleError);

      const mappedSchedules = await mapScheduleRows(scheduleRows || []);
      const grouped = new Map();
      mappedSchedules.forEach((row) => {
        const sectionName = String(row.section || "").trim();
        if (!sectionName) return;

        const key = row.section_id ? `id:${row.section_id}` : `name:${sectionName.toLowerCase()}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: row.section_id || null,
            name: sectionName,
            section_name: sectionName,
            year_level: row.year || "",
            grade_level: row.year || "",
            course: null,
            major: null,
            school_year: currentSchoolYear(),
            subjects: [],
            schedule_count: 0,
          });
        }

        const bucket = grouped.get(key);
        bucket.schedule_count += 1;

        const subjectCode = String(row.subject || "").trim();
        if (!subjectCode) return;

        if (!bucket.subjects.some((item) => item.code === subjectCode)) {
          bucket.subjects.push({
            id: row.subject_id || null,
            code: subjectCode,
            name: row.subject_title || subjectCode,
          });
        }
      });

      return Array.from(grouped.values())
        .filter((item) => item.name && item.subjects.length > 0)
        .sort((a, b) => {
          const yearA = Number.parseInt(String(a.year_level || "").replace(/\D+/g, ""), 10);
          const yearB = Number.parseInt(String(b.year_level || "").replace(/\D+/g, ""), 10);
          const normalizedYearA = Number.isFinite(yearA) ? yearA : 999;
          const normalizedYearB = Number.isFinite(yearB) ? yearB : 999;
          if (normalizedYearA !== normalizedYearB) return normalizedYearA - normalizedYearB;
          return String(a.name || "").localeCompare(String(b.name || ""));
        });
    }),

  createGrade: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const studentId = parseNumber(payload?.student_id, null);
      if (!studentId) throw new Error("Student is required.");

      const subject = await findSubjectByCode(payload?.subject);
      if (!subject) throw new Error("Subject not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section?.id) throw new Error("Section not found.");

      const { data: myAssignments, error: myAssignmentsError } = await supabase
        .from("teacher_assignments")
        .select("id,section_id,subject_id,status")
        .eq("teacher_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });
      if (myAssignmentsError) throw formatSupabaseError(myAssignmentsError);

      let myAssignmentIds = Array.from(
        new Set(
          (myAssignments || [])
            .filter((row) => !isInactiveAssignmentStatus(row?.status))
            .map((row) => row.id)
            .filter(Boolean),
        ),
      );
      if (!myAssignmentIds.length) {
        myAssignmentIds = Array.from(new Set((myAssignments || []).map((row) => row.id).filter(Boolean)));
      }
      if (!myAssignmentIds.length) {
        throw new Error("You can only grade sections and subjects that are assigned to your schedule.");
      }

      const { data: activeSchedules, error: activeSchedulesError } = await supabase
        .from("schedules")
        .select("id")
        .eq("section_id", section.id)
        .eq("subject_code", subject.subject_code)
        .in("teacher_assignment_id", myAssignmentIds)
        .limit(1);
      if (activeSchedulesError) throw formatSupabaseError(activeSchedulesError);

      const hasDirectTeacherAssignment = (myAssignments || []).some((row) => {
        if (!row) return false;
        if (row.subject_id !== subject.id) return false;
        if (row.section_id == null) return false;
        return Number(row.section_id) === Number(section.id);
      });

      if (!(activeSchedules || []).length && !hasDirectTeacherAssignment) {
        throw new Error("No active schedule found for this section and subject.");
      }

      const gradeableStudents = await TeacherAPI.getStudentsBySection({
        sectionId: section.id,
        sectionName: section.section_name || section.section || payload?.section || "",
        subjectCode: subject.subject_code,
      });
      const isStudentInMasterList = (gradeableStudents || []).some(
        (row) => Number(row?.id) === Number(studentId),
      );
      if (!isStudentInMasterList) {
        throw new Error("Student is not in the selected section/subject master list.");
      }

      const schoolYear = section.school_year || currentSchoolYear();
      const semester = normalizeSemester(subject.semester || payload?.semester || "1st Semester");

      const { data: existing, error: existingError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .eq("subject_id", subject.id)
        .eq("section_id", section.id)
        .eq("school_year", schoolYear)
        .eq("semester", semester)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      const prelimGrade = parseGradePoint(payload?.prelim, "Prelim grade");
      const midtermGrade = parseGradePoint(payload?.midterm, "Midterm grade");
      const finalsGrade = parseGradePoint(payload?.finals, "Finals grade");

      const gradePayload = {
        student_id: studentId,
        subject_id: subject.id,
        teacher_id: currentUser.id,
        section_id: section.id,
        school_year: schoolYear,
        semester,
        prelim_grade: prelimGrade,
        midterm_grade: midtermGrade,
        finals_grade: finalsGrade,
        updated_at: new Date().toISOString(),
      };
      const actor = describeCurrentActor();
      const gradeSummaryParts = [];
      if (prelimGrade != null) gradeSummaryParts.push(`Prelim ${prelimGrade.toFixed(1)}`);
      if (midtermGrade != null) gradeSummaryParts.push(`Midterm ${midtermGrade.toFixed(1)}`);
      if (finalsGrade != null) gradeSummaryParts.push(`Finals ${finalsGrade.toFixed(1)}`);
      const gradeSummary = gradeSummaryParts.join(", ");

      if (existing) {
        const { data, error } = await supabase
          .from("grades")
          .update(gradePayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);

        await createUserNotification({
          action: "grade_updated",
          category: "grade",
          target_user_id: studentId,
          title: `Grade updated: ${subject.subject_code || subject.subject_name || "Subject"}`,
          message: `${subject.subject_name || subject.subject_code || "Subject"} (${semester}) updated by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
          metadata: {
            grade_id: data?.id || existing.id,
            subject_id: subject.id,
            subject_code: subject.subject_code || null,
            subject_name: subject.subject_name || null,
            section_id: section.id,
            section: section.section_name || section.section || null,
            school_year: schoolYear,
            semester,
            prelim_grade: prelimGrade,
            midterm_grade: midtermGrade,
            finals_grade: finalsGrade,
          },
        });

        return data;
      }

      const { data, error } = await supabase
        .from("grades")
        .insert({
          ...gradePayload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await createUserNotification({
        action: "grade_created",
        category: "grade",
        target_user_id: studentId,
        title: `New grade uploaded: ${subject.subject_code || subject.subject_name || "Subject"}`,
        message: `${subject.subject_name || subject.subject_code || "Subject"} (${semester}) uploaded by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
        metadata: {
          grade_id: data?.id || null,
          subject_id: subject.id,
          subject_code: subject.subject_code || null,
          subject_name: subject.subject_name || null,
          section_id: section.id,
          section: section.section_name || section.section || null,
          school_year: schoolYear,
          semester,
          prelim_grade: prelimGrade,
          midterm_grade: midtermGrade,
          finals_grade: finalsGrade,
        },
      });

      return data;
    }),

  updateGrade: async (id, payload) =>
    withApi(async () => {
      const prelimGrade = parseGradePoint(payload?.prelim, "Prelim grade");
      const midtermGrade = parseGradePoint(payload?.midterm, "Midterm grade");
      const finalsGrade = parseGradePoint(payload?.finals, "Finals grade");

      const { data, error } = await supabase
        .from("grades")
        .update({
          prelim_grade: prelimGrade,
          midterm_grade: midtermGrade,
          finals_grade: finalsGrade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      const subjectMap = await fetchSubjectsByIds([data?.subject_id]);
      const sectionMap = await fetchSectionsByIds([data?.section_id]);
      const subject = subjectMap.get(data?.subject_id);
      const section = sectionMap.get(data?.section_id);
      const actor = describeCurrentActor();
      const gradeSummaryParts = [];
      if (prelimGrade != null) gradeSummaryParts.push(`Prelim ${prelimGrade.toFixed(1)}`);
      if (midtermGrade != null) gradeSummaryParts.push(`Midterm ${midtermGrade.toFixed(1)}`);
      if (finalsGrade != null) gradeSummaryParts.push(`Finals ${finalsGrade.toFixed(1)}`);
      const gradeSummary = gradeSummaryParts.join(", ");

      await createUserNotification({
        action: "grade_updated",
        category: "grade",
        target_user_id: data?.student_id || null,
        title: `Grade updated: ${subject?.subject_code || subject?.subject_name || "Subject"}`,
        message: `${subject?.subject_name || subject?.subject_code || "Subject"} grade updated by ${actor.label}${gradeSummary ? `: ${gradeSummary}` : "."}`,
        metadata: {
          grade_id: data?.id || id,
          subject_id: data?.subject_id || null,
          subject_code: subject?.subject_code || null,
          subject_name: subject?.subject_name || null,
          section_id: data?.section_id || null,
          section: section?.section_name || null,
          school_year: data?.school_year || null,
          semester: data?.semester || null,
          prelim_grade: prelimGrade,
          midterm_grade: midtermGrade,
          finals_grade: finalsGrade,
        },
      });

      return data;
    }),

  deleteGrade: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getStudentsBySection: async (sectionInput, explicitSectionId = null, explicitSubjectCode = null) =>
    withApi(async () => {
      await ensureAuthUidBoundForStoredUser();

      const sectionInputObject = typeof sectionInput === "object" && sectionInput !== null
        ? sectionInput
        : null;
      const sectionName =
        sectionInputObject
          ? String(sectionInputObject?.sectionName || sectionInputObject?.name || "").trim()
          : String(sectionInput || "").trim();
      const sectionId =
        parseNumber(
          explicitSectionId ??
            (sectionInputObject ? sectionInputObject?.sectionId ?? sectionInputObject?.id : null),
          null,
        ) || null;
      const subjectCode = String(
        explicitSubjectCode ??
          (sectionInputObject ? sectionInputObject?.subjectCode ?? sectionInputObject?.subject : null) ??
          "",
      ).trim();

      if (!sectionName && !sectionId) return [];

      const section = await findSection({ sectionId, sectionName });
      const scopedSectionName = String(section?.section_name || sectionName || "").trim();
      const scopedSectionPattern = buildContainsPattern(scopedSectionName);
      if (!section?.id && !scopedSectionName) return [];

      if (subjectCode) {
        const { data: rpcStudents, error: rpcStudentsError } = await supabase.rpc(
          "app_get_teacher_grade_students",
          {
            p_section_id: section?.id || null,
            p_section_name: scopedSectionName || null,
            p_subject_code: subjectCode,
          },
        );

        if (!rpcStudentsError && Array.isArray(rpcStudents)) {
          return (rpcStudents || [])
            .map((row) => ({
              id: parseNumber(row?.id, null),
              username: String(row?.username || "").trim() || `student_${row?.id || "unknown"}`,
              full_name:
                String(row?.full_name || "").trim() ||
                String(row?.username || "").trim() ||
                `Student #${row?.id || "Unknown"}`,
              school_id:
                String(row?.school_id || "").trim() ||
                String(row?.username || "").trim() ||
                (row?.id != null ? String(row.id) : null),
              image_path: DEFAULT_AVATAR,
              role: "student",
              roles: ["student"],
              sub_role: null,
              sub_roles: [],
              student_status: normalizeStudentStatusValue(row?.student_status),
            }))
            .filter((row) => row.id != null)
            .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
        }

        if (
          rpcStudentsError &&
          !isMissingFunctionError(rpcStudentsError, "app_get_teacher_grade_students")
        ) {
          console.warn("app_get_teacher_grade_students failed, using fallback:", rpcStudentsError);
        }
      }

      const assignmentQueries = [];
      if (section?.id) {
        assignmentQueries.push(
          supabase
            .from("user_assignments")
            .select("*")
            .eq("section_id", section.id)
            .order("updated_at", { ascending: false })
            .order("id", { ascending: false }),
        );
      }
      if (scopedSectionName) {
        assignmentQueries.push(
          supabase
            .from("user_assignments")
            .select("*")
            .ilike("section", scopedSectionPattern || scopedSectionName)
            .order("updated_at", { ascending: false })
            .order("id", { ascending: false }),
        );
      }

      const assignmentRowsByKey = new Map();
      if (assignmentQueries.length > 0) {
        const assignmentResults = await Promise.all(assignmentQueries);
        assignmentResults.forEach((result) => {
          if (result?.error) throw formatSupabaseError(result.error);
          (result?.data || []).forEach((row) => {
            const key = row?.id != null ? `id:${row.id}` : `user:${row?.user_id ?? "null"}|section:${row?.section_id ?? row?.section ?? ""}`;
            if (!assignmentRowsByKey.has(key)) {
              assignmentRowsByKey.set(key, row);
            }
          });
        });
      }

      const assignmentByUserId = new Map();
      Array.from(assignmentRowsByKey.values())
        .sort((a, b) => {
          const priorityDiff = assignmentStatusPriority(a?.status) - assignmentStatusPriority(b?.status);
          if (priorityDiff !== 0) return priorityDiff;
          const updatedA = String(a?.updated_at || "");
          const updatedB = String(b?.updated_at || "");
          const updatedDiff = updatedB.localeCompare(updatedA);
          if (updatedDiff !== 0) return updatedDiff;
          return Number(b?.id || 0) - Number(a?.id || 0);
        })
        .forEach((row) => {
          const userId = parseNumber(row?.user_id, null);
          if (!userId || assignmentByUserId.has(userId)) return;
          if (isInactiveAssignmentStatus(row?.status)) return;
          assignmentByUserId.set(userId, row);
        });

      const baseAssignments = Array.from(assignmentByUserId.values());
      if (!baseAssignments.length) return [];
      const baseAssignmentByUserId = new Map(
        baseAssignments.map((row) => [parseNumber(row?.user_id, null), row]),
      );

      let filteredUserIds = baseAssignments.map((row) => row.user_id);

      if (subjectCode) {
        const subject = await findSubjectByCode(subjectCode);
        const normalizedSubjectCode = String(subject?.subject_code || subjectCode).trim();
        const selectClause = "id,student_id,section_id,section,subject_id,subject_code";

        const runStudyLoadQuery = async (queryBuilder) => {
          const scopedQueries = [];
          if (section?.id) {
            scopedQueries.push(queryBuilder(supabase.from("study_load").select(selectClause).eq("section_id", section.id)));
          }
          if (scopedSectionName) {
            scopedQueries.push(
              queryBuilder(
                supabase
                  .from("study_load")
                  .select(selectClause)
                  .ilike("section", scopedSectionPattern || scopedSectionName),
              ),
            );
          }
          if (!scopedQueries.length) return [];

          const scopedResults = await Promise.all(scopedQueries);
          const scopedRowsByKey = new Map();

          scopedResults.forEach((result) => {
            if (result?.error) {
              if (isMissingRelation(result.error)) return;
              throw formatSupabaseError(result.error);
            }

            (result?.data || []).forEach((row) => {
              const key =
                row?.id != null
                  ? `id:${row.id}`
                  : `sid:${row?.student_id ?? "null"}|sub:${row?.subject_id ?? row?.subject_code ?? ""}|section:${row?.section_id ?? row?.section ?? ""}`;
              if (!scopedRowsByKey.has(key)) {
                scopedRowsByKey.set(key, row);
              }
            });
          });

          return Array.from(scopedRowsByKey.values());
        };

        const [rowsBySubjectId, rowsBySubjectCode] = await Promise.all([
          subject?.id ? runStudyLoadQuery((query) => query.eq("subject_id", subject.id)) : Promise.resolve([]),
          normalizedSubjectCode
            ? runStudyLoadQuery((query) => query.ilike("subject_code", normalizedSubjectCode))
            : Promise.resolve([]),
        ]);

        const irregularStudentIdsForSubject = new Set(
          [...rowsBySubjectId, ...rowsBySubjectCode]
            .map((row) => parseNumber(row?.student_id, null))
            .filter(Boolean),
        );

        filteredUserIds = baseAssignments
          .filter((assignmentRow) => {
            const userId = parseNumber(assignmentRow?.user_id, null);
            if (!userId) return false;

            const studentStatus = normalizeStudentStatusValue(assignmentRow?.student_status).toLowerCase();
            if (studentStatus === "irregular") {
              return irregularStudentIdsForSubject.has(userId);
            }
            return true;
          })
          .map((assignmentRow) => assignmentRow.user_id);
      }

      const uniqueUserIds = Array.from(new Set(filteredUserIds.filter(Boolean)));
      if (!uniqueUserIds.length) return [];

      const usersMap = await fetchUsersByIds(uniqueUserIds);
      return uniqueUserIds
        .map((id) => {
          const user = usersMap.get(id);
          if (user) return user;

          const assignmentRow = baseAssignmentByUserId.get(parseNumber(id, null)) || {};
          const fallbackName =
            String(assignmentRow?.full_name || "").trim() ||
            String(assignmentRow?.student_name || "").trim() ||
            String(assignmentRow?.username || "").trim() ||
            `Student #${id}`;
          const fallbackUsername =
            String(assignmentRow?.username || "").trim() || `student_${id}`;

          return {
            id: parseNumber(id, null),
            username: fallbackUsername,
            full_name: fallbackName,
            school_id:
              String(assignmentRow?.school_id || "").trim() ||
              String(assignmentRow?.student_school_id || "").trim() ||
              String(assignmentRow?.username || "").trim() ||
              (id != null ? String(id) : null),
            image_path: assignmentRow?.image_path || DEFAULT_AVATAR,
            role: "student",
            roles: ["student"],
            sub_role: null,
            sub_roles: [],
          };
        })
        .filter(Boolean)
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    }),

  getEvaluationStatistics: async (semester) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("*")
        .eq("teacher_id", currentUser.id);

      if (error) {
        if (isMissingRelation(error)) {
          return { average_rating: 0, total_evaluations: 0, comments: [] };
        }
        throw formatSupabaseError(error);
      }

      const variants =
        semester && String(semester).trim().toLowerCase() !== "all"
          ? buildSemesterVariants(semester).map((item) => item.toLowerCase())
          : null;

      const filtered = (data || []).filter((row) => {
        if (!variants) return true;
        const raw = String(row.semester || "").trim().toLowerCase();
        if (!raw) return true;
        return variants.includes(raw);
      });

      let total = 0;
      let count = 0;
      const comments = [];

      filtered.forEach((row) => {
        const rating = parseNumber(row.rating_overall ?? row.rating, null);
        if (rating != null) {
          total += rating;
          count += 1;
        }

        const commentText = row.comments || row.comment;
        if (commentText) {
          comments.push({
            text: commentText,
            rating: rating ?? 0,
            date: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null,
          });
        }
      });

      comments.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      return {
        average_rating: count ? total / count : 0,
        total_evaluations: count,
        comments: comments.slice(0, 20),
      };
    }),
};

export default {
  AuthAPI,
  PublicAPI,
  AdminAPI,
  StudentAPI,
  TeacherAPI,
};
