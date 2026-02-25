import { supabase } from "../../supabaseClient";
import { beginApiRequest, endApiRequest } from "../apiEvents";
import { getAvatarUrl } from "./avatar";

type LooseRecord = Record<string, any>;
type ApiError = Error & {
  status?: number;
  code?: number | string;
};

const PUBLIC_STATS_TTL_MS = 120_000;
const PUBLIC_LANDING_TTL_MS = 300_000;
const publicReadCache = new Map<string, { expiresAtMs: number; value: unknown }>();
const publicReadInFlight = new Map<string, Promise<unknown>>();

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

const withPublicApi = async (fn: () => Promise<any>, options: LooseRecord = {}) => {
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

const withLocalReadCache = async <T>({
  key,
  ttlMs,
  query,
  bypass = false,
}: {
  key: string;
  ttlMs: number;
  query: () => Promise<T>;
  bypass?: boolean;
}): Promise<T> => {
  if (bypass) {
    return await query();
  }

  const cached = publicReadCache.get(key);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cloneCacheValue(cached.value as T);
  }

  const inFlight = publicReadInFlight.get(key);
  if (inFlight) {
    return (await inFlight) as T;
  }

  const requestPromise = query()
    .then((result) => {
      publicReadCache.set(key, {
        expiresAtMs: Date.now() + ttlMs,
        value: cloneCacheValue(result),
      });
      return cloneCacheValue(result);
    })
    .finally(() => {
      publicReadInFlight.delete(key);
    });

  publicReadInFlight.set(key, requestPromise as Promise<unknown>);
  return await requestPromise;
};

const isMissingFunctionError = (error: any, fnName = ""): boolean => {
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

const isPermissionDeniedError = (error: any): boolean => {
  const code = String(error?.code || "").trim().toUpperCase();
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  );
};

export const PublicAPI = {
  getStats: async () =>
    withPublicApi(async () =>
      withLocalReadCache({
        key: "public.stats",
        ttlMs: PUBLIC_STATS_TTL_MS,
        query: async () => {
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
            supabase.from("buildings").select("id", { count: "exact", head: true }),
            supabase.from("subjects").select("id", { count: "exact", head: true }),
            supabase.from("sections").select("id", { count: "exact", head: true }),
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
        },
      }),
    ),

  getLandingPageStats: async (options: LooseRecord = {}) =>
    withPublicApi(async () =>
      withLocalReadCache({
        key: "public.landing",
        ttlMs: PUBLIC_LANDING_TTL_MS,
        bypass: Boolean(options?.force_refresh),
        query: async () => {
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

          if (countError && isPermissionDeniedError(countError)) {
            try {
              const publicStats = await PublicAPI.getStats();
              totalStudents = Number(publicStats?.users) || 0;
            } catch (_) {}
          }

          const avatarPaths = (students || [])
            .map((student) => student?.image_path)
            .filter((path) => String(path || "").trim().length > 0);
          const avatarUrls = await Promise.all(avatarPaths.map((path) => getAvatarUrl(null, path)));
          const avatars = Array.from(new Set(avatarUrls.filter(Boolean))).slice(0, 3);

          return {
            totalStudents,
            avatars,
          };
        },
      }),
    ),
};
