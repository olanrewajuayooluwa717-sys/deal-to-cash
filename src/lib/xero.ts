import { XeroClient } from 'xero-node';

// New Xero apps (from Mar 2026) require granular scopes — accounting.transactions is invalid.
const SCOPES = [
  'openid',
  'profile',
  'email',
  'accounting.invoices',
  'accounting.contacts',
  'accounting.settings',
  'offline_access',
];

export function getXeroClient(): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI ?? 'http://localhost:3000/api/xero/callback';

  if (!clientId || !clientSecret) {
    throw new Error('XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set');
  }

  return new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: SCOPES,
    state: process.env.XERO_OAUTH_STATE ?? 'deal-to-cash',
  });
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
