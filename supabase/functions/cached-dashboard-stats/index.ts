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
  page_path?: unknown;
  page_query?: unknown;
  view_name?: unknown;
};

type RequestContext = {
  pagePath: string | null;
  pageQuery: string | null;
  viewName: string | null;
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
const EDGE_ALLOWED_ORIGINS = String(Deno.env.get("EDGE_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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

const isOriginAllowed = (req: Request): boolean => {
  if (EDGE_ALLOWED_ORIGINS.length === 0) return true;
  const origin = String(req.headers.get("origin") || "").trim();
  if (!origin) return true;
  return EDGE_ALLOWED_ORIGINS.includes(origin);
};

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

const parseRequestPayload = async (req: Request): Promise<{
  forceRefresh: boolean;
  ttlSeconds: number;
  requestContext: RequestContext;
}> => {
  const sanitizeText = (value: unknown, maxLength = 180): string | null => {
    const text = String(value || "").trim();
    if (!text) return null;
    return text.slice(0, maxLength);
  };

  const parsePagePathFromReferer = (): string | null => {
    const referer = String(req.headers.get("referer") || "").trim();
    if (!referer) return null;
    try {
      const url = new URL(referer);
      return sanitizeText(url.pathname, 200);
    } catch (_) {
      return null;
    }
  };

  if (req.method !== "POST") {
    return {
      forceRefresh: false,
      ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      requestContext: {
        pagePath: parsePagePathFromReferer(),
        pageQuery: null,
        viewName: null,
      },
    };
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
    requestContext: {
      pagePath: sanitizeText(payload?.page_path, 200) || parsePagePathFromReferer(),
      pageQuery: sanitizeText(payload?.page_query, 400),
      viewName: sanitizeText(payload?.view_name, 120),
    },
  };
};

const buildPageLabel = (context: RequestContext): string => {
  const path = String(context?.pagePath || "").trim();
  const query = String(context?.pageQuery || "").trim();
  if (path && query) return `${path}${query}`;
  if (path) return path;
  return "unknown-page";
};

const buildRequestContextFromReferer = (req: Request): RequestContext => {
  const referer = String(req.headers.get("referer") || "").trim();
  if (!referer) {
    return { pagePath: null, pageQuery: null, viewName: null };
  }

  try {
    const url = new URL(referer);
    return {
      pagePath: String(url.pathname || "").trim().slice(0, 200) || null,
      pageQuery: String(url.search || "").trim().slice(0, 400) || null,
      viewName: null,
    };
  } catch (_) {
    return { pagePath: null, pageQuery: null, viewName: null };
  }
};

const isMissingFunctionError = (error: unknown, fnName = ""): boolean => {
  const text = getErrorText(error);
  if (!text) return false;

  const missingText =
    text.includes("could not find the function") ||
    (text.includes("function") && text.includes("does not exist"));
  if (!missingText) return false;
  if (!fnName) return true;
  return text.includes(fnName.toLowerCase());
};

const logCacheStatusEvent = async (params: {
  caller: PublicUserAuthRow | null;
  context: RequestContext;
  action: string;
  message: string;
  source: "cache" | "database";
  reason: string | null;
  ttlSeconds: number;
  forceRefresh: boolean;
}) => {
  const actorRole = normalizeRole(params?.caller?.role || "admin") || "admin";
  const action = String(params?.action || "dashboard_cache_event").trim().toLowerCase();
  const message = params?.message || "Dashboard cache event";
  const metadata = {
    cache_key: DASHBOARD_CACHE_KEY,
    source: params?.source || "database",
    reason: params?.reason || null,
    page_path: params?.context?.pagePath || null,
    page_query: params?.context?.pageQuery || null,
    view_name: params?.context?.viewName || null,
    force_refresh: Boolean(params?.forceRefresh),
    ttl_seconds: Number(params?.ttlSeconds || DEFAULT_CACHE_TTL_SECONDS),
    redis_bypass_active: shouldBypassRedis(),
  };

  try {
    const { error: fullInsertError } = await supabaseAdmin.from("status_logs").insert({
      actor_user_id: params?.caller?.id || null,
      actor_username: params?.caller?.username || "system",
      actor_role: actorRole,
      action,
      category: "cache",
      target_user_id: null,
      target_username: null,
      target_role: null,
      message,
      metadata,
    });

    if (!fullInsertError) return;

    const { error: minimalInsertError } = await supabaseAdmin.from("status_logs").insert({
      actor_user_id: params?.caller?.id || null,
      actor_username: params?.caller?.username || "system",
      actor_role: actorRole,
      action,
      category: "cache",
      message,
      metadata,
    });
    if (!minimalInsertError) return;

    const { error: rpcError } = await supabaseAdmin.rpc("app_log_status_event", {
      p_action: action,
      p_category: "cache",
      p_message: message,
      p_actor_user_id: params?.caller?.id || null,
      p_actor_username: params?.caller?.username || "system",
      p_actor_role: actorRole,
      p_target_user_id: null,
      p_target_username: null,
      p_target_role: null,
      p_metadata: metadata,
    });
    if (rpcError && !isMissingFunctionError(rpcError, "app_log_status_event")) {
      console.warn("[cached-dashboard-stats] Failed to write status log event", {
        fullInsertError,
        minimalInsertError,
        rpcError,
      });
    }
  } catch (error) {
    console.warn("[cached-dashboard-stats] Failed to write status log event", error);
  }
};

const logUnauthorizedCacheEvent = async (
  req: Request,
  reason: string,
  detail: string | null = null,
) => {
  const context = buildRequestContextFromReferer(req);
  const pageLabel = buildPageLabel(context);
  const message = `Dashboard cache request unauthorized on ${pageLabel}.`;
  const metadata = {
    cache_key: DASHBOARD_CACHE_KEY,
    source: "database",
    reason: String(reason || "unauthorized").trim().toLowerCase(),
    page_path: context.pagePath,
    page_query: context.pageQuery,
    view_name: context.viewName,
    detail: detail || null,
  };

  try {
    const { error: insertError } = await supabaseAdmin.from("status_logs").insert({
      actor_user_id: null,
      actor_username: "system",
      actor_role: "system",
      action: "dashboard_cache_unauthorized",
      category: "cache",
      message,
      metadata,
    });
    if (!insertError) return;

    const { error: rpcError } = await supabaseAdmin.rpc("app_log_status_event", {
      p_action: "dashboard_cache_unauthorized",
      p_category: "cache",
      p_message: message,
      p_actor_user_id: null,
      p_actor_username: "system",
      p_actor_role: "system",
      p_target_user_id: null,
      p_target_username: null,
      p_target_role: null,
      p_metadata: metadata,
    });
    if (rpcError && !isMissingFunctionError(rpcError, "app_log_status_event")) {
      console.warn("[cached-dashboard-stats] Failed to write unauthorized cache event", {
        insertError,
        rpcError,
      });
    }
  } catch (error) {
    console.warn("[cached-dashboard-stats] Failed to write unauthorized cache event", error);
  }
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

type DashboardRoleCounts = {
  students: number;
  teachers: number;
  admins: number;
  nonTeaching: number;
};

const countUsersByRoleVariants = async (variants: string[]): Promise<number> => {
  const normalizedVariants = Array.from(new Set(
    variants
      .map((variant) => normalizeRole(variant))
      .filter(Boolean),
  ));
  if (normalizedVariants.length === 0) return 0;

  const filterParts = normalizedVariants.flatMap((variant) => [
    `role.ilike.${variant}`,
    `sub_role.ilike.${variant}`,
  ]);

  const { count, error } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .or(filterParts.join(","));

  if (error) throw new Error(error.message || "Failed to count users by role.");
  return Number(count || 0);
};

const queryDashboardRoleCountsFast = async (): Promise<DashboardRoleCounts> => {
  const [students, teachers, admins, nonTeaching] = await Promise.all([
    countUsersByRoleVariants(["student"]),
    countUsersByRoleVariants(["teacher"]),
    countUsersByRoleVariants(["admin"]),
    countUsersByRoleVariants(["nt", "go"]),
  ]);

  return {
    students,
    teachers,
    admins,
    nonTeaching,
  };
};

const queryDashboardRoleCountsByScan = async (): Promise<DashboardRoleCounts> => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role,roles,sub_role,sub_roles");

  if (error) throw new Error(error.message || "Failed to load users.");

  const users = (data || []) as PublicUserRoleRow[];
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
    students,
    teachers,
    admins,
    nonTeaching,
  };
};

const queryDashboardStats = async (): Promise<DashboardStatsPayload> => {
  const [
    usersCount,
    subjectsCount,
    sectionsCount,
    schedulesCount,
    announcementsCount,
    studyLoadCount,
    buildingsResult,
    announcementsResult,
  ] = await Promise.all([
    countExact("users"),
    countExact("subjects"),
    countExact("sections"),
    countExact("schedules"),
    countExact("announcements"),
    countExact("study_load"),
    supabaseAdmin.from("buildings").select("*"),
    supabaseAdmin
      .from("announcements")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  if (buildingsResult.error) throw new Error(buildingsResult.error.message || "Failed to load buildings.");
  if (announcementsResult.error) {
    throw new Error(announcementsResult.error.message || "Failed to load recent announcements.");
  }

  let roleCounts: DashboardRoleCounts | null = null;
  try {
    const fastCounts = await queryDashboardRoleCountsFast();
    const totalBuckets = fastCounts.students + fastCounts.teachers + fastCounts.admins + fastCounts.nonTeaching;

    // If users exist but fast counts are all zero, fall back to robust scan for legacy datasets.
    roleCounts = usersCount > 0 && totalBuckets === 0
      ? await queryDashboardRoleCountsByScan()
      : fastCounts;
  } catch (error) {
    console.warn("[cached-dashboard-stats] Fast role counting failed, falling back to scan.", error);
    roleCounts = await queryDashboardRoleCountsByScan();
  }

  return {
    users: usersCount,
    subjects: subjectsCount,
    sections: sectionsCount,
    schedules: schedulesCount,
    announcements: announcementsCount,
    study_load: studyLoadCount,
    students: Number(roleCounts?.students || 0),
    teachers: Number(roleCounts?.teachers || 0),
    admins: Number(roleCounts?.admins || 0),
    non_teaching: Number(roleCounts?.nonTeaching || 0),
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
  if (!redis) {
    console.log("[cached-dashboard-stats] CACHE MISS (redis unavailable)");
    return null;
  }

  if (shouldBypassRedis()) {
    console.log("[cached-dashboard-stats] CACHE MISS (redis bypass active)");
    return null;
  }

  try {
    const raw = await redis.get<string | LooseRecord>(DASHBOARD_CACHE_KEY);
    if (!raw) {
      console.log("[cached-dashboard-stats] CACHE MISS");
      return null;
    }

    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      if (isDashboardStatsPayload(parsed)) {
        console.log("[cached-dashboard-stats] CACHE HIT");
        return parsed;
      }
      console.log("[cached-dashboard-stats] CACHE MISS (invalid cached payload)");
      return null;
    }

    if (isDashboardStatsPayload(raw)) {
      console.log("[cached-dashboard-stats] CACHE HIT");
      return raw;
    }

    console.log("[cached-dashboard-stats] CACHE MISS (invalid cached payload)");
    return null;
  } catch (error) {
    if (isRedisCapacityError(error)) {
      console.warn("[cached-dashboard-stats] Redis capacity reached, bypassing cache", error);
      markRedisBypass();
    }
    console.warn("[cached-dashboard-stats] CACHE MISS (redis read error)", error);
    return null;
  }
};

const writeCachedStats = async (payload: DashboardStatsPayload, ttlSeconds: number) => {
  if (!redis) {
    console.log("[cached-dashboard-stats] CACHE SKIP WRITE (redis unavailable)");
    return;
  }

  if (shouldBypassRedis()) {
    console.log("[cached-dashboard-stats] CACHE SKIP WRITE (redis bypass active)");
    return;
  }

  try {
    await redis.set(DASHBOARD_CACHE_KEY, JSON.stringify(payload), { ex: ttlSeconds });
    console.log("[cached-dashboard-stats] CACHE WRITE");
  } catch (error) {
    if (isRedisCapacityError(error)) {
      console.warn("[cached-dashboard-stats] Redis capacity reached during write, bypassing cache", error);
      markRedisBypass();
      return;
    }
    // cache write is best effort only
    console.warn("[cached-dashboard-stats] CACHE WRITE ERROR", error);
  }
};

Deno.serve(async (req: Request) => {
  if (!isOriginAllowed(req)) {
    return json(403, { error: "Origin not allowed." });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const token = readBearerToken(req);
    if (!token) {
      await logUnauthorizedCacheEvent(req, "missing_bearer_token");
      return json(401, { error: "Missing bearer token." });
    }

    const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);
    if (callerAuthError || !callerAuthData?.user?.id) {
      await logUnauthorizedCacheEvent(
        req,
        "invalid_access_token",
        String(callerAuthError?.message || "").trim() || null,
      );
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

    const caller = (callerRow as PublicUserAuthRow | null) || null;
    if (!hasAdminRole(caller)) {
      await logUnauthorizedCacheEvent(
        req,
        "forbidden_non_admin",
        String(caller?.role || "").trim() || null,
      );
      return json(403, { error: "Only administrators can access dashboard stats cache." });
    }

    const { forceRefresh, ttlSeconds, requestContext } = await parseRequestPayload(req);
    const pageLabel = buildPageLabel(requestContext);

    if (!forceRefresh) {
      const cached = await readCachedStats();
      if (cached) {
        await logCacheStatusEvent({
          caller,
          context: requestContext,
          action: "dashboard_cache_hit",
          message: `Dashboard stats cache hit on ${pageLabel}.`,
          source: "cache",
          reason: null,
          ttlSeconds,
          forceRefresh,
        });

        return json(200, {
          source: "cache",
          cache_key: DASHBOARD_CACHE_KEY,
          ttl_seconds: ttlSeconds,
          stats: cached,
        });
      }
    }

    console.log("[cached-dashboard-stats] CACHE MISS -> DATABASE QUERY");
    await logCacheStatusEvent({
      caller,
      context: requestContext,
      action: shouldBypassRedis() ? "dashboard_cache_bypass" : "dashboard_cache_miss",
      message: forceRefresh
        ? `Dashboard stats cache refresh forced on ${pageLabel}.`
        : `Dashboard stats cache miss on ${pageLabel}.`,
      source: "database",
      reason: forceRefresh
        ? "force_refresh"
        : shouldBypassRedis()
          ? "redis_bypass_active"
          : "cache_empty_or_unavailable",
      ttlSeconds,
      forceRefresh,
    });

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
