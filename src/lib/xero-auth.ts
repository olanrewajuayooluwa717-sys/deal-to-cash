import { getXeroClient } from './xero';
import { getXeroSession, setXeroSession } from './session';
import type { XeroSession } from './types';

/** Initialize Xero client with session tokens, refreshing if expired. */
export async function getAuthenticatedXero(session: XeroSession) {
  const xero = getXeroClient();
  await xero.initialize();
  xero.setTokenSet(session.tokenSet);

  const tokenSet = xero.readTokenSet();
  if (tokenSet.expired()) {
    const refreshed = await xero.refreshToken();
    const updated: XeroSession = {
      ...session,
      tokenSet: refreshed as XeroSession['tokenSet'],
    };
    await setXeroSession(updated);
    xero.setTokenSet(refreshed);
    return { xero, session: updated };
  }

  return { xero, session };
}

export async function requireXeroSession(): Promise<XeroSession> {
  const session = await getXeroSession();
  if (!session) {
    throw new Error('Connect Xero first');
  }
  return session;
}

export function openAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function formatApiError(err: unknown): string {
  if (err instanceof Error) {
    // OpenAI errors often include status in message
    if ('status' in err && typeof (err as { status?: number }).status === 'number') {
      const status = (err as { status: number }).status;
      if (status === 401) return 'OpenAI API key is invalid — check OPENAI_API_KEY in .env';
      if (status === 429) return 'OpenAI rate limit or quota exceeded — check billing at platform.openai.com';
    }
    return err.message;
  }
  return 'Unknown error';
}
