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
