import fs from 'node:fs';
const s=fs.readFileSync('lib/auth.ts','utf8');
for(const x of ['createHmac','timingSafeEqual','auth_date','WebAppData']) if(!s.includes(x)) throw new Error(`Missing crypto check: ${x}`);
console.log('Telegram crypto smoke: PASS');
