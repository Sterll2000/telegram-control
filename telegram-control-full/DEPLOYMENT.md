# Production deployment

## 1. GitHub

```powershell
git init
git add .
git commit -m "Initial production release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/telegram-control.git
git push -u origin main
```

Never commit `.env.local` or bot tokens.

## 2. Supabase

Create a Supabase project and run `supabase/schema.sql` in SQL Editor. Add the production database variables in Vercel. For a full production migration, replace the local `lib/db.ts` adapter with the Supabase repository layer; do not expose the service role key to the browser.

## 3. Hosting

Vercel is optional. Any Next.js host that provides HTTPS and server-side environment variables can host the app. If Vercel phone verification blocks your account, use another Next.js host; the Telegram authentication flow does not depend on Vercel.

## 4. Vercel

Import the GitHub repository into Vercel. Add:

- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `INITIAL_ADMIN_TELEGRAM_ID`
- `SESSION_SECRET`
- `DEMO_MODE=false`
- `NEXT_PUBLIC_APP_URL=https://YOUR-DOMAIN`
- Supabase variables

Deploy and verify `https://YOUR-DOMAIN`.

## 5. BotFather

In `@BotFather` configure the bot's Mini App / Menu Button URL to the HTTPS Vercel/custom-domain URL.

Open the app from Telegram, not from an arbitrary browser URL, so `Telegram.WebApp.initData` is present.

## 6. First administrator

Set `INITIAL_ADMIN_TELEGRAM_ID` to the numeric Telegram ID of the first administrator. Open the Mini App once. The account is created as ⭐⭐⭐⭐⭐ `SUPER_ADMIN`. After verifying access, remove or clear `INITIAL_ADMIN_TELEGRAM_ID` and redeploy so future users cannot be bootstrapped as admins.
