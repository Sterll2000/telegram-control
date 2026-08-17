# Telegram Control — Production Telegram Mini App

Next.js + TypeScript Telegram Mini App with Telegram `initData` authentication, signed HTTP-only sessions, centralized RBAC, 1–5 star ranks, tasks, AFK, navigation, statistics and audit logging.

## Telegram-first authentication

Users do not create passwords. The Mini App receives Telegram `initData`, the server validates it, and the account is created/updated by Telegram ID with the signed Telegram username/name/photo. See `TELEGRAM-AUTH.md`.

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
# set DEMO_MODE=true for local demo only
npm run typecheck
npm run test
npm run smoke
npm run security-smoke
npm run crypto-smoke
npm run rbac-smoke
npm run dev
```

Open `http://localhost:3000`.

## Production authentication

Set:

```env
TELEGRAM_BOT_TOKEN=...
INITIAL_ADMIN_TELEGRAM_ID=123456789
SESSION_SECRET=<long-random-secret>
DEMO_MODE=false
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

The browser sends `Telegram.WebApp.initData` to `/api/auth/telegram`. The server verifies the Telegram Web Apps HMAC signature and `auth_date`, creates or updates the user, then sets a signed HTTP-only session cookie. The browser cannot choose its own stars or role.

`DEMO_MODE` must remain `false` in production. `/api/demo/switch` is disabled in production.

## Rank and permissions

Stars map to default roles:

- ⭐ USER
- ⭐⭐ JUNIOR_STAFF
- ⭐⭐⭐ SENIOR_STAFF
- ⭐⭐⭐⭐ SENIOR_ADMIN
- ⭐⭐⭐⭐⭐ SUPER_ADMIN

Authorization is permission-based, not a frontend star check. Protected API routes return `401` when unauthenticated and `403` when the authenticated role lacks the required permission.

## Database

`supabase/schema.sql` contains the normalized PostgreSQL/Supabase schema. For a public deployment, use PostgreSQL/Supabase rather than the local JSON demo store.

## GitHub / Vercel / Telegram

See `DEPLOYMENT.md` for GitHub, Vercel, Supabase and BotFather setup.

<!-- Legacy admin model restored: manual admin IDs, admin list, prefixes, RBAC roles, and 1–5 star management. Telegram Mini App auth remains server-validated. -->
