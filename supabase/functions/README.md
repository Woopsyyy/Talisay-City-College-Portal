# Supabase Edge Functions

## `set-auth-password`

Purpose:
- Reset or provision a user's Supabase Auth password using admin-only access.
- Keep `public.users` as profile/role storage, while password authority stays in `auth.users`.

### Deploy

```bash
supabase functions deploy set-auth-password
```

### Required secrets (set in Supabase project)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Request

`POST /functions/v1/set-auth-password`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:

```json
{
  "user_id": 123,
  "password": "new-strong-password",
  "email": "optional@local.tcc"
}
```

Notes:
- Caller must be an authenticated admin user (`public.users` role/roles includes `admin`).
- The function binds `public.users.auth_uid` if missing or outdated.

---

## `session-guard`

Purpose:
- Enforce a server-side 15-minute inactivity session cutoff.
- Maintain a per-user session guard record that is touched by active users and expires stale sessions.
- Enforce admin single-session guard via session nonce mismatch detection.

### Deploy

```bash
supabase functions deploy session-guard --no-verify-jwt
```

### Required secrets (set in Supabase project)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional hardening:
- `EDGE_ALLOWED_ORIGINS` (comma-separated allow-list, example: `https://portal.example.com,https://admin.example.com`)

### Request

`POST /functions/v1/session-guard`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:

```json
{
  "action": "touch",
  "session_nonce": "1699999999999-abcd1234-efgh5678",
  "ttl_minutes": 15,
  "reason": "activity_heartbeat"
}
```

`action` values:
- `start`
- `touch`
- `validate`
- `logout`

Notes:
- Session state is stored in `public.evaluation_settings` under `session_guard_user_<user_id>`.
- `touch` extends expiry for active sessions; expired sessions return `valid: false` with `reason: inactivity_timeout`.
- For admin users, a nonce mismatch returns `reason: session_rotated` to force old tabs/devices out.

---

## `cached-dashboard-stats`

Purpose:
- Return admin dashboard stats with Redis cache (Upstash).
- Reduce repeated high-cost aggregate queries on every dashboard load.

### Deploy

```bash
cd ~/project/school\ projects/TalisayCityCollegePortal
supabase functions deploy cached-dashboard-stats --no-verify-jwt
```

### Required secrets (set in Supabase project)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional hardening:
- `EDGE_ALLOWED_ORIGINS` (comma-separated allow-list)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `DASHBOARD_STATS_CACHE_TTL_SECONDS` (default: `60`, range: `10` to `3600`)
- `DASHBOARD_STATS_REDIS_BYPASS_SECONDS` (default: `300`, range: `30` to `3600`)
- `EDGE_ALLOWED_ORIGINS` (comma-separated allow-list)

### Request

`POST /functions/v1/cached-dashboard-stats`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body (optional):

```json
{
  "force_refresh": false,
  "ttl_seconds": 60,
  "page_path": "/admin/dashboard/overview",
  "page_query": "",
  "view_name": "admin_dashboard_overview"
}
```

Notes:
- Gateway JWT verification is disabled for this function (`verify_jwt = false`) because we validate JWT manually inside the function and log unauthorized attempts.
- Caller must still be an authenticated admin user.
- If cache misses (or `force_refresh` is true), the function recomputes stats and rewrites cache.
- Cache activity is written to `public.status_logs` with category `cache`, including page metadata.

---

## `cached-portal-content`

Purpose:
- Return Redis-cached portal content for high-traffic views:
  - Announcements (`admin`, `teacher`, `student` audiences)
  - Evaluation settings
- Reduce repeated table scans on announcement/evaluation pages.

### Deploy

```bash
cd ~/project/school\ projects/TalisayCityCollegePortal
supabase functions deploy cached-portal-content --no-verify-jwt
```

### Required secrets (set in Supabase project)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `PORTAL_ANNOUNCEMENTS_CACHE_TTL_SECONDS` (default: `45`, range: `10` to `3600`)
- `PORTAL_EVALUATION_SETTINGS_CACHE_TTL_SECONDS` (default: `300`, range: `10` to `3600`)
- `PORTAL_CONTENT_REDIS_BYPASS_SECONDS` (default: `300`, range: `30` to `3600`)
- `EDGE_ALLOWED_ORIGINS` (comma-separated allow-list)

### Request

`POST /functions/v1/cached-portal-content`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:

```json
{
  "resource": "announcements",
  "audience": "student",
  "force_refresh": false,
  "ttl_seconds": 45
}
```

`resource` values:
- `announcements`
- `evaluation_settings`

`audience` values:
- `admin`
- `teacher`
- `student`

Notes:
- Gateway JWT verification is disabled for this function (`verify_jwt = false`) because JWT is validated manually inside the function.
- Audience access is still role-checked server-side.
- Student announcement cache keys are segmented by student scope (department/year).
- If Redis is unavailable/full, the function falls back to direct DB query path.
- Cache activity is written to `public.status_logs` with category `cache` (`portal_cache_hit`, `portal_cache_miss`, `portal_cache_bypass`, `portal_cache_unauthorized`).
