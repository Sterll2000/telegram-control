import { NextResponse } from 'next/server';
import { audit, db, uid, updateDB } from '@/lib/db';
import { roleForStars } from '@/lib/permissions';
import { setSession, validateTelegramInitData } from '@/lib/auth';
import type { User } from '@/lib/types';
import { z } from 'zod';

const bodySchema = z.object({ initData: z.string().min(1).max(10000) });

function manualAdminIds() {
  const values = [process.env.ADMIN_TELEGRAM_IDS || '', process.env.INITIAL_ADMIN_TELEGRAM_ID || ''];
  return new Set(values.flatMap(v => v.split(',')).map(x => x.trim()).filter(Boolean));
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Telegram authentication is not configured' }, { status: 503 });
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE === 'true') return NextResponse.json({ error: 'Demo mode is forbidden in production' }, { status: 500 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validateTelegramInitData(parsed.data.initData, token)) {
    return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 });
  }

  const p = new URLSearchParams(parsed.data.initData);
  let tg: { id?: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };
  try { tg = JSON.parse(p.get('user') || '{}'); } catch { return NextResponse.json({ error: 'Invalid Telegram user payload' }, { status: 401 }); }
  if (!tg.id) return NextResponse.json({ error: 'Telegram user is missing' }, { status: 401 });

  const isManualAdmin = manualAdminIds().has(String(tg.id));
  let user: User;
  try {
    const existing = db().users.find(x => x.telegramId === Number(tg.id));
    if (existing) {
      const adminPatch = isManualAdmin ? { stars: 5, role: roleForStars(5) as User['role'] } : {};
      user = { ...existing, ...adminPatch, username: tg.username || existing.username, firstName: tg.first_name || existing.firstName, lastName: tg.last_name || existing.lastName, avatarUrl: tg.photo_url || existing.avatarUrl };
      try { updateDB(d => { const u = d.users.find(x => x.id === existing.id); if (u) Object.assign(u, user); }); } catch {}
    } else {
      const stars = isManualAdmin ? 5 : 1;
      user = { id: uid(), telegramId: Number(tg.id), username: tg.username || `user_${tg.id}`, firstName: tg.first_name || '', lastName: tg.last_name || '', avatarUrl: tg.photo_url, stars, role: roleForStars(stars) };
      try { updateDB(d => d.users.push(user)); } catch {}
    }

    await setSession(user);
    try { audit(user.id, 'LOGIN', 'AUTH'); } catch {}
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Telegram authentication failed' }, { status: 500 });
  }
}
