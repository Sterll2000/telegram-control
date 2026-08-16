import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import type { User } from './types';

export const SESSION = process.env.NODE_ENV === 'production' ? '__Host-tc_session' : 'tc_session';
const MAX_INIT_AGE = 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-development-secret-change-me' : '');
  if (!value) throw new Error('SESSION_SECRET is required in production');
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

export async function currentUser(): Promise<User | null> {
  const c = await cookies();
  const id = verifySession(c.get(SESSION)?.value);
  const d = db();
  const found = id ? d.users.find(u => u.id === id) : undefined;
  if (found) return found;
  if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') return d.users[0] || null;
  return null;
}

export async function requireUser() {
  const user = await currentUser();
  return user;
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

export function sessionCookieValue(id: string) { return sessionValue(id); }
