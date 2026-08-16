import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const required=['IRIS_API_ID','IRIS_API_HASH','IRIS_SESSION','IRIS_CHAT_BLACK','IRIS_CHAT_BLUE','NEXT_PUBLIC_APP_URL','ADMIN_SYNC_SECRET'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length) throw new Error(`Не заданы переменные: ${missing.join(', ')}`);

const apiId=Number(process.env.IRIS_API_ID);
if(!Number.isInteger(apiId)) throw new Error('IRIS_API_ID должен быть числом');
const session=new StringSession(process.env.IRIS_SESSION);
const client=new TelegramClient(session,apiId,process.env.IRIS_API_HASH,{connectionRetries:5});
const chats={BLACK:process.env.IRIS_CHAT_BLACK,BLUE:process.env.IRIS_CHAT_BLUE};
const allowedIris=(process.env.IRIS_USERNAME||'').replace(/^@/,'').toLowerCase();
const limit=Math.max(50,Math.min(Number(process.env.IRIS_SCAN_LIMIT||500),5000));
const apiUrl=process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,'')+'/api/admins/internal/sync';

function validSnapshot(text){
  return /[⭐]/u.test(text) && /(Владелец|Гл\s*Админ|Админ|Ст\.стажер|Стажер|Император|Рука Императора|Инквизитор|Имперский маг|Императорский гвардеец)/iu.test(text);
}

async function isFromIris(message){
  if(!allowedIris) return true;
  try{
    const sender=await message.getSender();
    return (sender?.username||'').toLowerCase()===allowedIris;
  }catch{return false;}
}

async function push(group,text,sourceChat){
  const r=await fetch(apiUrl,{method:'POST',headers:{'content-type':'application/json','x-admin-sync-secret':process.env.ADMIN_SYNC_SECRET},body:JSON.stringify({group,text,sourceChat})});
  const body=await r.text();
  if(!r.ok) throw new Error(`Sync HTTP ${r.status}: ${body}`);
  return body;
}

await client.start({
  phoneNumber:async()=>process.env.IRIS_LOGIN_PHONE||'',
  password:async()=>process.env.IRIS_2FA_PASSWORD||'',
  phoneCode:async()=>{throw new Error('IRIS_SESSION отсутствует или истёк. Создай новую MTProto session отдельно.')},
  onError:err=>console.error(err),
});

for(const [group,chatId] of Object.entries(chats)){
  console.log(`Сканирование ${group}: ${chatId}, сообщений: ${limit}`);
  let found=0;
  for await(const message of client.iterMessages(chatId,{limit})){
    const text=(message.message||'').trim();
    if(!text || !validSnapshot(text) || !(await isFromIris(message))) continue;
    await push(group,text,String(chatId));
    found++;
    // Последний подходящий снимок важнее старых. После него историю дальше можно не отправлять.
    break;
  }
  console.log(`Сканирование ${group} завершено. Найдено снимков: ${found}`);
}

await client.disconnect();
