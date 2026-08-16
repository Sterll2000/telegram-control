import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const checks = [];
const read = file => fs.readFileSync(file, 'utf8');

for (const file of [
  'app/api/auth/telegram/route.ts',
  'app/api/admins/internal/sync/route.ts',
  'lib/admin-sync.ts',
  'lib/admin-sync-db.ts',
  'scripts/iris-monitor.mjs',
  'supabase/admin-sync.sql',
]) {
  checks.push([`Файл ${file} существует`, fs.existsSync(file)]);
}

const monitor = read('scripts/iris-monitor.mjs');
const auth = read('app/api/auth/telegram/route.ts');
const sync = read('app/api/admins/internal/sync/route.ts');
const adminSync = read('lib/admin-sync.ts');
const dbSync = read('lib/admin-sync-db.ts');
const sql = read('supabase/admin-sync.sql');

checks.push(['Monitor использует polling', monitor.includes('getMessages') && monitor.includes('setInterval')]);
checks.push(['Monitor фильтрует Iris по ID', monitor.includes("IRIS_BOT_ID = '5443619563'")]);
checks.push(['Monitor отправляет snapshot на сервер', monitor.includes('/api/admins/internal/sync')]);
checks.push(['Monitor передаёт Telegram ID пользователей', monitor.includes('telegramId: Number(telegramId)')]);
checks.push(['Monitor обрабатывает Telegram mention entities', monitor.includes('MessageEntityMentionName')]);
checks.push(['Auth сверяет Iris по Telegram ID', auth.includes('getSupabaseIrisRole') && auth.includes('getLocalIrisRole')]);
checks.push(['Auth выдаёт роль по Iris stars', auth.includes('roleForStars(irisStars)')]);
checks.push(['Sync принимает member metadata', sync.includes('telegramId') && sync.includes('displayName')]);
checks.push(['Local sync отзывает Iris роль после удаления', adminSync.includes("user.role = roleForStars(1)")]);
checks.push(['Supabase assignment хранит telegram_id', sql.includes('telegram_id bigint')]);
checks.push(['Supabase role lookup существует', dbSync.includes("from('iris_admin_assignments')") && dbSync.includes("eq('telegram_id', telegramId)")]);
checks.push(['Production env не содержит demo defaults', read('.env.production.example').includes('DEMO_MODE=false')]);
checks.push(['Секретный .env.local не должен попадать в release', !fs.existsSync('.env.local')]);

for (const file of ['scripts/iris-monitor.mjs', 'scripts/iris-bot-automation.mjs', 'scripts/iris-scan.mjs']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  ok &&= pass;
}

process.exit(ok ? 0 : 1);
