import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { audit, updateDB } from '@/lib/db';
import { z } from 'zod';
const schema = z.object({ firstName: z.string().min(1).max(60), lastName: z.string().max(60) });
export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = schema.parse(await req.json());
  updateDB(d => { const u=d.users.find(x=>x.id===me.id); if(u){u.firstName=body.firstName;u.lastName=body.lastName;} });
  audit(me.id,'UPDATE','PROFILE',me.id,{firstName:body.firstName,lastName:body.lastName});
  return NextResponse.json({ok:true});
}
