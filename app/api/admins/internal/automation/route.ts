import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const secret = process.env.ADMIN_SYNC_SECRET;
  if (!secret || req.headers.get('x-admin-sync-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ automation: db().adminAutomation });
}
