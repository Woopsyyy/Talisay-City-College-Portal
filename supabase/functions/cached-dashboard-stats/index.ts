import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis@1";

type LooseRecord = Record<string, any>;

type PublicUserRoleRow = {
  role: string | null;
  roles: unknown;
  sub_role: string | null;
  sub_roles: unknown;
};

type PublicUserAuthRow = {
  id: number;
  username: string | null;
  auth_uid: string | null;
  role: string | null;
  roles: unknown;
  sub_role: string | null;
  sub_roles: unknown;
};

type DashboardStatsPayload = {
  users: number;
  subjects: number;
  sections: number;
  schedules: number;
  announcements: number;
  study_load: number;
  students: number;
  teachers: number;
  admins: number;
  non_teaching: number;
  buildings: LooseRecord[];
  recent_announcements: LooseRecord[];
  generated_at: string;
};

type RequestPayload = {
  force_refresh?: unknown;
  ttl_seconds?: unknown;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const DEFAULT_CACHE_TTL_SECONDS = (() => {
  const envValue = Number(Deno.env.get("DASHBOARD_STATS_CACHE_TTL_SECONDS"));
  if (!Number.isFinite(envValue)) return 60;
  return Math.min(3600, Math.max(10, Math.trunc(envValue)));
})();

const REDIS_BYPASS_SECONDS = (() => {
  const envValue = Number(Deno.env.get("DASHBOARD_STATS_REDIS_BYPASS_SECONDS"));
  if (!Number.isFinite(envValue)) return 300;
  return Math.min(3600, Math.max(30, Math.trunc(envValue)));
})();

const DASHBOARD_CACHE_KEY = "tcc:dashboard:stats:v1";
let redisBypassUntilEpochMs = 0;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const redis = (() => {
  try {
    return Redis.fromEnv();
  } catch (_) {
    return null;
  }
})();

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const readBearerToken = (req: Request): string | null => {
  const authorization = String(req.headers.get("authorization") || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
};

const parseListValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item || "").trim().toLowerCase())
            .filter(Boolean);
        }
      } catch (_) {
        // fallback to CSV split below
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

const normalizeRole = (role: unknown): string => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized === "go" ? "nt" : normalized;
};

const normalizeRoles = (rolesLike: unknown, fallbackRole: unknown = "student"): string[] => {
  const roles = parseListValue(rolesLike)
    .map(normalizeRole)
    .filter(Boolean);
  if (roles.length > 0) return Array.from(new Set(roles));
  const fallback = normalizeRole(fallbackRole);
  return [fallback || "student"];
};

const hasAdminRole = (row: PublicUserAuthRow | null): boolean => {
  if (!row) return false;
  const roles = new Set<string>([
    normalizeRole(row.role),
    ...normalizeRoles(row.roles, row.role || "student"),
    normalizeRole(row.sub_role),
    ...parseListValue(row.sub_roles).map(normalizeRole),
  ]);
  return roles.has("admin");
};

const parseRequestPayload = async (req: Request): Promise<{ forceRefresh: boolean; ttlSeconds: number }> => {
  if (req.method !== "POST") {
    return { forceRefresh: false, ttlSeconds: DEFAULT_CACHE_TTL_SECONDS };
  }

  let payload: RequestPayload = {};
  try {
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 0) {
      payload = (await req.json()) as RequestPayload;
    }
  } catch (_) {
    throw new Error("Invalid JSON body.");
  }

  const ttlRaw = Number(payload?.ttl_seconds);
  const ttlSeconds = Number.isFinite(ttlRaw)
    ? Math.min(3600, Math.max(10, Math.trunc(ttlRaw)))
    : DEFAULT_CACHE_TTL_SECONDS;

  return {
    forceRefresh: Boolean(payload?.force_refresh),
    ttlSeconds,
  };
};

const countExact = async (table: string): Promise<number> => {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message || `Failed to count table "${table}".`);
  return Number(count || 0);
};

const mapAnnouncement = (row: LooseRecord = {}) => ({
  ...row,
  priority: row.priority || "medium",
  target_role: row.target_role || "all",
  is_published: row.is_published == null ? 1 : row.is_published,
});

const mapBuilding = (row: LooseRecord = {}) => ({
  ...row,
  name: row.building_name || row.name || "",
  floors: Number(row.num_floors || row.floors || 1),
  rooms_per_floor: Number(row.rooms_per_floor || 10),
});

