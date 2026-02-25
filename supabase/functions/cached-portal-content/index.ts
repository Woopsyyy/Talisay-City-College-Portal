import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis@1";

type LooseRecord = Record<string, any>;

type PublicUserRow = {
  id: number;
  username: string | null;
  auth_uid: string | null;
  role: string | null;
  roles: unknown;
  sub_role: string | null;
  sub_roles: unknown;
};

type RequestPayload = {
  resource?: unknown;
  audience?: unknown;
  force_refresh?: unknown;
  ttl_seconds?: unknown;
  page_path?: unknown;
  page_query?: unknown;
  view_name?: unknown;
};

type ResourceType = "announcements" | "evaluation_settings";
type AudienceType = "admin" | "teacher" | "student";

type ParsedRequestPayload = {
  resource: ResourceType;
  audience: AudienceType;
  forceRefresh: boolean;
  ttlSeconds: number;
  requestContext: RequestContext;
};

type StudentScope = {
  department: string;
  yearLevel: string;
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

const DEFAULT_ANNOUNCEMENTS_TTL_SECONDS = (() => {
  const envValue = Number(Deno.env.get("PORTAL_ANNOUNCEMENTS_CACHE_TTL_SECONDS"));
  if (!Number.isFinite(envValue)) return 45;
  return Math.min(3600, Math.max(10, Math.trunc(envValue)));
})();

const DEFAULT_EVALUATION_SETTINGS_TTL_SECONDS = (() => {
  const envValue = Number(Deno.env.get("PORTAL_EVALUATION_SETTINGS_CACHE_TTL_SECONDS"));
  if (!Number.isFinite(envValue)) return 300;
  return Math.min(3600, Math.max(10, Math.trunc(envValue)));
})();

const REDIS_BYPASS_SECONDS = (() => {
  const envValue = Number(Deno.env.get("PORTAL_CONTENT_REDIS_BYPASS_SECONDS"));
  if (!Number.isFinite(envValue)) return 300;
  return Math.min(3600, Math.max(30, Math.trunc(envValue)));
})();
const EDGE_ALLOWED_ORIGINS = String(Deno.env.get("EDGE_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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
        // fallback to split below
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

  if (!normalized) return "";
  if (normalized === "go") return "nt";
  if (
    normalized === "staff" ||
    normalized === "non-teaching" ||
    normalized === "non_teaching" ||
    normalized === "nonteaching"
  ) {
    return "nt";
  }

  return normalized;
};

const normalizeRoles = (rolesLike: unknown, fallbackRole: unknown = "student"): string[] => {
  const roles = parseListValue(rolesLike)
    .map(normalizeRole)
    .filter(Boolean);
  if (roles.length > 0) return Array.from(new Set(roles));
  const fallback = normalizeRole(fallbackRole);
  return [fallback || "student"];
};

const roleSetForUser = (row: PublicUserRow | null): Set<string> => {
  if (!row) return new Set<string>();

  return new Set<string>([
    normalizeRole(row.role),
    ...normalizeRoles(row.roles, row.role || "student"),
    normalizeRole(row.sub_role),
    ...parseListValue(row.sub_roles).map(normalizeRole),
  ]);
};

const hasAnyRole = (roleSet: Set<string>, candidates: string[]): boolean => {
  for (const candidate of candidates) {
    if (roleSet.has(normalizeRole(candidate))) return true;
  }
  return false;
};

const isAdminLikeRole = (roleSet: Set<string>): boolean =>
  hasAnyRole(roleSet, ["admin", "nt", "osas", "treasury"]);

const isTeacherLikeRole = (roleSet: Set<string>): boolean =>
  hasAnyRole(roleSet, ["teacher"]) || isAdminLikeRole(roleSet);

const isStudentLikeRole = (roleSet: Set<string>): boolean =>
  hasAnyRole(roleSet, ["student"]) || isAdminLikeRole(roleSet);

const normalizeYearLevel = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d)/);
  return match ? match[1] : raw;
};

const toBoolean = (value: unknown, fallback = true): boolean => {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "disabled"].includes(raw)) return false;
  return fallback;
};

const mapAnnouncement = (row: LooseRecord = {}) => ({
  ...row,
  priority: row.priority || "medium",
  target_role: row.target_role || "all",
  is_published: row.is_published == null ? 1 : row.is_published,
});

