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

## Автоматическая синхронизация админов Iris

### Production-схема

```text
Telegram Mini App
      │ initData (подписано Telegram)
      ▼
/api/auth/telegram
      │
      ├── Telegram ID пользователя
      ├── Iris assignment lookup
      └── stars → role

Iris / 2 Telegram-чата
      │
      ▼
MTProto user session (`iris:monitor`)
      │ polling + Iris ID 5443619563
      ▼
/api/admins/internal/sync
      │ x-admin-sync-secret
      ├── local role/assignment sync
      └── Supabase snapshot + telegram_id
```

Bot API не используется для чтения сообщения Iris: Telegram Bot API не передаёт одному боту сообщения другого бота. Поэтому чтение выполняет MTProto user session.

### Переменные

```env
ADMIN_SYNC_SECRET=<длинный случайный секрет>
NEXT_PUBLIC_APP_URL=https://your-domain.example
IRIS_API_ID=...
IRIS_API_HASH=...
IRIS_SESSION=...
IRIS_CHAT_BLACK=-100...
IRIS_CHAT_BLUE=-100...
IRIS_SCAN_LIMIT=500
IRIS_POLL_MS=1000
IRIS_AUTO_REQUEST_ENABLED=false
IRIS_AUTO_REQUEST_INTERVAL_MS=900000
IRIS_AVATAR_SYNC=true

TELEGRAM_BOT_TOKEN=...
```

### Запуск worker

Основной worker: 

```powershell
npm run iris:monitor
```

Он одновременно читает Iris и, если включена автоматизация, отправляет `кто админ` в оба чата через Bot API. Для этого Bot API-бот должен находиться в обоих чатах и иметь право писать.

Если автозапросы должны включаться из интерфейса «Админы → Автоматизация», оставь `IRIS_AUTO_REQUEST_ENABLED=false`: worker прочитает `enabled` через защищённый internal endpoint.

Разовый исторический скан:

```powershell
npm run iris:scan
```

`npm run iris:bot` теперь является только requester-worker для совместимости; для обычного production достаточно одного `npm run iris:monitor`.

### Как назначается роль

Iris — источник автоматических админских назначений. Сопоставление выполняется **по числовому Telegram ID**, а не по имени. Worker получает ID из Telegram mention entities/username/точного поиска по имени и передаёт их серверу.

При входе в Mini App сервер получает подписанный `Telegram.WebApp.initData`, извлекает `user.id` и ищет активные Iris assignments. Максимальный ранг из Чёрного и Синего чата становится ролью пользователя:

- 1★ → `USER`
- 2★ → `JUNIOR_STAFF`
- 3★ → `SENIOR_STAFF`
- 4★ → `SENIOR_ADMIN`
- 5★ → `SUPER_ADMIN`

Если Iris больше не содержит пользователя, Iris assignment удаляется и роль возвращается к 1★, **если нет отдельного `MANUAL` назначения**. Ручные назначения автоматикой Iris не удаляются.

### Supabase

Для production запусти:

```text
supabase/schema.sql
supabase/admin-sync.sql
```

В `iris_admin_assignments.telegram_id` хранится Telegram ID, поэтому вход Mini App может получить роль даже если локальный JSON worker/app экземпляр был перезапущен. `SUPABASE_SERVICE_ROLE_KEY` используется только на сервере и worker.

### Release smoke

Перед публикацией запусти:

```powershell
npm run release:smoke
npm run typecheck
npm run build
```

`release:smoke` отдельно проверяет, что `.env.local` не попадает в release, monitor использует polling, Telegram ID передаётся в sync API, а auth применяет Iris role.

## Полная автоматизация через Telegram

Для публикации Mini App используй обычного BotFather-бота приложения. MTProto session Iris остаётся серверным секретом и никогда не попадает в браузер.

В BotFather:

1. создай/выбери бота приложения;
2. настрой Menu Button / Mini App URL на HTTPS адрес сайта;
3. используй тот же `TELEGRAM_BOT_TOKEN`, который указан в production env;
4. открывай Mini App из Telegram — именно там присутствует подписанный `initData`.

Перед release обязательно проверь, что `DEMO_MODE=false`, `SESSION_SECRET` длинный случайный, `ADMIN_SYNC_SECRET` отдельный случайный секрет, а `.env.local` не находится в Git/release archive.
