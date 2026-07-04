import { NextResponse } from 'next/server';
import { getXeroSession } from '@/lib/session';

export async function GET() {
  const session = await getXeroSession();
  if (!session) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    tenantName: session.tenantName,
  });
}
