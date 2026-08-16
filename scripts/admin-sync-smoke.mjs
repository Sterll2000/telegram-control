import assert from 'node:assert/strict';
const { parseIrisMessage } = await import('../lib/admin-sync.ts');
const text = `⭐⭐⭐ Админ\n⚪ @alpha\n⚪ @beta\n⭐⭐ Ст.стажер\n⚪ @gamma`;
const parsed = parseIrisMessage(text);
assert.equal(parsed.length, 3);
assert.equal(parsed.find(x=>x.username==='alpha').stars, 3);
assert.equal(parsed.find(x=>x.username==='gamma').stars, 2);
console.log('Admin sync smoke: PASS');
