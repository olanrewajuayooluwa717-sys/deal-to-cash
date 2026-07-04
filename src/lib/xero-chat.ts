import OpenAI from 'openai';
import { getXeroClient } from './xero';
import type { XeroSession } from './types';

async function fetchXeroContext(session: XeroSession) {
  const xero = getXeroClient();
  await xero.initialize();
  xero.setTokenSet(session.tokenSet);

  const [draftsRes, contactsRes] = await Promise.all([
    xero.accountingApi.getInvoices(session.tenantId, undefined, 'Type=="ACCREC"&&Status=="DRAFT"'),
    xero.accountingApi.getContacts(session.tenantId),
  ]);

  const drafts = draftsRes.body.invoices ?? [];
  const contacts = contactsRes.body.contacts ?? [];

  return {
    org: session.tenantName,
    draftInvoices: drafts.map((i) => ({
      number: i.invoiceNumber,
      contact: i.contact?.name,
      reference: i.reference,
      total: i.total,
      dueDate: i.dueDate,
    })),
    contacts: contacts.map((c) => ({ name: c.name, email: c.emailAddress })),
  };
}

function fallbackAnswer(message: string, context: Awaited<ReturnType<typeof fetchXeroContext>>): string {
  const lower = message.toLowerCase();
  const { draftInvoices, org } = context;

  if (lower.includes('draft') || lower.includes('invoice')) {
    if (draftInvoices.length === 0) return `No draft invoices in ${org} right now.`;
    const lines = draftInvoices.map(
      (i) => `• ${i.number ?? 'Draft'} — ${i.contact ?? 'Unknown'} — ${i.reference ?? 'no ref'} — ${i.total ?? 0}`,
    );
    return `${org} has ${draftInvoices.length} draft invoice(s):\n${lines.join('\n')}`;
  }

  if (lower.includes('contact') || lower.includes('customer')) {
    const names = context.contacts.slice(0, 5).map((c) => c.name).join(', ');
    return `Recent contacts in ${org}: ${names || 'none found'}.`;
  }

  return `${org}: ${draftInvoices.length} draft invoice(s). Try asking "list draft invoices" or "show contacts".`;
}

export async function askXero(session: XeroSession, message: string): Promise<string> {
  const context = await fetchXeroContext(session);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackAnswer(message, context);
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `You are a Xero accounting assistant connected to ${context.org} via the Xero API (MCP-compatible patterns).
Answer concisely using ONLY the live data below. Mention invoice numbers and customer names when relevant.

Live Xero data:
${JSON.stringify(context, null, 2)}`,
      },
      { role: 'user', content: message },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || fallbackAnswer(message, context);
}
