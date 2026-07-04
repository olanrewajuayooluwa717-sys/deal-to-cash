import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getXeroSession } from '@/lib/session';
import { createInvoiceInXero } from '@/lib/xero-sync';
import type { XeroInvoiceDraft } from '@/lib/types';

const bodySchema = z.object({
  invoices: z.array(
    z.object({
      contactName: z.string(),
      contactEmail: z.string().optional(),
      reference: z.string().optional(),
      date: z.string(),
      dueDate: z.string(),
      currencyCode: z.string(),
      lineItems: z.array(
        z.object({
          description: z.string(),
          quantity: z.number(),
          unitAmount: z.number(),
          accountCode: z.string().optional(),
          taxType: z.string().optional(),
        }),
      ),
      status: z.enum(['DRAFT', 'AUTHORISED']),
    }),
  ),
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

    const results = [];
    for (const invoice of parsed.data.invoices) {
      const created = await createInvoiceInXero(session, invoice as XeroInvoiceDraft);
      results.push(created);
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
