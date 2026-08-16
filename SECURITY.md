# Security notes

- Telegram `initData` is validated on the server with HMAC-SHA256.
- `auth_date` is freshness-checked.
- Sessions are signed and stored in an HTTP-only secure cookie.
- Roles and permissions are server-side; the client cannot grant itself access.
- Protected endpoints return 401/403 instead of relying on UI hiding.
- Demo account switching is disabled in production.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Use a long random `SESSION_SECRET` in production.
- Rotate bot/database secrets if they are ever exposed.
