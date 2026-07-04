import { NextRequest, NextResponse } from 'next/server';
import { getXeroClient, appBaseUrl } from '@/lib/xero';
import { setXeroSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const xero = getXeroClient();
    await xero.initialize();
    const callbackUrl = req.url;
    const tokenSet = await xero.apiCallback(callbackUrl);
    await xero.updateTenants();
    const tenant = xero.tenants[0];
    if (!tenant) {
      return NextResponse.redirect(`${appBaseUrl()}?error=no_tenant`);
    }

    await setXeroSession({
      tokenSet,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName ?? 'Xero org',
    });

    return NextResponse.redirect(`${appBaseUrl()}?connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed';
    return NextResponse.redirect(`${appBaseUrl()}?error=${encodeURIComponent(message)}`);
  }
}
