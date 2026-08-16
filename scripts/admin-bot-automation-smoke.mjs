import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
if (pkg.scripts['iris:bot'] !== 'node scripts/iris-bot-automation.mjs') throw new Error('iris:bot script missing');
const text = fs.readFileSync('scripts/iris-bot-automation.mjs','utf8');
for (const key of ['TELEGRAM_BOT_TOKEN','IRIS_CHAT_BLACK','IRIS_CHAT_BLUE','IRIS_SESSION','/api/admins/internal/sync','кто админ']) {
  if (!text.includes(key)) throw new Error(`Missing automation piece: ${key}`);
}
execFileSync(process.execPath,['--check','scripts/iris-bot-automation.mjs'],{stdio:'inherit'});
console.log('ADMIN BOT AUTOMATION SMOKE: OK');
