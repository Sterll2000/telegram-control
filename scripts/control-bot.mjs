import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token=process.env.TELEGRAM_BOT_TOKEN;
const appUrl=(process.env.NEXT_PUBLIC_APP_URL||'').replace(/\/$/,'');
const blackChats=new Set((process.env.CONTROL_BOT_BLACK_CHAT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
const blueChats=new Set((process.env.CONTROL_BOT_BLUE_CHAT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
const secret=process.env.ADMIN_SYNC_SECRET;
if(!token||!appUrl||!secret)throw new Error('Нужны TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL и ADMIN_SYNC_SECRET');
const api=`https://api.telegram.org/bot${token}`;
let offset=0;
async function tg(method,body){const r=await fetch(`${api}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!j.ok)throw new Error(j.description||method);return j.result}
async function exportList(group){const r=await fetch(`${appUrl}/api/admins/internal/export?group=${group}`,{headers:{'x-admin-sync-secret':secret}});const j=await r.json();if(!r.ok)throw new Error(j.error||'export error');return j.text}
function command(text){const t=(text||'').trim().toLocaleLowerCase('ru-RU');return t==='кто админ'||t==='!кто админ'}
while(true){
 try{
  const updates=await tg('getUpdates',{offset,timeout:50,allowed_updates:['message']});
  for(const u of updates){offset=u.update_id+1;const m=u.message;if(!m?.text||!command(m.text))continue;const id=String(m.chat.id);const group=blueChats.has(id)?'BLUE':blackChats.has(id)?'BLACK':null;if(!group)continue;const text=await exportList(group);await tg('sendMessage',{chat_id:m.chat.id,text,reply_to_message_id:m.message_id,disable_web_page_preview:true});}
 }catch(e){console.error('control-bot:',e);await new Promise(r=>setTimeout(r,3000))}
}
