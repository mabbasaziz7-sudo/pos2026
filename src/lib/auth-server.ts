import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'pos_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 أيام

interface SessionPayload {
  id: number;
  role: 'admin' | 'manager' | 'cashier';
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET غير مُعرَّف. أضفه من إعدادات بيئة Vercel (أي نص عشوائي طويل وسري).');
  }
  return secret;
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(payload: { id: number; role: SessionPayload['role'] }): string {
  const body: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
