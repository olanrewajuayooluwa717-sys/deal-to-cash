import OpenAI from 'openai';
import { z } from 'zod';
import type { MessyRecord, SourceType, SyncPreview, SyncPreviewResponse } from './types';

const previewSchema = z.object({
  previews: z.array(
    z.object({
      recordId: z.string(),
      invoice: z.object({
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
      mappings: z.array(
        z.object({
          sourceField: z.string(),
          targetField: z.string(),
          transform: z.string().optional(),
          confidence: z.number().min(0).max(1),
        }),
      ),
      warnings: z.array(z.string()),
      reasoning: z.string(),
    }),
  ),
  summary: z.string(),
});

const SOURCE_HINTS: Record<SourceType, string> = {
  crm: 'CRM deal export with inconsistent field names (deal_value, company, close_date, etc.)',
  stripe: 'Stripe or payment processor payout with fees, net amounts, and messy metadata',
  generic: 'Unknown business system export — infer intent from field names and values',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Rule-based fallback when OPENAI_API_KEY is not set (demo mode). */
function fallbackPreview(records: MessyRecord[], sourceType: SourceType): SyncPreviewResponse {
  const previews: SyncPreview[] = records.map((record) => {
    const raw = record.raw;
    const contactName =
      String(raw.company ?? raw.customer_name ?? raw.name ?? raw.Contact ?? 'Unknown customer');
    const amount = Number(raw.deal_value ?? raw.amount ?? raw.total ?? raw.net ?? 0) || 0;
    const reference = String(raw.deal_id ?? raw.id ?? raw.reference ?? record.id);
    const email = raw.email ? String(raw.email) : undefined;

    return {
      recordId: record.id,
      sourceType,
      invoice: {
        contactName,
        contactEmail: email,
        reference,
        date: todayIso(),
        dueDate: dueInDays(14),
        currencyCode: String(raw.currency ?? raw.Currency ?? 'GBP').toUpperCase().slice(0, 3),
        lineItems: [
          {
            description: String(raw.product ?? raw.description ?? 'Services'),
            quantity: 1,
            unitAmount: amount,
            accountCode: '200',
          },
        ],
        status: 'DRAFT',
      },
      mappings: Object.keys(raw).slice(0, 4).map((key) => ({
        sourceField: key,
        targetField: key.includes('amount') || key.includes('value') ? 'lineItems[0].unitAmount' : 'inferred',
        confidence: 0.55,
      })),
      warnings: amount <= 0 ? ['Could not find a reliable amount field — review before syncing'] : [],
      reasoning: 'Demo mapping using heuristics. Add OPENAI_API_KEY for adaptive AI field mapping.',
    };
  });

  return {
    previews,
    summary: `Mapped ${previews.length} record(s) with rule-based fallback.`,
  };
}

export async function mapRecordsToXero(
  records: MessyRecord[],
  sourceType: SourceType,
): Promise<SyncPreviewResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackPreview(records, sourceType);
  }

  const openai = new OpenAI({ apiKey });

  const system = `You are Deal-to-Cash — an invoice and contact mapping specialist for Xero (inspired by Xero Agent Toolkit patterns).

Your role combines invoice specialist and contact manager responsibilities:
- **Invoices (ACCREC):** Create well-formed sales invoice drafts. Understand accounting practice: line items with description, quantity, unitAmount; sensible due dates; reference fields for traceability. Prefer DRAFT status unless the source clearly indicates a finalised sale ready to authorise. Split into multiple line items when the source bundles products, fees, or discounts.
- **Contacts:** Infer customer name and email from messy fields (company, customer_name, billing_email, etc.). Validate that contactName is human-readable and unique enough for Xero lookup — accurate contact data matters because sync will match or create contacts by name before posting invoices.
- **Data handling:** Be precise. Normalize currencies to ISO 4217. Handle missing fields gracefully. Flag low-confidence mappings in warnings. Explain each mapping decision in reasoning and mappings[] with confidence scores.

Today's date: ${todayIso()}.
Source context: ${SOURCE_HINTS[sourceType]}.`;

  const user = `Map these records to Xero invoice drafts. Return JSON matching the schema.
Records:
${JSON.stringify(records, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `${user}

Respond with JSON: { "previews": [...], "summary": "..." }
Each preview needs recordId, invoice, mappings, warnings, reasoning.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned empty response');
  }

  const parsed = previewSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error(`AI response validation failed: ${parsed.error.message}`);
  }

  return {
    ...parsed.data,
    previews: parsed.data.previews.map((p) => ({ ...p, sourceType })),
  };
}
