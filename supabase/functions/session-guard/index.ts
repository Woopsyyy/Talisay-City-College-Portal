import { createClient } from "npm:@supabase/supabase-js@2";

type PublicUserRow = {
  id: number;
  username: string | null;
  role: string | null;
  roles: unknown;
  sub_role: string | null;
  sub_roles: unknown;
};

type SessionGuardState = {
  user_id: number;
  session_nonce: string | null;
  enforce_single_session: boolean;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  role: string | null;
  updated_reason: string | null;
};

type SessionGuardAction = "start" | "touch" | "validate" | "logout";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SETTING_KEY_PREFIX = "session_guard_user_";
const DEFAULT_TTL_MINUTES = 15;
const EDGE_ALLOWED_ORIGINS = String(Deno.env.get("EDGE_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const parseRoleString = (value: unknown): string[] => {
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
        // fallback below
      }
    }
    return trimmed
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const hasAdminRole = (row: PublicUserRow | null): boolean => {
  if (!row) return false;
  const roles = new Set<string>([
    String(row.role || "").trim().toLowerCase(),
    ...parseRoleString(row.roles),
    String(row.sub_role || "").trim().toLowerCase(),
    ...parseRoleString(row.sub_roles),
  ]);
  return roles.has("admin");
};

const sanitizeAction = (value: unknown): SessionGuardAction => {
  const action = String(value || "").trim().toLowerCase();
  if (action === "start") return "start";
  if (action === "touch") return "touch";
  if (action === "logout") return "logout";
  return "validate";
};

const sanitizeNonce = (value: unknown): string | null => {
  const nonce = String(value || "").trim();
  if (!nonce) return null;
  return nonce.slice(0, 255);
};

const clampTtlMinutes = (value: unknown): number => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return DEFAULT_TTL_MINUTES;
  return Math.max(5, Math.min(120, Math.round(minutes)));
};

const plusMinutes = (fromMs: number, minutes: number) => {
  return new Date(fromMs + minutes * 60_000).toISOString();
};

