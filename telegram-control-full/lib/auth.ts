import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { User } from './types';
import { db } from './db';

export const SESSION = process.env.NODE_ENV === 'production' ? '__Host-tc_session' : 'tc_session';
const MAX_INIT_AGE = 60 * 60;

type SessionPayload = { v: 1; user: User };

function secret() {
  const value = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || (process.env.NODE_ENV !== 'production' ? 'local-development-secret-change-me' : '');
  if (!value) throw new Error('SESSION_SECRET or TELEGRAM_BOT_TOKEN is required in production');
  return value;
}

function encodeUser(user: User) {
  return Buffer.from(JSON.stringify({ v: 1, user } satisfies SessionPayload), 'utf8').toString('base64url');
}

function decodeUser(value: string): User | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed?.v !== 1 || !parsed.user?.telegramId || !parsed.user?.id || !parsed.user?.role) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function sessionValue(user: User) {
  const payload = encodeUser(user);
  return `${payload}.${sign(payload)}`;
}

function verifySession(value?: string) {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return decodeUser(payload);
}

export async function currentUser(): Promise<User | null> {
  const c = await cookies();
  const sessionUser = verifySession(c.get(SESSION)?.value);
  if (sessionUser) return sessionUser;

  // Backward compatibility for the old id-only cookie format.
  const legacy = c.get(SESSION)?.value?.split('.')[0];
  if (legacy) {
    const found = db().users.find(u => u.id === legacy || String(u.telegramId) === legacy);
    if (found) return found;
  }

  // Telegram-only: without a valid Telegram session the browser is not authenticated.
  return null;
}

export async function requireUser() {
  return currentUser();
}

export async function setSession(user: User) {
  const c = await cookies();
  c.set(SESSION, sessionValue(user), {
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

export function sessionCookieValue(user: User) { return sessionValue(user); }
