import fs from 'node:fs';
import path from 'node:path';
const required=['app/page.tsx','components/dashboard.tsx','lib/permissions.ts','lib/db.ts','lib/auth.ts','supabase/schema.sql','app/api/tasks/route.ts','app/api/afk/route.ts','app/api/admin/roles/route.ts'];
for(const f of required) if(!fs.existsSync(path.resolve(f))) throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(!pkg.scripts.dev||!pkg.scripts.build||!pkg.scripts.test) throw new Error('Missing npm scripts');
console.log(`Repository smoke: PASS (${required.length} critical files, package scripts present)`);
