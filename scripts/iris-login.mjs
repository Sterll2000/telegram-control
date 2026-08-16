import dotenv from 'dotenv';
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

dotenv.config({ path: '.env.local' });

const apiId = Number(process.env.IRIS_API_ID);
const apiHash = process.env.IRIS_API_HASH?.trim();
if (!Number.isInteger(apiId) || !apiHash) {
  throw new Error('Сначала укажи IRIS_API_ID и IRIS_API_HASH в .env.local');
}

const rl = readline.createInterface({ input, output });
const ask = async (question, fallback = '') => {
  const value = (await rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim();
  return value || fallback;
};

const phone = process.env.IRIS_LOGIN_PHONE?.trim() || await ask('Номер Telegram-аккаунта', '+');
if (!phone || phone === '+') {
  rl.close();
  throw new Error('Номер телефона не указан.');
}

const session = new StringSession(process.env.IRIS_SESSION || '');
const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

try {
  await client.start({
    phoneNumber: async () => phone,
    phoneCode: async () => ask('Код из Telegram'),
    password: async () => process.env.IRIS_2FA_PASSWORD?.trim() || ask('Пароль 2FA Telegram'),
    onError: (error) => console.error('Telegram:', error?.message || error),
  });

  const saved = client.session.save();
  if (!saved) throw new Error('Telegram не вернул session string.');

  const envPath = '.env.local';
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (/^IRIS_SESSION=/m.test(env)) {
    env = env.replace(/^IRIS_SESSION=.*$/m, `IRIS_SESSION=${saved}`);
  } else {
    env = `${env.replace(/\s*$/, '')}\nIRIS_SESSION=${saved}\n`;
  }
  fs.writeFileSync(envPath, env, 'utf8');

  console.log('\n✓ Telegram userbot авторизован.');
  console.log('✓ IRIS_SESSION сохранён в .env.local');
  console.log('Теперь можно запускать: npm run iris:monitor');
} finally {
  rl.close();
  await client.disconnect();
}
