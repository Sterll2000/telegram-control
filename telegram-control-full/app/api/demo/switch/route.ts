import { NextResponse } from 'next/server';
import { setSession, currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
export async function POST(){if(process.env.DEMO_MODE!=='true'||process.env.NODE_ENV==='production')return NextResponse.json({error:'Demo mode disabled'},{status:404});const d=db();const cur=await currentUser();const idx=Math.max(0,d.users.findIndex(u=>u.id===cur?.id));const next=d.users[(idx+1)%d.users.length];await setSession(next);return NextResponse.json({me:next})}
