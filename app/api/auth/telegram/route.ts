import { NextResponse } from 'next/server';
import { audit, db, uid, updateDB } from '@/lib/db';
import { roleForStars } from '@/lib/permissions';
import { getLocalIrisRole, normalizeUsername } from '@/lib/admin-sync';
import { getSupabaseIrisRole, persistUserToDatabase } from '@/lib/admin-sync-db';
import { setSession, validateTelegramInitData } from '@/lib/auth';
import { z } from 'zod';
import type { User } from '@/lib/types';

const bodySchema = z.object({ initData: z.string().min(1).max(10000) });

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Telegram authentication is not configured' }, { status: 503 });
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE === 'true') {
    return NextResponse.json({ error: 'Demo mode is forbidden in production' }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validateTelegramInitData(parsed.data.initData, token)) {
    return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 });
  }

  const p = new URLSearchParams(parsed.data.initData);
  let tg: { id?: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };
  try {
    tg = JSON.parse(p.get('user') || '{}');
  } catch {
    return NextResponse.json({ error: 'Invalid Telegram user payload' }, { status: 401 });
  }
  if (!tg.id) return NextResponse.json({ error: 'Telegram user is missing' }, { status: 401 });

  const telegramId = Number(tg.id);
  const localIris = getLocalIrisRole(telegramId);
  let supabaseIris: { stars: number } | null = null;
  try {
    supabaseIris = await getSupabaseIrisRole(telegramId);
  } catch (error) {
    console.error('Iris role lookup failed:', error);
  }

  const irisStars = Math.max(localIris?.stars || 0, supabaseIris?.stars || 0);
  const initialAdmin = process.env.INITIAL_ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.INITIAL_ADMIN_TELEGRAM_ID);

  let user: User | undefined;
  let created = false;
  updateDB(d => {
    user = d.users.find(x => x.telegramId === telegramId);

    if (!user) {
      created = true;
      const stars = irisStars || (initialAdmin ? 5 : 1);
      user = {
        id: uid(),
        telegramId,
        username: tg.username || `user_${telegramId}`,
        firstName: tg.first_name || '',
        lastName: tg.last_name || '',
        avatarUrl: tg.photo_url,
        stars,
        role: roleForStars(stars),
      };
      d.users.push(user);
    } else {
      user.username = tg.username ?? user.username;
      user.firstName = tg.first_name ?? user.firstName;
      user.lastName = tg.last_name ?? user.lastName;
      user.avatarUrl = tg.photo_url ?? user.avatarUrl;

      // Iris is the source of truth for automatic admin roles.
      // If there is no Iris assignment, keep a manually assigned role.
      if (irisStars > 0) {
        user.stars = irisStars;
        user.role = roleForStars(irisStars);
      }
    }
  });

  if (!user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 });

  await setSession(user.id);
  audit(user.id, created ? 'CREATE' : 'LOGIN', 'AUTH', user.id, {
    telegramId,
    username: normalizeUsername(user.username),
    irisStars: irisStars || undefined,
  });

  try {
    await persistUserToDatabase(user);
  } catch (error) {
    console.error('Supabase user persistence failed:', error);
  }

  return NextResponse.json({
    ok: true,
    user: {
      telegramId: user.telegramId,
      stars: user.stars,
      role: user.role,
      irisManaged: irisStars > 0,
    },
  });
}
