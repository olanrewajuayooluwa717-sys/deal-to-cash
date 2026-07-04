import type { TokenSetParameters } from 'xero-node';

export type SourceType = 'crm' | 'stripe' | 'generic';
export type MappingMode = 'brittle' | 'agent';

export interface MessyRecord {
  id: string;
  raw: Record<string, unknown>;
}

export interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
  taxType?: string;
}

export interface XeroInvoiceDraft {
  contactName: string;
  contactEmail?: string;
  reference?: string;
  date: string;
  dueDate: string;
  currencyCode: string;
  lineItems: XeroLineItem[];
  status: 'DRAFT' | 'AUTHORISED';
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  confidence: number;
}

export interface SyncPreview {
  recordId: string;
  sourceType: SourceType;
  invoice: XeroInvoiceDraft;
  mappings: FieldMapping[];
  warnings: string[];
  reasoning: string;
}

export interface SyncPreviewResponse {
  previews: SyncPreview[];
  summary: string;
  mode: MappingMode;
}

export interface XeroSession {
  tokenSet: TokenSetParameters;
  tenantId: string;
  tenantName: string;
}
