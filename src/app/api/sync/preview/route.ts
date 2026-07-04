import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapRecordsToXero } from '@/lib/agent';
import type { MessyRecord, SourceType } from '@/lib/types';

const bodySchema = z.object({
  sourceType: z.enum(['crm', 'stripe', 'generic']),
  records: z.array(
    z.object({
      id: z.string(),
      raw: z.record(z.string(), z.unknown()),
    }),
  ),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sourceType, records } = parsed.data;
    const result = await mapRecordsToXero(records as MessyRecord[], sourceType as SourceType);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