const queryDashboardStats = async (): Promise<DashboardStatsPayload> => {
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
    supabaseAdmin.from("users").select("role,roles,sub_role,sub_roles"),
    supabaseAdmin.from("buildings").select("*"),
    supabaseAdmin
      .from("announcements")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  if (usersResult.error) throw new Error(usersResult.error.message || "Failed to load users.");
  if (buildingsResult.error) throw new Error(buildingsResult.error.message || "Failed to load buildings.");
  if (announcementsResult.error) {
    throw new Error(announcementsResult.error.message || "Failed to load recent announcements.");
  }

  const users = (usersResult.data || []) as PublicUserRoleRow[];
  const students = users.filter((user) =>
    normalizeRoles(user.roles, user.role).includes("student"),
  ).length;
  const teachers = users.filter((user) =>
    normalizeRoles(user.roles, user.role).includes("teacher"),
  ).length;
  const admins = users.filter((user) =>
    normalizeRoles(user.roles, user.role).includes("admin"),
  ).length;
  const nonTeaching = users.filter((user) =>
    normalizeRoles(user.roles, user.role).includes("nt"),
  ).length;

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
    buildings: (buildingsResult.data || []).map((row) => mapBuilding(row)),
    recent_announcements: (announcementsResult.data || []).map((row) => mapAnnouncement(row)),
    generated_at: new Date().toISOString(),
  };
};

const isDashboardStatsPayload = (value: unknown): value is DashboardStatsPayload => {
  if (!value || typeof value !== "object") return false;
  const data = value as LooseRecord;
  return typeof data.users === "number" && Array.isArray(data.buildings);
};

const getErrorText = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    code?: unknown;
    cause?: { message?: unknown } | unknown;
  };

  const parts = [candidate.message, candidate.details, candidate.code, candidate.cause]
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        const message = (part as { message?: unknown }).message;
        if (typeof message === "string") return message;
        try {
          return JSON.stringify(part);
        } catch (_) {
          return "";
        }
      }
      return "";
    })
    .filter(Boolean);

  return parts.join(" ").toLowerCase();
};

const isRedisCapacityError = (error: unknown): boolean => {
  const text = getErrorText(error);
  if (!text) return false;

  return (
    text.includes("oom command not allowed") ||
    text.includes("maxmemory") ||
    text.includes("memory limit") ||
    text.includes("storage limit") ||
    text.includes("database is full") ||
    text.includes("quota exceeded") ||
    text.includes("insufficient storage") ||
    text.includes("request limit exceeded") ||
    text.includes("plan limit")
  );
};

const shouldBypassRedis = (): boolean => redisBypassUntilEpochMs > Date.now();

const markRedisBypass = () => {
  redisBypassUntilEpochMs = Date.now() + REDIS_BYPASS_SECONDS * 1000;
};

const readCachedStats = async (): Promise<DashboardStatsPayload | null> => {
  if (!redis || shouldBypassRedis()) return null;

  try {
    const raw = await redis.get<string | LooseRecord>(DASHBOARD_CACHE_KEY);
    if (!raw) return null;

    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return isDashboardStatsPayload(parsed) ? parsed : null;
    }

    return isDashboardStatsPayload(raw) ? raw : null;
  } catch (error) {
    if (isRedisCapacityError(error)) {
      markRedisBypass();
    }
    return null;
  }
};

const writeCachedStats = async (payload: DashboardStatsPayload, ttlSeconds: number) => {
  if (!redis || shouldBypassRedis()) return;
  try {
    await redis.set(DASHBOARD_CACHE_KEY, JSON.stringify(payload), { ex: ttlSeconds });
  } catch (error) {
    if (isRedisCapacityError(error)) {
      markRedisBypass();
      return;
    }
    // cache write is best effort only
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const token = readBearerToken(req);
    if (!token) {
      return json(401, { error: "Missing bearer token." });
    }

    const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);
    if (callerAuthError || !callerAuthData?.user?.id) {
      return json(401, { error: "Invalid access token." });
    }

    const callerUid = callerAuthData.user.id;
    const { data: callerRow, error: callerRowError } = await supabaseAdmin
      .from("users")
      .select("id,username,auth_uid,role,roles,sub_role,sub_roles")
      .eq("auth_uid", callerUid)
      .maybeSingle();

    if (callerRowError) {
      return json(500, { error: callerRowError.message || "Failed to load caller profile." });
    }

    if (!hasAdminRole((callerRow as PublicUserAuthRow | null) || null)) {
      return json(403, { error: "Only administrators can access dashboard stats cache." });
    }

    const { forceRefresh, ttlSeconds } = await parseRequestPayload(req);

    if (!forceRefresh) {
      const cached = await readCachedStats();
      if (cached) {
        return json(200, {
          source: "cache",
          cache_key: DASHBOARD_CACHE_KEY,
          ttl_seconds: ttlSeconds,
          stats: cached,
        });
      }
    }

    const stats = await queryDashboardStats();
    await writeCachedStats(stats, ttlSeconds);

    return json(200, {
      source: "database",
      cache_key: DASHBOARD_CACHE_KEY,
      ttl_seconds: ttlSeconds,
      stats,
    });
  } catch (error: any) {
    return json(500, { error: error?.message || "Unexpected server error." });
  }
});
