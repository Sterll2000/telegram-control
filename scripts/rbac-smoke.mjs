import fs from 'node:fs';
const s=fs.readFileSync('lib/permissions.ts','utf8');
for(const x of ['MANAGE_TASKS','MANAGE_USERS','SUPER_ADMIN','SENIOR_ADMIN']) if(!s.includes(x)) throw new Error(`Missing RBAC marker: ${x}`);
console.log('RBAC smoke: PASS');
