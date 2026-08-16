import { NextResponse } from 'next/server';
import { listAdminAssignments, ADMIN_GROUPS, ADMIN_RANKS } from '@/lib/admin-sync';

export async function GET(req:Request){
 const secret=process.env.ADMIN_SYNC_SECRET;
 if(!secret || req.headers.get('x-admin-sync-secret')!==secret)return NextResponse.json({error:'Forbidden'},{status:403});
 const group=(new URL(req.url).searchParams.get('group')||'BLACK') as 'BLACK'|'BLUE';
 const admins=listAdminAssignments(group);
 const lines=[`${ADMIN_GROUPS.find(x=>x.key===group)?.icon||''} ${ADMIN_GROUPS.find(x=>x.key===group)?.title||group}`];
 for(const rank of ADMIN_RANKS){
  const rows=admins.filter(x=>x.stars===rank.stars);
  if(!rows.length)continue;
  lines.push(`${'⭐'.repeat(rank.stars)} ${rank.title}`);
  for(const x of rows){const user=x.user;if(!user)continue;lines.push(`⚪ ${user.username?`@${user.username}`:user.firstName}`);}
 }
 return NextResponse.json({group,admins,text:lines.join('\n')});
}
