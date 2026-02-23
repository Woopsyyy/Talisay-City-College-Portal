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

## `cached-dashboard-stats`

Purpose:
- Return admin dashboard stats with Redis cache (Upstash).
- Reduce repeated high-cost aggregate queries on every dashboard load.

### Deploy

```bash
supabase functions deploy cached-dashboard-stats
```

### Required secrets (set in Supabase project)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `DASHBOARD_STATS_CACHE_TTL_SECONDS` (default: `60`, range: `10` to `3600`)
- `DASHBOARD_STATS_REDIS_BYPASS_SECONDS` (default: `300`, range: `30` to `3600`)

### Request

`POST /functions/v1/cached-dashboard-stats`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body (optional):

```json
{
  "force_refresh": false,
  "ttl_seconds": 60
}
```

Notes:
- Caller must be an authenticated admin user.
- If cache misses (or `force_refresh` is true), the function recomputes stats and rewrites cache.
