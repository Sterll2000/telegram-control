import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { audit, db, updateDB } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

const schema=z.object({enabled:z.boolean(),chats:z.object({BLACK:z.string().max(128),BLUE:z.string().max(128)})});

export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(me.stars < 4)return NextResponse.json({error:'Forbidden: automation is available to 4–5 star admins'},{status:403});
 return NextResponse.json({automation:db().adminAutomation});
}

export async function PATCH(req:Request){
 const me=await currentUser();if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(me.stars < 5)return NextResponse.json({error:'Forbidden: automation is available to 5 star admins'},{status:403});
 try{
  const body=schema.parse(await req.json());
  let automation;
  updateDB(d=>{d.adminAutomation={...d.adminAutomation,enabled:body.enabled,chats:{BLACK:body.chats.BLACK,BLUE:body.chats.BLUE}};automation=d.adminAutomation});
  audit(me.id,'UPDATE','ADMIN_AUTOMATION',undefined,{enabled:body.enabled,chats:body.chats});
  return NextResponse.json({ok:true,automation});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request'},{status:400})}
}

export async function POST(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(me.stars < 5)return NextResponse.json({error:'Forbidden: automation is available to 5 star admins'},{status:403});
 let requestedAt='';
 updateDB(d=>{requestedAt=new Date().toISOString();d.adminAutomation={...d.adminAutomation,syncRequestedAt:requestedAt,syncRequestedBy:me.id}});
 return NextResponse.json({ok:true,requestedAt});
}
