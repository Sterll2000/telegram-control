import { NextResponse } from 'next/server';
import { audit, db, uid, updateDB } from '@/lib/db';
import { roleForStars } from '@/lib/permissions';
import { setSession, validateTelegramInitData } from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({ initData: z.string().min(1).max(10000) });

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

  let id = '';
  updateDB(d => {
    let u = d.users.find(x => x.telegramId === Number(tg.id));
    if (!u) {
      const isInitialAdmin = process.env.INITIAL_ADMIN_TELEGRAM_ID && String(tg.id) === String(process.env.INITIAL_ADMIN_TELEGRAM_ID);
      const stars = isInitialAdmin ? 5 : 1;
      u = { id: uid(), telegramId: Number(tg.id), username: tg.username || `user_${tg.id}`, firstName: tg.first_name || '', lastName: tg.last_name || '', avatarUrl: tg.photo_url, stars, role: roleForStars(stars) };
      d.users.push(u);
    } else {
      u.username = tg.username || u.username;
      u.firstName = tg.first_name || u.firstName;
      u.lastName = tg.last_name || u.lastName;
      u.avatarUrl = tg.photo_url || u.avatarUrl;
    }
    id = u.id;
  });
  await setSession(id);
  audit(id, 'LOGIN', 'AUTH');
  return NextResponse.json({ ok: true });
}
