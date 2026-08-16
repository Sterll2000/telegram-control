import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Browser demo login is disabled' }, { status: 403 });
  }

  const user = db().users[0];
  if (!user) return NextResponse.json({ error: 'No demo user configured' }, { status: 500 });
  await setSession(user);
  return NextResponse.json({ ok: true });
}
