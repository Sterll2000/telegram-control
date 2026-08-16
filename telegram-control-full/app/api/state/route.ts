import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(){
  const d=db();
  const me=await currentUser();
  if(!me)return NextResponse.json({error:'Unauthorized'},{status:401});
  const users=d.users.some(u=>u.id===me.id)?d.users:[me,...d.users];
  return NextResponse.json({me,users,nav:d.nav,tasks:d.tasks,afk:d.afk,audit:d.audit,permissions:d.rolePermissions[me.role]||[],rolePermissions:d.rolePermissions,stats:{checks:128,avg:91,messages:347}})
}
