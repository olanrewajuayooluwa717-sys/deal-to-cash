import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { askXero } from '@/lib/xero-chat';
import { getXeroSession } from '@/lib/session';

const bodySchema = z.object({
  message: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await getXeroSession();
  if (!session) {
    return NextResponse.json({ error: 'Connect Xero first' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reply = await askXero(session, parsed.data.message);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
