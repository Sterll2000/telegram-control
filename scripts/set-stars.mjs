import fs from 'node:fs';
import path from 'node:path';

const [, , telegramIdArg, starsArg] = process.argv;
if (!telegramIdArg || !starsArg) {
  console.error('Usage: npm run admin:stars -- <telegram_id> <1-5>');
  process.exit(1);
}
const telegramId = Number(telegramIdArg);
const stars = Number(starsArg);
if (!Number.isSafeInteger(telegramId) || telegramId <= 0) throw new Error('Invalid Telegram ID');
if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Stars must be 1..5');

const role = stars >= 5 ? 'SUPER_ADMIN' : stars === 4 ? 'SENIOR_ADMIN' : stars === 3 ? 'SENIOR_STAFF' : stars === 2 ? 'JUNIOR_STAFF' : 'USER';
const file = path.join(process.cwd(), 'data', 'db.json');
if (!fs.existsSync(file)) throw new Error(`Local database not found: ${file}. Run the app once in DEMO_MODE or create the database first.`);
const db = JSON.parse(fs.readFileSync(file, 'utf8'));
const user = db.users.find((u) => Number(u.telegramId) === telegramId || u.username === telegramIdArg.replace(/^@/, ''));
if (!user) throw new Error(`User ${telegramIdArg} not found. They must open the Telegram Mini App at least once first.`);

user.stars = stars;
user.role = role;
db.audit ??= [];
db.audit.unshift({
  id: crypto.randomUUID(),
  actorId: process.env.CLI_ACTOR_USER_ID || db.users.find((u) => u.role === 'SUPER_ADMIN')?.id || user.id,
  action: 'UPDATE',
  entity: 'USER',
  entityId: user.id,
  payload: { stars, role, source: 'cli' },
  createdAt: new Date().toISOString(),
});
fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(`OK: @${user.username} (${user.telegramId}) -> ${'⭐'.repeat(stars)} ${role}`);
