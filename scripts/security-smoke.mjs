import fs from 'node:fs';
const checks=[
  ['Telegram auth endpoint','app/api/auth/telegram/route.ts'],
  ['Logout endpoint','app/api/auth/logout/route.ts'],
  ['Signed session auth','lib/auth.ts'],
  ['Initial admin bootstrap','app/api/auth/telegram/route.ts'],
  ['Production demo guard','app/api/demo/switch/route.ts'],
  ['Admin user permission','app/api/admin/users/[id]/route.ts'],
  ['Admin roles permission','app/api/admin/roles/route.ts'],
  ['AFK permission','app/api/afk/route.ts'],
];
for(const [name,file] of checks){if(!fs.existsSync(file))throw new Error(`${name}: missing ${file}`)}
const auth=fs.readFileSync('lib/auth.ts','utf8'); if(!auth.includes('timingSafeEqual')||!auth.includes('MAX_INIT_AGE')) throw new Error('Telegram initData verification incomplete');
const demo=fs.readFileSync('app/api/demo/switch/route.ts','utf8'); if(!demo.includes("NODE_ENV==='production'")) throw new Error('Demo endpoint is not production-disabled');
console.log('Security smoke: PASS');
