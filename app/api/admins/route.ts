import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { listAdminAssignments, syncIrisSnapshot } from '@/lib/admin-sync';

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(me, 'VIEW_CONTENT')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const group = new URL(req.url).searchParams.get('group') as 'BLACK'|'BLUE'|null;
  return NextResponse.json({ admins: listAdminAssignments(group ?? undefined), automation: db().adminAutomation });
}

const schema = z.object({ group: z.enum(['BLACK','BLUE']), text: z.string().min(1), sourceChat: z.string().min(1).max(128).default('browser-demo') });

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(me, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = schema.parse(await req.json());
    const result = syncIrisSnapshot(body.group, body.text, body.sourceChat);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 });
  }
}
