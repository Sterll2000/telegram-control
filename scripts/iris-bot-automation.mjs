import 'dotenv/config';

const required = ['TELEGRAM_BOT_TOKEN', 'NEXT_PUBLIC_APP_URL', 'ADMIN_SYNC_SECRET', 'IRIS_CHAT_BLACK', 'IRIS_CHAT_BLUE'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) throw new Error(`Не заданы переменные: ${missing.join(', ')}`);

const appUrl = String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '');
const secret = process.env.ADMIN_SYNC_SECRET;
const botApi = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const chats = {
  BLACK: String(process.env.IRIS_CHAT_BLACK),
  BLUE: String(process.env.IRIS_CHAT_BLUE),
};
const intervalMs = Math.max(60_000, Number(process.env.IRIS_AUTO_REQUEST_INTERVAL_MS || 900_000));
let lastRequestAt = 0;

async function getAutomation() {
  const response = await fetch(`${appUrl}/api/admins/internal/automation`, {
    headers: { 'x-admin-sync-secret': secret },
  });
  if (!response.ok) throw new Error(`Automation config HTTP ${response.status}`);
  return (await response.json()).automation || {};
}

async function sendMessage(chatId) {
  const response = await fetch(`${botApi}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: 'кто админ' }),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.description || 'Telegram Bot API error');
}

async function cycle() {
  const automation = await getAutomation();
  if (!automation.enabled) return;

  const requested = Boolean(automation.syncRequestedAt);
  if (!requested && Date.now() - lastRequestAt < intervalMs) return;
  if (requested && Date.now() - lastRequestAt < 60_000) return;

  for (const [group, chatId] of Object.entries(chats)) {
    try {
      await sendMessage(chatId);
      console.log(new Date().toISOString(), `REQUEST ${group} -> ${chatId}`);
    } catch (error) {
      console.error(`REQUEST ${group}:`, error?.message || error);
    }
  }
  lastRequestAt = Date.now();
}

console.log('Iris Bot requester запущен. Чтением Iris занимается iris:monitor.');
await cycle();
const timer = setInterval(() => cycle().catch(error => console.error('REQUESTER:', error)), 15_000);

async function shutdown(signal) {
  console.log(`Получен ${signal}, останавливаю requester...`);
  clearInterval(timer);
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
