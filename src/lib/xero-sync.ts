import { Invoice, LineAmountTypes } from 'xero-node';
import { getXeroClient } from './xero';
import type { XeroInvoiceDraft, XeroSession } from './types';

// Future: swap xero-node calls for @xeroapi/xero-mcp-server via XERO_CLIENT_BEARER_TOKEN
// (see https://github.com/XeroAPI/xero-mcp-server) when agent-driven MCP sync is needed.

export async function createInvoiceInXero(
  session: XeroSession,
  draft: XeroInvoiceDraft,
): Promise<{ invoiceId: string; invoiceNumber?: string }> {
  const xero = getXeroClient();
  await xero.initialize();
  xero.setTokenSet(session.tokenSet);

  const contactName = draft.contactName;
  const contacts = await xero.accountingApi.getContacts(
    session.tenantId,
    undefined,
    `Name=="${contactName.replace(/"/g, '\\"')}"`,
  );
  let contactId = contacts.body.contacts?.[0]?.contactID;

  if (!contactId) {
    const created = await xero.accountingApi.createContacts(session.tenantId, {
      contacts: [
        {
          name: contactName,
          emailAddress: draft.contactEmail,
        },
      ],
    });
    contactId = created.body.contacts?.[0]?.contactID;
  }

  if (!contactId) {
    throw new Error(`Failed to resolve contact for ${contactName}`);
  }

  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: contactId },
    date: draft.date,
    dueDate: draft.dueDate,
    reference: draft.reference,
    currencyCode: draft.currencyCode as unknown as Invoice['currencyCode'],
    status: draft.status === 'AUTHORISED' ? Invoice.StatusEnum.AUTHORISED : Invoice.StatusEnum.DRAFT,
    lineAmountTypes: LineAmountTypes.Exclusive,
    lineItems: draft.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitAmount: li.unitAmount,
      accountCode: li.accountCode ?? '200',
      taxType: li.taxType,
    })),
  };

  const result = await xero.accountingApi.createInvoices(session.tenantId, { invoices: [invoice] });
  const created = result.body.invoices?.[0];
  if (!created?.invoiceID) {
    throw new Error('Xero did not return an invoice ID');
  }

  return {
    invoiceId: created.invoiceID,
    invoiceNumber: created.invoiceNumber,
  };
}
