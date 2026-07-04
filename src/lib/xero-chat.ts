import { Invoice } from 'xero-node';
import OpenAI from 'openai';
import { formatApiError, getAuthenticatedXero, openAiKey } from './xero-auth';
import type { XeroSession } from './types';

async function fetchXeroContext(session: XeroSession) {
  const { xero, session: activeSession } = await getAuthenticatedXero(session);

  const [draftsRes, contactsRes] = await Promise.all([
    xero.accountingApi.getInvoices(activeSession.tenantId),
    xero.accountingApi.getContacts(activeSession.tenantId),
  ]);

  const drafts = (draftsRes.body.invoices ?? []).filter(
    (i) => i.type === Invoice.TypeEnum.ACCREC && i.status === Invoice.StatusEnum.DRAFT,
  );
  const contacts = (contactsRes.body.contacts ?? []).slice(0, 20);

  return {
    org: activeSession.tenantName,
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

  if (lower.includes('total') || lower.includes('value')) {
    const sum = draftInvoices.reduce((n, i) => n + (i.total ?? 0), 0);
    return `Total value of ${draftInvoices.length} draft invoice(s) in ${org}: ${sum.toFixed(2)}.`;
  }

  return `${org}: ${draftInvoices.length} draft invoice(s). Try asking "list draft invoices" or "show contacts".`;
}

export async function askXero(session: XeroSession, message: string): Promise<string> {
  let context;
  try {
    context = await fetchXeroContext(session);
  } catch (err) {
    throw new Error(`Xero API error: ${formatApiError(err)}. Try reconnecting Xero.`);
  }

  const apiKey = openAiKey();
  if (!apiKey) {
    return fallbackAnswer(message, context);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a Xero accounting assistant connected to ${context.org} via the Xero API.
Answer concisely using ONLY the live data below. Mention invoice numbers and customer names when relevant.

Live Xero data:
${JSON.stringify(context, null, 2)}`,
        },
        { role: 'user', content: message },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || fallbackAnswer(message, context);
  } catch (err) {
    // Degrade gracefully — still useful without OpenAI
    const hint = formatApiError(err);
    return `${fallbackAnswer(message, context)}\n\n(OpenAI unavailable: ${hint})`;
  }
}
