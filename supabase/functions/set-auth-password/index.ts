import { createClient } from "npm:@supabase/supabase-js@2";

type PublicUserRow = {
  id: number;
  username: string | null;
  auth_uid: string | null;
  role: string | null;
  roles: unknown;
  sub_role: string | null;
  sub_roles: unknown;
};

type PasswordPayload = {
  user_id?: unknown;
  password?: unknown;
};

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
        // ignore JSON parsing errors and fallback to CSV split
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

const normalizeEmailLocal = (input: string, fallback: string): string => {
  const local = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return local || fallback;
};

const buildAuthEmail = (username: string | null, userId: number): string => {
  const fallback = `user${userId}`;
  return `${normalizeEmailLocal(username || "", fallback)}@local.tcc`;
};

const readBearerToken = (req: Request): string | null => {
  const authorization = String(req.headers.get("authorization") || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
};

const findAuthUserById = async (
  authUid: string,
): Promise<{ id: string; email: string | null } | null> => {
  const uid = String(authUid || "").trim();
  if (!uid) return null;

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("not found") || message.includes("does not exist")) {
      return null;
    }
    throw new Error(error.message || "Failed to load auth user by id.");
  }

  const authUser = data?.user;
  if (!authUser?.id) return null;
  return {
    id: authUser.id,
    email: authUser.email ? String(authUser.email).trim().toLowerCase() : null,
  };
};

const isAuthNotFoundError = (message: string): boolean => {
  const m = String(message || "").toLowerCase();
  return m.includes("not found") || m.includes("does not exist");
};

const isAuthEmailCheckError = (message: string): boolean => {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("database error checking email") ||
    m.includes("already been registered") ||
    m.includes("already exists") ||
    m.includes("duplicate key")
  );
};

const buildAuthFallbackEmail = (userId: number): string => {
  const base = normalizeEmailLocal(`user${userId}`, `user${userId}`);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}.${suffix}@local.tcc`;
};

const reviveAuthUserFlags = async (authUid: string): Promise<void> => {
  const uid = String(authUid || "").trim();
  if (!uid) return;

  await supabaseAdmin
    .schema("auth")
    .from("users")
    .update({ deleted_at: null })
    .eq("id", uid)
    .then(() => undefined)
    .catch(() => undefined);

  await supabaseAdmin
    .schema("auth")
    .from("users")
    .update({ banned_until: null })
    .eq("id", uid)
    .then(() => undefined)
    .catch(() => undefined);

  await supabaseAdmin
    .schema("auth")
    .from("users")
    .update({ is_sso_user: false })
    .eq("id", uid)
    .then(() => undefined)
    .catch(() => undefined);
};

const parsePayload = async (req: Request): Promise<{
  userId: number;
  password: string;
}> => {
  let payload: PasswordPayload | null = null;
  try {
    payload = (await req.json()) as PasswordPayload;
  } catch (_) {
    throw new Error("Invalid JSON body.");
  }

  const userId = Number(payload?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("user_id must be a positive number.");
  }

  const password = String(payload?.password || "");
  if (password.length < 8) {
    throw new Error("password must be at least 8 characters.");
  }

  return { userId: Math.trunc(userId), password };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

    const effectiveCaller = (callerRow as PublicUserRow | null) || null;

    if (!hasAdminRole(effectiveCaller)) {
      return json(403, { error: "Only administrators can reset account passwords." });
    }

    const { userId, password } = await parsePayload(req);

    const { data: targetRow, error: targetError } = await supabaseAdmin
      .from("users")
      .select("id,username,auth_uid")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return json(500, { error: targetError.message || "Failed to load target user." });
    }
    if (!targetRow) {
      return json(404, { error: "Target user not found." });
    }

    const target = targetRow as Pick<PublicUserRow, "id" | "username" | "auth_uid">;
    const authEmail = buildAuthEmail(target.username, target.id);
    let resolvedAuthEmail = authEmail;
    let authUid = target.auth_uid || null;
    let createdAuthUser = false;

    if (authUid) {
      const existingById = await findAuthUserById(authUid);
      if (!existingById) {
        authUid = null;
      } else if (existingById.email) {
        resolvedAuthEmail = existingById.email;
      }
    }

    if (authUid) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUid, {
        password,
      });
      if (updateError) {
        const message = String(updateError.message || "");
        if (isAuthNotFoundError(message)) {
          authUid = null;
        } else {
          return json(500, { error: updateError.message || "Failed to update auth user." });
        }
      }
    }

    if (!authUid) {
      const createWithEmail = async (email: string) =>
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      let createEmail = authEmail;
      let created: { user?: { id?: string; email?: string | null } } | null = null;
      let createError: { message?: string } | null = null;

      ({
        data: created,
        error: createError,
      } = await createWithEmail(createEmail));

      if (createError && isAuthEmailCheckError(createError.message || "")) {
        createEmail = buildAuthFallbackEmail(target.id);
        ({
          data: created,
          error: createError,
        } = await createWithEmail(createEmail));
      }

      if (createError || !created?.user?.id) {
        return json(500, {
          error: createError?.message || "Failed to create auth user.",
        });
      }
      authUid = created.user.id;
      resolvedAuthEmail = String(created.user.email || createEmail).trim().toLowerCase();
      createdAuthUser = true;
    }

    const { error: bindError } = await supabaseAdmin
      .from("users")
      .update({ auth_uid: authUid, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (bindError) {
      return json(500, { error: bindError.message || "Failed to bind auth_uid to user profile." });
    }

    await reviveAuthUserFlags(authUid);

    return json(200, {
      success: true,
      auth_uid: authUid,
      auth_email: resolvedAuthEmail,
      created_auth_user: createdAuthUser,
    });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Request failed." });
  }
});
