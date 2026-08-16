import { NextResponse } from 'next/server';
import { clearSession, currentUser } from '@/lib/auth';
import { audit } from '@/lib/db';
export async function POST() { const me = await currentUser(); if (me) audit(me.id, 'LOGOUT', 'AUTH'); await clearSession(); return NextResponse.json({ ok: true }); }
