import { NextResponse } from 'next/server';
import { getXeroClient } from '@/lib/xero';
import { ensureSessionCookie, getSessionId } from '@/lib/session';

export async function GET() {
  try {
    const xero = getXeroClient();
    await xero.initialize();
    const consentUrl = await xero.buildConsentUrl();
    const sessionId = await getSessionId();
    await ensureSessionCookie(sessionId);
    return NextResponse.redirect(consentUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start Xero OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