const isInactiveAssignmentStatus = (value: unknown): boolean => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (!status) return false;

  return ["inactive", "dropped", "archived", "deleted", "removed", "cancelled"].includes(status);
};

const parseRequestPayload = async (req: Request): Promise<ParsedRequestPayload> => {
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

  let payload: RequestPayload = {};
  if (req.method === "POST") {
    try {
      const contentLength = Number(req.headers.get("content-length") || "0");
      if (contentLength > 0) {
        payload = (await req.json()) as RequestPayload;
      }
    } catch (_) {
      throw new Error("Invalid JSON body.");
    }
  }

  const normalizedResource = String(payload?.resource || "")
    .trim()
    .toLowerCase();
  const resource: ResourceType =
    normalizedResource === "evaluation_settings"
      ? "evaluation_settings"
      : "announcements";

  const normalizedAudience = String(payload?.audience || "")
    .trim()
    .toLowerCase();
  const audience: AudienceType =
    normalizedAudience === "admin" || normalizedAudience === "teacher" || normalizedAudience === "student"
      ? normalizedAudience
      : "student";

  const defaultTtl = resource === "evaluation_settings"
    ? DEFAULT_EVALUATION_SETTINGS_TTL_SECONDS
    : DEFAULT_ANNOUNCEMENTS_TTL_SECONDS;
  const ttlRaw = Number(payload?.ttl_seconds);
  const ttlSeconds = Number.isFinite(ttlRaw)
    ? Math.min(3600, Math.max(10, Math.trunc(ttlRaw)))
    : defaultTtl;

  return {
    resource,
    audience,
    forceRefresh: Boolean(payload?.force_refresh),
    ttlSeconds,
    requestContext: {
      pagePath: sanitizeText(payload?.page_path, 200) || parsePagePathFromReferer(),
      pageQuery: sanitizeText(payload?.page_query, 400),
      viewName: sanitizeText(payload?.view_name, 120),
    },
  };
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

const buildPageLabel = (context: RequestContext): string => {
  const path = String(context?.pagePath || "").trim();
  const query = String(context?.pageQuery || "").trim();
  if (path && query) return `${path}${query}`;
  if (path) return path;
  return "unknown-page";
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

const logPortalCacheEvent = async (params: {
  caller: PublicUserRow | null;
  context: RequestContext;
  action: string;
  message: string;
  source: "cache" | "database";
  reason: string | null;
  ttlSeconds: number;
  forceRefresh: boolean;
  cacheKey: string;
  resource: ResourceType;
  audience: AudienceType;
}) => {
  const actorRole = normalizeRole(params?.caller?.role || "admin") || "admin";
  const action = String(params?.action || "portal_cache_event").trim().toLowerCase();
  const message = params?.message || "Portal cache event.";
  const metadata = {
    cache_key: params?.cacheKey || null,
    source: params?.source || "database",
    reason: params?.reason || null,
    resource: params?.resource || null,
    audience: params?.audience || null,
    page_path: params?.context?.pagePath || null,
    page_query: params?.context?.pageQuery || null,
    view_name: params?.context?.viewName || null,
    force_refresh: Boolean(params?.forceRefresh),
    ttl_seconds: Number(params?.ttlSeconds || 0),
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
      console.warn("[cached-portal-content] Failed to write cache status log", {
        fullInsertError,
        minimalInsertError,
        rpcError,
      });
    }
  } catch (error) {
    console.warn("[cached-portal-content] Failed to write cache status log", error);
  }
};

const logUnauthorizedPortalCacheEvent = async (
  req: Request,
  reason: string,
  detail: string | null = null,
) => {
  const context = buildRequestContextFromReferer(req);
  const pageLabel = buildPageLabel(context);
  const message = `Portal cache request unauthorized on ${pageLabel}.`;
  const metadata = {
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
      action: "portal_cache_unauthorized",
      category: "cache",
      message,
      metadata,
    });
    if (!insertError) return;

    const { error: rpcError } = await supabaseAdmin.rpc("app_log_status_event", {
      p_action: "portal_cache_unauthorized",
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
      console.warn("[cached-portal-content] Failed to write unauthorized cache log", {
        insertError,
        rpcError,
      });
    }
  } catch (error) {
    console.warn("[cached-portal-content] Failed to write unauthorized cache log", error);
  }
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

const sanitizeKeySegment = (value: unknown): string => {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return text || "none";
};

const buildCacheKey = (
  resource: ResourceType,
  audience: AudienceType,
  studentScope: StudentScope | null,
): string => {
  if (resource === "evaluation_settings") {
    return "tcc:portal:evaluation-settings:v1";
  }

  if (audience === "student") {
    return `tcc:portal:announcements:v1:student:dept:${sanitizeKeySegment(studentScope?.department || "all")}:year:${sanitizeKeySegment(studentScope?.yearLevel || "all")}`;
  }

  return `tcc:portal:announcements:v1:${sanitizeKeySegment(audience)}`;
};

const readCachedValue = async <T>(cacheKey: string): Promise<T | null> => {
  if (!redis) return null;
  if (shouldBypassRedis()) return null;

  try {
    const raw = await redis.get<string | LooseRecord>(cacheKey);
    if (!raw) return null;

    if (typeof raw === "string") {
      return JSON.parse(raw) as T;
    }

    return raw as T;
  } catch (error) {
    if (isRedisCapacityError(error)) {
      console.warn("[cached-portal-content] Redis capacity reached while reading; bypassing cache", error);
      markRedisBypass();
      return null;
    }
    console.warn("[cached-portal-content] Failed to read cache", error);
    return null;
  }
};

const writeCachedValue = async <T>(cacheKey: string, payload: T, ttlSeconds: number) => {
  if (!redis) return;
  if (shouldBypassRedis()) return;

  try {
    await redis.set(cacheKey, JSON.stringify(payload), { ex: ttlSeconds });
  } catch (error) {
    if (isRedisCapacityError(error)) {
      console.warn("[cached-portal-content] Redis capacity reached while writing; bypassing cache", error);
      markRedisBypass();
      return;
    }
    console.warn("[cached-portal-content] Failed to write cache", error);
  }
};

const queryStudentScope = async (userId: number): Promise<StudentScope> => {
  const { data, error } = await supabaseAdmin
    .from("user_assignments")
    .select("department,year_level,year,status,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message || "Failed to load student assignment scope.");

  const rows = data || [];
  const active = rows.find((row) => !isInactiveAssignmentStatus(row?.status)) || rows[0] || {};
  return {
    department: String(active?.department || "").trim(),
    yearLevel: normalizeYearLevel(active?.year_level || active?.year || ""),
  };
};

const queryAnnouncements = async (
  audience: AudienceType,
  studentScope: StudentScope | null,
): Promise<LooseRecord[]> => {
  const { data, error } = await supabaseAdmin.from("announcements").select("*");
  if (error) throw new Error(error.message || "Failed to load announcements.");

  const now = new Date();
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const rows = (data || []).map((row) => mapAnnouncement(row));

  if (audience === "admin") {
    return rows.sort((a, b) =>
      String(b.published_at || b.created_at || "").localeCompare(
        String(a.published_at || a.created_at || ""),
      )
    );
  }

  const filtered = rows.filter((row) => {
    const targetRole = String(row.target_role || "all").toLowerCase();
    if (audience === "teacher" && !["all", "teacher"].includes(targetRole)) return false;
    if (audience === "student" && !["all", "student"].includes(targetRole)) return false;
    if (!toBoolean(row.is_published, true)) return false;

    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= now) return false;
    }

    if (audience === "student") {
      const rowDepartment = String(row.department || "").trim();
      if (rowDepartment && studentScope?.department && rowDepartment !== studentScope.department) {
        return false;
      }

      const rowYear = normalizeYearLevel(row.year);
      if (rowYear && studentScope?.yearLevel && rowYear !== studentScope.yearLevel) {
        return false;
      }
    }

    return true;
  });

  return filtered.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    if (priorityDiff !== 0) return priorityDiff;

    return String(b.published_at || b.created_at || "").localeCompare(
      String(a.published_at || a.created_at || ""),
    );
  });
};

