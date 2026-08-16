import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db, updateDB } from '@/lib/db';
export async function GET(){const me=await currentUser();if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({notifications:db().notifications.filter(n=>n.userId===me.id).slice(0,50)});}
export async function PATCH(req:Request){const me=await currentUser();if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});const body=await req.json().catch(()=>({}));updateDB(d=>{for(const n of d.notifications.filter(x=>x.userId===me.id)){if(body.all||body.id===n.id)n.read=true}});return NextResponse.json({ok:true});}
