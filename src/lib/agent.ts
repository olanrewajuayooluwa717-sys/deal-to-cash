import OpenAI from 'openai';
import { z } from 'zod';
import { formatApiError, openAiKey } from './xero-auth';
import type { MappingMode, MessyRecord, SourceType, SyncPreview, SyncPreviewResponse } from './types';

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

function findField(raw: Record<string, unknown>, ...names: string[]): unknown {
  const lower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
  for (const name of names) {
    const val = lower[name.toLowerCase()];
    if (val != null && val !== '') return val;
  }
  return undefined;
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Intentionally rigid Zapier-style rules — exact keys, no currency parsing. Demo "before". */
function brittlePreview(records: MessyRecord[], sourceType: SourceType): SyncPreviewResponse {
  const previews: SyncPreview[] = records.map((record) => {
    const raw = record.raw;
    const contactName = String(raw.company ?? raw.customer_name ?? raw.name ?? 'Unknown customer');
    const amount = Number(raw.deal_value ?? raw.amount ?? raw.total ?? 0) || 0;
    const reference = String(raw.deal_id ?? raw.id ?? record.id);
    const email = raw.email ? String(raw.email) : undefined;

    const warnings: string[] = [];
    if (amount <= 0) warnings.push('Could not find a reliable amount field — review before syncing');
    if (contactName === 'Unknown customer') {
      warnings.push('Contact field not matched — expected exact key `company` or `customer_name`');
    }
    if (raw['Account Name'] && contactName === 'Unknown customer') {
      warnings.push('`Account Name` ignored — brittle rules only map `company`');
    }
    if (raw.Amount && amount <= 0) {
      warnings.push('`Amount` with currency symbol not parsed — brittle rules expect numeric `amount`');
    }

    return {
      recordId: record.id,
      sourceType,
      invoice: {
        contactName,
        contactEmail: email,
        reference,
        date: todayIso(),
        dueDate: dueInDays(14),
        currencyCode: 'GBP',
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
      mappings: [
        { sourceField: 'company', targetField: 'contactName', confidence: amount > 0 ? 0.9 : 0.2 },
        { sourceField: 'deal_value', targetField: 'lineItems[0].unitAmount', confidence: 0.5 },
      ],
      warnings,
      reasoning:
        'Rigid if-this-then-that mapping: exact field names only. Breaks when CRM exports use `Account Name`, `Amount`, or formatted currency.',
    };
  });

  const issueCount = previews.reduce((n, p) => n + p.warnings.length, 0);

  return {
    previews,
    mode: 'brittle',
    summary: `Zapier-style rules mapped ${previews.length} record(s) — ${issueCount} issue(s) detected.`,
  };
}

/** Smart heuristics when OpenAI is unavailable. */
function heuristicPreview(records: MessyRecord[], sourceType: SourceType): SyncPreviewResponse {
  const previews: SyncPreview[] = records.map((record) => {
    const raw = record.raw;
    const contactName = String(
      findField(raw, 'company', 'company_name', 'account name', 'customer_name', 'name', 'contact') ??
        'Unknown customer',
    );
    const amount = parseMoney(
      findField(raw, 'deal_value', 'amount', 'total', 'net', 'value', 'gross_charges', 'net_payout') ?? 0,
    );
    const reference = String(
      findField(raw, 'deal_id', 'dealid', 'id', 'reference', 'payout_id') ?? record.id,
    );
    const email = findField(raw, 'email', 'contact_email');
    const description = findField(raw, 'product', 'description', 'line_items');

    return {
      recordId: record.id,
      sourceType,
      invoice: {
        contactName,
        contactEmail: email ? String(email) : undefined,
        reference,
        date: todayIso(),
        dueDate: dueInDays(14),
        currencyCode: String(findField(raw, 'currency') ?? 'GBP')
          .toUpperCase()
          .slice(0, 3),
        lineItems: [
          {
            description: String(description ?? 'Services'),
            quantity: 1,
            unitAmount: amount,
            accountCode: '200',
          },
        ],
        status: 'DRAFT',
      },
      mappings: Object.keys(raw)
        .slice(0, 5)
        .map((key) => ({
          sourceField: key,
          targetField: /amount|value|total|net/i.test(key)
            ? 'lineItems[0].unitAmount'
            : /company|account|customer|name/i.test(key)
              ? 'contactName'
              : 'inferred',
          confidence: 0.72,
        })),
      warnings: amount <= 0 ? ['Could not find a reliable amount field — review before syncing'] : [],
      reasoning:
        'Heuristic agent mapping with case-insensitive fields and currency parsing. Add OPENAI_API_KEY for full adaptive AI.',
    };
  });

  return {
    previews,
    mode: 'agent',
    summary: `Adaptive heuristics mapped ${previews.length} record(s). Add OPENAI_API_KEY for GPT-powered reasoning.`,
  };
}

async function aiPreview(records: MessyRecord[], sourceType: SourceType): Promise<SyncPreviewResponse> {
  const apiKey = openAiKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const openai = new OpenAI({ apiKey });

  const system = `You are Deal-to-Cash — an invoice and contact mapping specialist for Xero (inspired by Xero Agent Toolkit patterns).

Your role combines invoice specialist and contact manager responsibilities:
- **Invoices (ACCREC):** Create well-formed sales invoice drafts. Understand accounting practice: line items with description, quantity, unitAmount; sensible due dates; reference fields for traceability. Prefer DRAFT status unless the source clearly indicates a finalised sale ready to authorise. Split into multiple line items when the source bundles products, fees, or discounts.
- **Contacts:** Infer customer name and email from messy fields (company, customer_name, billing_email, Account Name, etc.). Validate that contactName is human-readable.
- **Data handling:** Be precise. Normalize currencies to ISO 4217. Parse amounts like "£1,850.00". Handle missing fields gracefully. Flag low-confidence mappings in warnings. Explain each mapping decision in reasoning and mappings[] with confidence scores.

Today's date: ${todayIso()}.
Source context: ${SOURCE_HINTS[sourceType]}.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Map these records to Xero invoice drafts. Return JSON: { "previews": [...], "summary": "..." }
Each preview needs recordId (from input id), invoice, mappings, warnings, reasoning.

Records:
${JSON.stringify(records, null, 2)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('AI returned empty response');

  const parsed = previewSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error(`AI response validation failed: ${parsed.error.message}`);
  }

  return {
    ...parsed.data,
    mode: 'agent',
    previews: parsed.data.previews.map((p) => ({ ...p, sourceType })),
    summary: parsed.data.summary || `AI agent mapped ${parsed.data.previews.length} record(s) with adaptive field mapping.`,
  };
}

export async function mapRecordsToXero(
  records: MessyRecord[],
  sourceType: SourceType,
  mode: MappingMode = 'agent',
): Promise<SyncPreviewResponse> {
  if (mode === 'brittle') {
    return brittlePreview(records, sourceType);
  }

  if (openAiKey()) {
    try {
      return await aiPreview(records, sourceType);
    } catch (err) {
      throw new Error(`OpenAI mapping failed: ${formatApiError(err)}`);
    }
  }

  return heuristicPreview(records, sourceType);
}
