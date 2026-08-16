import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { audit, db, uid, updateDB } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import type { AdminCheck } from '@/lib/types';
import { persistAdminCheckToDatabase } from '@/lib/admin-sync-db';

const itemSchema=z.object({id:z.string().min(1).max(64),label:z.string().min(1).max(100),score:z.number().int().min(0),maxScore:z.number().int().min(1),note:z.string().max(300).optional()});
const schema=z.object({adminId:z.string().min(1),messages:z.number().int().min(0),messagesMax:z.number().int().min(1),replies:z.number().int().min(0),repliesMax:z.number().int().min(1),items:z.array(itemSchema).max(30)});

export async function GET(){
 const me=await currentUser(); if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
 const d=db();
 const checks=d.checks.map(c=>({...c,admin:d.users.find(u=>u.id===c.adminId),reviewer:d.users.find(u=>u.id===c.reviewerId)}));
 return NextResponse.json({checks});
}
export async function POST(req:Request){
 const me=await currentUser(); if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(me.stars<4 || !hasPermission(me,'VIEW_STATISTICS',db().rolePermissions))return NextResponse.json({error:'Проверки могут вносить администраторы 4–5 звёзд.'},{status:403});
 try{
  const p=schema.parse(await req.json()); const d=db();
  const assignment=d.adminAssignments.find(a=>a.userId===p.adminId);
  if(!assignment)return NextResponse.json({error:'Администратор не найден во вкладке «Админы».'},{status:400});
  if(p.messages>p.messagesMax||p.replies>p.repliesMax||p.items.some(i=>i.score>i.maxScore))return NextResponse.json({error:'Фактический результат не может быть выше максимального.'},{status:400});
  const score=p.messages+p.replies+p.items.reduce((a,i)=>a+i.score,0), maxScore=p.messagesMax+p.repliesMax+p.items.reduce((a,i)=>a+i.maxScore,0);
  const repeatNotes:string[]=[];
  if(p.messages!==p.messagesMax)repeatNotes.push(`Повторить активность: ${p.messages}/${p.messagesMax} сообщений.`);
  if(p.replies!==p.repliesMax)repeatNotes.push(`Повторить ответы: ${p.replies}/${p.repliesMax}.`);
  for(const i of p.items){if(i.score!==i.maxScore)repeatNotes.push(i.note?.trim()||`Повторить: ${i.label} — ${i.score}/${i.maxScore}.`)}
  const check:AdminCheck={id:uid(),adminId:p.adminId,reviewerId:me.id,checkedAt:new Date().toISOString(),messages:p.messages,messagesMax:p.messagesMax,replies:p.replies,repliesMax:p.repliesMax,score,maxScore,items:p.items,repeatNotes:[...new Set(repeatNotes)]};
  updateDB(x=>x.checks.unshift(check)); persistAdminCheckToDatabase(check).catch(error=>console.error('check persistence:',error)); audit(me.id,'CREATE','CHECK',check.id,{adminId:p.adminId,score,maxScore,messages:`${p.messages}/${p.messagesMax}`,replies:`${p.replies}/${p.repliesMax}`});
  return NextResponse.json({ok:true,check});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Некорректные данные'},{status:400})}
}
