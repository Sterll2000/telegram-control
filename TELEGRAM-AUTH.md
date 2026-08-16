# Telegram authentication

The app does not use a username/password form. Users are authenticated by Telegram Web Apps `initData`.

Flow:

1. User opens the Mini App from the Telegram bot.
2. `Telegram.WebApp.initData` is sent to `POST /api/auth/telegram`.
3. The server validates the Telegram HMAC signature and `auth_date` using `TELEGRAM_BOT_TOKEN`.
4. The server reads `user.id`, `username`, `first_name`, `last_name`, and `photo_url` from the signed payload.
5. The user is created or updated by Telegram ID.
6. The server checks active Iris assignments by the same numeric Telegram ID and, when present, applies the highest Iris rank from BLACK/BLUE.
7. A signed HTTP-only session cookie is issued.
8. All protected API operations use that server-side session and RBAC.

## First administrator

Set `INITIAL_ADMIN_TELEGRAM_ID` to the numeric Telegram ID of the first administrator. On first login that account receives 5 stars and `SUPER_ADMIN`.

After the first admin has logged in and access has been verified, remove `INITIAL_ADMIN_TELEGRAM_ID` from the production environment and redeploy.

## Giving 5 stars

For the local JSON database, after the target user has opened the Mini App once:

```powershell
npm run admin:stars -- 123456789 5
```

The command updates the user's stars and role and writes an audit record. It must be run on the server/environment that owns the database file.

The web admin panel also exposes user management to roles holding `MANAGE_USERS`.

## Important production database note

`lib/db.ts` is a local JSON adapter intended for the current starter/demo build. Before running multiple production instances, migrate the adapter to the normalized Supabase/PostgreSQL schema in `supabase/schema.sql`. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Iris role on login

Iris is not an authentication provider. Telegram `initData` remains the only authentication source. Iris only supplies the role/rank assignment.

The match key is the numeric Telegram account ID. Usernames and display names are only metadata/fallbacks for the worker.
