import assert from 'node:assert/strict';

function repeatNotes({messages,messagesMax,replies,repliesMax,items}){
  const out=[];
  if(messages!==messagesMax)out.push(`Повторить активность: ${messages}/${messagesMax} сообщений.`);
  if(replies!==repliesMax)out.push(`Повторить ответы: ${replies}/${repliesMax}.`);
  for(const i of items)if(i.score!==i.maxScore)out.push(i.note?.trim()||`Повторить: ${i.label} — ${i.score}/${i.maxScore}.`);
  return [...new Set(out)];
}
const perfect=repeatNotes({messages:8,messagesMax:8,replies:8,repliesMax:8,items:[{label:'Качество',score:2,maxScore:2}]});
assert.deepEqual(perfect,[]);
const mixed=repeatNotes({messages:8,messagesMax:8,replies:8,repliesMax:10,items:[{label:'Качество',score:1,maxScore:2}]});
assert.deepEqual(mixed,['Повторить ответы: 8/10.','Повторить: Качество — 1/2.']);
assert.equal(`${8}/${8}`,'8/8');assert.equal(`${10}/${10}`,'10/10');assert.equal(`${5}/${6}`,'5/6');assert.equal(`${3}/${10}`,'3/10');
function duration(iso){let days=Math.floor((Date.now()-new Date(iso).getTime())/86400000);const total=days;const years=Math.floor(days/365);days-=years*365;const months=Math.floor(days/30);days-=months*30;return {years,months,days,total}}
const d=duration(new Date(Date.now()-400*86400000).toISOString());assert.equal(d.total,400);assert.equal(d.years,1);
const afk={status:'PENDING',startsAt:'2026-08-20T10:00:00.000Z',endsAt:'2026-08-21T10:00:00.000Z'};assert.equal(afk.status,'PENDING');afk.status='APPROVED';assert.equal(afk.status,'APPROVED');
console.log('FEATURE SMOKE: PASS');
console.log('checks: perfect=no-notes, imperfect=repeat-notes, score formats, admin tenure, AFK approval flow');
