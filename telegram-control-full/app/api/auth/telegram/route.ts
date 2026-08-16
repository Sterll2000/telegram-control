import { NextResponse } from 'next/server';
import { audit, db, updateDB } from '@/lib/db';
import { buildTelegramUser, profileSessionId, setSession, validateTelegramInitData } from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({ initData: z.string().min(1).max(10000) });

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Telegram authentication is not configured' }, { status: 503 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validateTelegramInitData(parsed.data.initData, token)) {
    return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 });
  }

  const p = new URLSearchParams(parsed.data.initData);
  let tg: { id?: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };
  try { tg = JSON.parse(p.get('user') || '{}'); } catch { return NextResponse.json({ error: 'Invalid Telegram user payload' }, { status: 401 }); }
  if (!tg.id) return NextResponse.json({ error: 'Telegram user is missing' }, { status: 401 });

  let user = buildTelegramUser({ id: Number(tg.id), username: tg.username, first_name: tg.first_name, last_name: tg.last_name, photo_url: tg.photo_url });
  updateDB(d => {
    const existing = d.users.find(x => x.telegramId === Number(tg.id));
    if (existing) {
      existing.username = tg.username || existing.username;
      existing.firstName = tg.first_name || existing.firstName;
      existing.lastName = tg.last_name || existing.lastName;
      existing.avatarUrl = tg.photo_url || existing.avatarUrl;
      user = existing;
      return;
    }
    d.users.push(user);
  });

  await setSession(profileSessionId(user));
  audit(user.id, 'LOGIN', 'AUTH');
  return NextResponse.json({ ok: true, user: { id: user.id, telegramId: user.telegramId, username: user.username } });
}
