import { supabase } from "../supabaseClient";

export const PORTAL_OUTAGE_LOCAL_KEY = "tcc_portal_supabase_offline_simulation";
export const PORTAL_OUTAGE_SETTING_KEY = "portal_supabase_offline_simulation";
export const PORTAL_OUTAGE_EVENT = "tcc-portal-outage-updated";

export type PortalOutageSimulationState = {
  active: boolean;
  scenario: string;
  started_at: string | null;
  duration_minutes: number | null;
  severity: string | null;
  resolved_at: string | null;
  source: string | null;
};

const DEFAULT_STATE: PortalOutageSimulationState = {
  active: false,
  scenario: "supabase_offline",
  started_at: null,
  duration_minutes: null,
  severity: null,
  resolved_at: null,
  source: null,
};

const OUTAGE_STATE_CACHE_TTL_MS = 10_000;
const SUPABASE_PROBE_CACHE_TTL_MS = 15_000;

const cloneOutageState = (state: PortalOutageSimulationState): PortalOutageSimulationState => ({
  ...state,
});

let outageStateCache: {
  value: PortalOutageSimulationState | null;
  expiresAtMs: number;
  inFlight: Promise<PortalOutageSimulationState> | null;
} = {
  value: null,
  expiresAtMs: 0,
  inFlight: null,
};

type ProbeScope = "authenticated" | "anonymous";
const probeCacheByScope: Record<
  ProbeScope,
  { expiresAtMs: number; inFlight: Promise<void> | null }
> = {
  authenticated: { expiresAtMs: 0, inFlight: null },
  anonymous: { expiresAtMs: 0, inFlight: null },
};

const parseNumber = (value: unknown): number | null => {
  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0) return null;
  return Math.floor(next);
};

const parseStateLike = (input: unknown): any => {
  if (!input) return null;
  if (typeof input === "string") {
    const raw = input.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  if (typeof input === "object") return input;
  return null;
};

export const normalizePortalOutageState = (
  input: unknown,
): PortalOutageSimulationState => {
  const parsed = parseStateLike(input);
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };

  const scenario = String((parsed as any).scenario || "supabase_offline")
    .trim()
    .toLowerCase();
  const startedAt = String((parsed as any).started_at || "").trim() || null;
  const resolvedAt = String((parsed as any).resolved_at || "").trim() || null;

  return {
    active: Boolean((parsed as any).active),
    scenario: scenario || "supabase_offline",
    started_at: startedAt,
    duration_minutes: parseNumber((parsed as any).duration_minutes),
    severity: String((parsed as any).severity || "").trim().toLowerCase() || null,
    resolved_at: resolvedAt,
    source: String((parsed as any).source || "").trim().toLowerCase() || null,
  };
};

export const readLocalPortalOutageState = (): PortalOutageSimulationState => {
  try {
    const raw = localStorage.getItem(PORTAL_OUTAGE_LOCAL_KEY);
    return normalizePortalOutageState(raw);
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
};

export const writeLocalPortalOutageState = (input: unknown): void => {
  try {
    const normalized = normalizePortalOutageState(input);
    localStorage.setItem(PORTAL_OUTAGE_LOCAL_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(PORTAL_OUTAGE_EVENT));
  } catch (_) {
    // no-op
  }
};

export const clearLocalPortalOutageState = (): void => {
  try {
    localStorage.removeItem(PORTAL_OUTAGE_LOCAL_KEY);
    window.dispatchEvent(new Event(PORTAL_OUTAGE_EVENT));
  } catch (_) {
    // no-op
  }
};

export const isPortalOutageSimulationActive = (
  input: unknown,
  now = Date.now(),
): boolean => {
  const state = normalizePortalOutageState(input);
  if (!state.active) return false;
  if (state.scenario !== "supabase_offline") return false;
  if (state.resolved_at) return false;

  if (state.started_at && state.duration_minutes && state.duration_minutes > 0) {
    const startedAtMs = new Date(state.started_at).getTime();
    if (Number.isFinite(startedAtMs) && startedAtMs > 0) {
      const expiresAt = startedAtMs + state.duration_minutes * 60 * 1000;
      if (now >= expiresAt) return false;
    }
  }

  return true;
};

export const isSupabaseUnavailableError = (errorLike: unknown): boolean => {
  const status = Number((errorLike as any)?.status || (errorLike as any)?.statusCode || 0);
  if (status === 502 || status === 503 || status === 504 || status === 520 || status === 522) {
    return true;
  }

  const message = String((errorLike as any)?.message || errorLike || "").toLowerCase();
  if (!message) return false;

  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("gateway timeout") ||
    message.includes("service unavailable") ||
    message.includes("fetch is not successful")
  );
};