const queryEvaluationSettings = async (): Promise<LooseRecord> => {
  const { data, error } = await supabaseAdmin.from("evaluation_settings").select("*");
  if (error) throw new Error(error.message || "Failed to load evaluation settings.");

  const byKey = new Map<string, unknown>();
  (data || []).forEach((row) => {
    byKey.set(String(row?.setting_key || "").trim().toLowerCase(), row?.setting_value);
  });

  const rawTemplate = byKey.get("template");
  let template = null;
  if (rawTemplate != null) {
    try {
      template = typeof rawTemplate === "string" ? JSON.parse(rawTemplate) : rawTemplate;
    } catch (_) {
      template = null;
    }
  }

  return {
    enabled: toBoolean(byKey.get("enabled") ?? byKey.get("evaluation_enabled"), true),
    template,
  };
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
      await logUnauthorizedPortalCacheEvent(req, "missing_bearer_token");
      return json(401, { error: "Missing bearer token." });
    }

    const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);
    if (callerAuthError || !callerAuthData?.user?.id) {
      await logUnauthorizedPortalCacheEvent(
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

    const caller = (callerRow as PublicUserRow | null) || null;
    if (!caller?.id) {
      await logUnauthorizedPortalCacheEvent(req, "missing_caller_profile");
      return json(403, { error: "Caller profile is missing or invalid." });
    }

    const roleSet = roleSetForUser(caller);
    const { resource, audience, forceRefresh, ttlSeconds, requestContext } = await parseRequestPayload(req);
    const pageLabel = buildPageLabel(requestContext);

    if (resource === "announcements") {
      if (
        (audience === "admin" && !isAdminLikeRole(roleSet)) ||
        (audience === "teacher" && !isTeacherLikeRole(roleSet)) ||
        (audience === "student" && !isStudentLikeRole(roleSet))
      ) {
        await logUnauthorizedPortalCacheEvent(
          req,
          "forbidden_audience_access",
          `resource=${resource};audience=${audience};role=${normalizeRole(caller.role)}`,
        );
        return json(403, { error: `Forbidden audience "${audience}" for announcements.` });
      }
    } else if (!hasAnyRole(roleSet, ["student", "teacher"]) && !isAdminLikeRole(roleSet)) {
      await logUnauthorizedPortalCacheEvent(
        req,
        "forbidden_resource_access",
        `resource=${resource};audience=${audience};role=${normalizeRole(caller.role)}`,
      );
      return json(403, { error: "Forbidden resource access." });
    }

    const studentScope = resource === "announcements" && audience === "student"
      ? await queryStudentScope(caller.id)
      : null;

    const cacheKey = buildCacheKey(resource, audience, studentScope);
    if (!forceRefresh) {
      const cached = await readCachedValue<unknown>(cacheKey);
      if (cached != null) {
        console.log(`[cached-portal-content] CACHE HIT ${cacheKey}`);
        await logPortalCacheEvent({
          caller,
          context: requestContext,
          action: "portal_cache_hit",
          message: `Portal cache hit for ${resource} (${audience}) on ${pageLabel}.`,
          source: "cache",
          reason: null,
          ttlSeconds,
          forceRefresh,
          cacheKey,
          resource,
          audience,
        });
        return json(200, {
          source: "cache",
          cache_key: cacheKey,
          ttl_seconds: ttlSeconds,
          data: cached,
        });
      }
    }

    console.log(`[cached-portal-content] CACHE MISS ${cacheKey}`);
    await logPortalCacheEvent({
      caller,
      context: requestContext,
      action: shouldBypassRedis() ? "portal_cache_bypass" : "portal_cache_miss",
      message: forceRefresh
        ? `Portal cache refresh forced for ${resource} (${audience}) on ${pageLabel}.`
        : `Portal cache miss for ${resource} (${audience}) on ${pageLabel}.`,
      source: "database",
      reason: forceRefresh
        ? "force_refresh"
        : shouldBypassRedis()
          ? "redis_bypass_active"
          : !redis
            ? "redis_unavailable"
            : "cache_empty_or_unavailable",
      ttlSeconds,
      forceRefresh,
      cacheKey,
      resource,
      audience,
    });

    const payload = resource === "evaluation_settings"
      ? await queryEvaluationSettings()
      : await queryAnnouncements(audience, studentScope);

    await writeCachedValue(cacheKey, payload, ttlSeconds);

    return json(200, {
      source: "database",
      cache_key: cacheKey,
      ttl_seconds: ttlSeconds,
      data: payload,
    });
  } catch (error: any) {
    return json(500, { error: error?.message || "Unexpected server error." });
  }
});
