import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import type { User } from './types';
import { roleForStars } from './permissions';

export const SESSION = process.env.NODE_ENV === 'production' ? '__Host-tc_session' : 'tc_session';
const MAX_INIT_AGE = 60 * 60;
const SESSION_PREFIX = 'tg_';

type SessionProfile = {
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  stars: number;
  role: User['role'];
};

function secret() {
  // SESSION_SECRET is preferred. In production we also accept the bot token as
  // a fallback so a missing Vercel SESSION_SECRET cannot break Telegram login.
  const value = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || (process.env.NODE_ENV !== 'production' ? 'local-development-secret-change-me' : '');
  if (!value) throw new Error('SESSION_SECRET or TELEGRAM_BOT_TOKEN is required in production');
  return value;
}

function sign(id: string) {
  return crypto.createHmac('sha256', secret()).update(id).digest('hex');
}

function sessionValue(id: string) {
  return `${id}.${sign(id)}`;
}

function verifySession(value?: string) {
  if (!value) return null;
  const [id, sig] = value.split('.');
  if (!id || !sig) return null;
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

function adminTelegramIds() {
  return new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
}

function encodeProfile(profile: SessionProfile) {
  return SESSION_PREFIX + Buffer.from(JSON.stringify(profile), 'utf8').toString('base64url');
}

function decodeProfile(id: string): SessionProfile | null {
  if (!id.startsWith(SESSION_PREFIX)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(id.slice(SESSION_PREFIX.length), 'base64url').toString('utf8')) as SessionProfile;
    if (!Number.isFinite(Number(parsed.telegramId)) || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function userFromProfile(profile: SessionProfile): User {
  return {
    id: `tg-${profile.telegramId}`,
    telegramId: profile.telegramId,
    username: profile.username || `user_${profile.telegramId}`,
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    avatarUrl: profile.avatarUrl,
    stars: profile.stars,
    role: profile.role,
  };
}

export async function currentUser(): Promise<User | null> {
  const c = await cookies();
  const id = verifySession(c.get(SESSION)?.value);
  const d = db();
  const found = id ? d.users.find(u => u.id === id) : undefined;
  if (found) return found;
  const profile = id ? decodeProfile(id) : null;
  return profile ? userFromProfile(profile) : null;
}

export async function requireUser() {
  return currentUser();
}

export async function setSession(id: string) {
  const c = await cookies();
  c.set(SESSION, sessionValue(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.set(SESSION, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export function validateTelegramInitData(initData: string, botToken: string) {
  try {
    const p = new URLSearchParams(initData);
    const hash = p.get('hash');
    const authDate = Number(p.get('auth_date'));
    if (!hash || !Number.isFinite(authDate)) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > MAX_INIT_AGE) return false;
    p.delete('hash');
    const data = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calc = crypto.createHmac('sha256', secretKey).update(data).digest('hex');
    if (calc.length !== hash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function buildTelegramUser(input: { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string }): User {
  const telegramId = Number(input.id);
  const isAdmin = adminTelegramIds().has(String(telegramId));
  const stars = isAdmin ? 5 : 1;
  const role = roleForStars(stars);
  return {
    id: `tg-${telegramId}`,
    telegramId,
    username: input.username || `user_${telegramId}`,
    firstName: input.first_name || '',
    lastName: input.last_name || '',
    avatarUrl: input.photo_url,
    stars,
    role,
  };
}

export function profileSessionId(user: User) {
  return encodeProfile({
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    stars: user.stars,
    role: user.role,
  });
}

export function sessionCookieValue(id: string) { return sessionValue(id); }
