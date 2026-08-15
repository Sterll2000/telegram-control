import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { audit, db, updateDB } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import type { Permission, RoleCode } from '@/lib/types';
const allowed = new Set<Permission>(['VIEW_CONTENT','EDIT_CONTENT','MANAGE_NAVIGATION','MANAGE_PREFIXES','MANAGE_USERS','MANAGE_TASKS','MANAGE_AFK','VIEW_STATISTICS','MANAGE_STATISTICS','VIEW_AUDIT_LOG']);
export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({error:'Unauthorized'},{status:401});
  if (me.role !== 'SUPER_ADMIN' || !hasPermission(me,'MANAGE_USERS',db().rolePermissions)) return NextResponse.json({error:'Forbidden'},{status:403});
  const body = await req.json() as {role:RoleCode;permissions:Permission[]};
  if(!body.role || !Array.isArray(body.permissions) || body.permissions.some(x=>!allowed.has(x))) return NextResponse.json({error:'Invalid permissions'},{status:400});
  if(body.role==='SUPER_ADMIN' && !body.permissions.includes('MANAGE_USERS')) return NextResponse.json({error:'SUPER_ADMIN must retain MANAGE_USERS'},{status:400});
  updateDB(d=>{d.rolePermissions[body.role]=[...new Set(body.permissions)]});
  audit(me.id,'UPDATE','ROLE',body.role,{permissions:body.permissions});
  return NextResponse.json({ok:true});
}
