# Telegram authentication

The app does not use a username/password form. Users are authenticated by Telegram Web Apps `initData`.

Flow:

1. User opens the Mini App from the Telegram bot.
2. `Telegram.WebApp.initData` is sent to `POST /api/auth/telegram`.
3. The server validates the Telegram HMAC signature and `auth_date` using `TELEGRAM_BOT_TOKEN`.
4. The server reads `user.id`, `username`, `first_name`, `last_name`, and `photo_url` from the signed payload.
5. The user is created or updated by Telegram ID.
6. A signed HTTP-only session cookie is issued.
7. All protected API operations use that server-side session and RBAC.

## Browser restriction

The Mini App is intentionally Telegram-only. Opening the URL in a normal browser does not authenticate the user and shows the Telegram-only screen. `DEMO_MODE` is not used in production.

## Administrators

Automatic administrator promotion through `INITIAL_ADMIN_TELEGRAM_ID` is disabled. New Telegram users receive the normal `USER` role.

To grant `SUPER_ADMIN` manually, set `ADMIN_TELEGRAM_IDS` in the production environment to a comma-separated list of Telegram numeric IDs, for example:

```text
ADMIN_TELEGRAM_IDS=123456789,987654321
```

The IDs are read only on the server. They are never exposed to the browser.

## Production storage

The current starter build uses a server-memory adapter in production so it does not attempt to write to Vercel's read-only filesystem. For durable multi-instance production data, migrate `lib/db.ts` to the normalized Supabase/PostgreSQL schema and keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