export const fetchPortalOutageSimulationState = async (): Promise<PortalOutageSimulationState> => {
  const now = Date.now();
  if (outageStateCache.value && outageStateCache.expiresAtMs > now) {
    return cloneOutageState(outageStateCache.value);
  }

  if (outageStateCache.inFlight) {
    return await outageStateCache.inFlight;
  }

  const requestPromise = (async () => {
    const { data, error } = await supabase
      .from("evaluation_settings")
      .select("setting_value")
      .eq("setting_key", PORTAL_OUTAGE_SETTING_KEY)
      .maybeSingle();

    if (error) throw error;
    const normalized = normalizePortalOutageState(data?.setting_value || null);
    outageStateCache = {
      value: normalized,
      expiresAtMs: Date.now() + OUTAGE_STATE_CACHE_TTL_MS,
      inFlight: null,
    };
    return normalized;
  })();

  outageStateCache.inFlight = requestPromise;
  try {
    return await requestPromise;
  } finally {
    if (outageStateCache.inFlight === requestPromise) {
      outageStateCache.inFlight = null;
    }
  }
};

export const setPortalOutageSimulationState = async (
  input: unknown,
): Promise<PortalOutageSimulationState> => {
  const normalized = normalizePortalOutageState(input);
  const payload = {
    setting_key: PORTAL_OUTAGE_SETTING_KEY,
    setting_value: JSON.stringify(normalized),
    description: "Supabase outage simulation state for portal runtime guard.",
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("evaluation_settings")
    .update(payload)
    .eq("setting_key", PORTAL_OUTAGE_SETTING_KEY)
    .select("id");

  if (updateError) throw updateError;
  if (!Array.isArray(updated) || updated.length === 0) {
    const { error: insertError } = await supabase
      .from("evaluation_settings")
      .insert(payload);
    if (insertError) throw insertError;
  }

  outageStateCache = {
    value: normalized,
    expiresAtMs: Date.now() + OUTAGE_STATE_CACHE_TTL_MS,
    inFlight: null,
  };
  return normalized;
};

export const probeSupabaseAvailability = async (
  isAuthenticated: boolean,
): Promise<void> => {
  const scope: ProbeScope = isAuthenticated ? "authenticated" : "anonymous";
  const cacheEntry = probeCacheByScope[scope];
  const now = Date.now();
  if (cacheEntry.expiresAtMs > now) {
    return;
  }

  if (cacheEntry.inFlight) {
    return await cacheEntry.inFlight;
  }

  const requestPromise = (async () => {
    if (isAuthenticated) {
      const { error } = await supabase
        .from("evaluation_settings")
        .select("setting_key", { count: "exact", head: true })
        .limit(1);
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
    }
    cacheEntry.expiresAtMs = Date.now() + SUPABASE_PROBE_CACHE_TTL_MS;
  })();

  cacheEntry.inFlight = requestPromise;
  try {
    await requestPromise;
  } catch (error) {
    cacheEntry.expiresAtMs = 0;
    throw error;
  } finally {
    if (cacheEntry.inFlight === requestPromise) {
      cacheEntry.inFlight = null;
    }
  }
};