const parseSettingState = (value: unknown): SessionGuardState | null => {
  if (!value) return null;
  let parsed: unknown = value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const userId = Number(obj.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return {
    user_id: Math.trunc(userId),
    session_nonce: sanitizeNonce(obj.session_nonce),
    enforce_single_session: Boolean(obj.enforce_single_session),
    issued_at: String(obj.issued_at || "").trim() || new Date().toISOString(),
    last_seen_at: String(obj.last_seen_at || "").trim() || new Date().toISOString(),
    expires_at: String(obj.expires_at || "").trim() || new Date().toISOString(),
    revoked_at: String(obj.revoked_at || "").trim() || null,
    role: String(obj.role || "").trim() || null,
    updated_reason: String(obj.updated_reason || "").trim() || null,
  };
};

const readSessionState = async (settingKey: string): Promise<SessionGuardState | null> => {
  const { data, error } = await supabaseAdmin
    .from("evaluation_settings")
    .select("setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();
  if (error) {
    throw new Error(error.message || "Failed to load session guard state.");
  }
  return parseSettingState(data?.setting_value);
};

const writeSessionState = async (settingKey: string, state: SessionGuardState): Promise<void> => {
  const payload = {
    setting_key: settingKey,
    setting_value: JSON.stringify(state),
    setting_description: "Server session guard runtime record",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin
    .from("evaluation_settings")
    .upsert(payload, { onConflict: "setting_key" });
  if (error) {
    throw new Error(error.message || "Failed to persist session guard state.");
  }
};

Deno.serve(async (req: Request) => {
  if (!isOriginAllowed(req)) {
    return json(403, { error: "Origin not allowed." });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const token = readBearerToken(req);
    if (!token) return json(401, { error: "Missing bearer token." });

    const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);
    if (callerAuthError || !callerAuthData?.user?.id) {
      return json(401, { error: "Invalid access token." });
    }
    const callerUid = callerAuthData.user.id;

    const { data: callerRow, error: callerRowError } = await supabaseAdmin
      .from("users")
      .select("id,username,role,roles,sub_role,sub_roles")
      .eq("auth_uid", callerUid)
      .maybeSingle();
    if (callerRowError) {
      return json(500, { error: callerRowError.message || "Failed to load user profile." });
    }
    if (!callerRow) {
      return json(403, { error: "Caller profile not found." });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = (await req.json()) as Record<string, unknown>;
    } catch (_) {
      payload = {};
    }

    const action = sanitizeAction(payload.action);
    const incomingNonce = sanitizeNonce(payload.session_nonce);
    const ttlMinutes = clampTtlMinutes(payload.ttl_minutes);
    const reason = String(payload.reason || "").trim() || null;

    const userId = Number(callerRow.id);
    const isAdmin = hasAdminRole(callerRow as PublicUserRow);
    const settingKey = `${SETTING_KEY_PREFIX}${Math.trunc(userId)}`;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const stored = await readSessionState(settingKey);
    const storedNonce = sanitizeNonce(stored?.session_nonce);
    const storedExpiryMs = new Date(String(stored?.expires_at || "")).getTime();
    const expired = Number.isFinite(storedExpiryMs) && storedExpiryMs > 0 && nowMs >= storedExpiryMs;

    if (action === "logout") {
      if (stored) {
        const canRevoke =
          !incomingNonce ||
          !storedNonce ||
          incomingNonce === storedNonce ||
          !stored.enforce_single_session;
        if (canRevoke) {
          const next: SessionGuardState = {
            ...stored,
            last_seen_at: nowIso,
            expires_at: nowIso,
            revoked_at: nowIso,
            updated_reason: reason || "logout",
          };
          await writeSessionState(settingKey, next);
        }
      }
      return json(200, {
        success: true,
        valid: false,
        reason: "logout_recorded",
        session_nonce: storedNonce || incomingNonce,
        expires_at: nowIso,
      });
    }

    if (action === "start") {
      const nextNonce = incomingNonce || storedNonce || crypto.randomUUID();
      const rotated = Boolean(isAdmin && storedNonce && incomingNonce && storedNonce !== incomingNonce);
      const next: SessionGuardState = {
        user_id: Math.trunc(userId),
        session_nonce: nextNonce,
        enforce_single_session: isAdmin,
        issued_at: stored?.issued_at || nowIso,
        last_seen_at: nowIso,
        expires_at: plusMinutes(nowMs, ttlMinutes),
        revoked_at: null,
        role: String(callerRow.role || "").trim() || null,
        updated_reason: reason || "start",
      };
      await writeSessionState(settingKey, next);
      return json(200, {
        success: true,
        valid: true,
        rotated,
        reason: rotated ? "session_rotated" : "session_started",
        session_nonce: next.session_nonce,
        expires_at: next.expires_at,
      });
    }

    if (!stored) {
      if (!incomingNonce) {
        return json(200, {
          success: true,
          valid: false,
          expired: false,
          rotated: false,
          reason: "session_not_registered",
          session_nonce: null,
          expires_at: null,
        });
      }
      const bootstrapped: SessionGuardState = {
        user_id: Math.trunc(userId),
        session_nonce: incomingNonce,
        enforce_single_session: isAdmin,
        issued_at: nowIso,
        last_seen_at: nowIso,
        expires_at: plusMinutes(nowMs, ttlMinutes),
        revoked_at: null,
        role: String(callerRow.role || "").trim() || null,
        updated_reason: reason || "bootstrap",
      };
      await writeSessionState(settingKey, bootstrapped);
      return json(200, {
        success: true,
        valid: true,
        expired: false,
        rotated: false,
        reason: "session_bootstrapped",
        session_nonce: bootstrapped.session_nonce,
        expires_at: bootstrapped.expires_at,
      });
    }

    if (expired || stored.revoked_at) {
      return json(200, {
        success: true,
        valid: false,
        expired: true,
        rotated: false,
        reason: "inactivity_timeout",
        session_nonce: storedNonce,
        expires_at: stored.expires_at,
      });
    }

    const nonceMismatch = Boolean(incomingNonce && storedNonce && incomingNonce !== storedNonce);
    if (nonceMismatch && stored.enforce_single_session) {
      return json(200, {
        success: true,
        valid: false,
        expired: false,
        rotated: true,
        reason: "session_rotated",
        session_nonce: storedNonce,
        expires_at: stored.expires_at,
      });
    }

    const shouldTouch = action === "touch";
    if (shouldTouch || (nonceMismatch && !stored.enforce_single_session)) {
      const nextNonce = nonceMismatch && !stored.enforce_single_session ? incomingNonce : storedNonce;
      const next: SessionGuardState = {
        ...stored,
        session_nonce: nextNonce || storedNonce,
        last_seen_at: nowIso,
        expires_at: plusMinutes(nowMs, ttlMinutes),
        revoked_at: null,
        updated_reason: reason || (shouldTouch ? "touch" : "validate"),
      };
      await writeSessionState(settingKey, next);
      return json(200, {
        success: true,
        valid: true,
        expired: false,
        rotated: Boolean(nonceMismatch && !stored.enforce_single_session),
        reason: shouldTouch ? "touch" : "validated",
        session_nonce: next.session_nonce,
        expires_at: next.expires_at,
      });
    }

    return json(200, {
      success: true,
      valid: true,
      expired: false,
      rotated: false,
      reason: "validated",
      session_nonce: storedNonce,
      expires_at: stored.expires_at,
    });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Session guard request failed.",
    });
  }
});
