export const ADMIN_RUNTIME_GUARD = {
  minGapMs: 12000,
  intervalMs: 75000,
  pendingFlushMs: 900,
  retryBaseMs: 7000,
  retryMaxMs: 120000,
  retryMultiplier: 1.7,
  retryJitterMs: 1400,
} as const;

export const ADMIN_BACKEND_HEALTH_GUARD = {
  intervalMs: 90000,
  failThreshold: 2,
  retryBaseMs: 9000,
  retryMaxMs: 180000,
  retryMultiplier: 1.8,
  retryJitterMs: 1600,
} as const;

export const SESSION_RUNTIME_GUARD = {
  warningAfterMs: 10 * 60 * 1000,
  autoLogoutAfterMs: 15 * 60 * 1000,
  sessionRotationAction: "session_ip_rotated",
  sessionNonceStorageKey: "tcc_session_nonce",
  tabHiddenAtStorageKey: "tcc_session_hidden_at",
  serverValidateMinGapMs: 12 * 1000,
  serverTouchMinGapMs: 55 * 1000,
  serverEdgeFunctionName: "session-guard",
} as const;

export const APP_POLLING_GUARD = {
  outageProbeIntervalMs: 30000,
  loginLandingStatsIntervalMs: 180000,
  notificationUnreadIntervalMs: 45000,
  accountAccessRefreshIntervalMs: 180000,
  pendingApprovalsRefreshIntervalMs: 180000,
  statusLogsRefreshIntervalMs: 90000,
  activeUserHeartbeatIntervalMs: 30000,
} as const;

type BackoffOptions = {
  baseMs: number;
  maxMs: number;
  multiplier: number;
  jitterMs: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const computeAdaptiveBackoffMs = (
  failureCount: number,
  options: BackoffOptions,
) => {
  const safeFailures = Math.max(1, Math.floor(Number(failureCount) || 1));
  const exp = Math.pow(options.multiplier, safeFailures - 1);
  const raw = options.baseMs * exp;
  const capped = clamp(raw, options.baseMs, options.maxMs);
  const jitter = Math.floor(Math.random() * Math.max(0, options.jitterMs));
  return Math.min(options.maxMs, Math.round(capped + jitter));
};
