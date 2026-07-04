import { cookies } from 'next/headers';
import type { XeroSession } from './types';

const SESSION_COOKIE = 'dtc_session_id';

declare global {
  // eslint-disable-next-line no-var
  var __dtcSessions: Map<string, XeroSession> | undefined;
}

function getStore(): Map<string, XeroSession> {
  if (!global.__dtcSessions) {
    global.__dtcSessions = new Map();
  }
  return global.__dtcSessions;
}

function newSessionId(): string {
  return crypto.randomUUID();
}

export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  return newSessionId();
}

export async function ensureSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)?.value) {
    jar.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function getXeroSession(): Promise<XeroSession | null> {
  const sessionId = await getSessionId();
  return getStore().get(sessionId) ?? null;
}

export async function setXeroSession(session: XeroSession): Promise<void> {
  const sessionId = await getSessionId();
  await ensureSessionCookie(sessionId);
  getStore().set(sessionId, session);
}

export async function clearXeroSession(): Promise<void> {
  const sessionId = await getSessionId();
  getStore().delete(sessionId);
}
