'use client';

import { useEffect, useState } from 'react';

export function ConnectXero() {
  const [status, setStatus] = useState<{ connected: boolean; tenantName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/xero/status')
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Checking Xero connection…</p>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-800">Connected to Xero</p>
            <p className="text-sm text-emerald-700">{status.tenantName}</p>
          </div>
          <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-900">
            Live
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">1. Connect Xero</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Authorize Deal-to-Cash to create contacts and draft invoices in your Xero org.
      </p>
      <a
        href="/api/xero/connect"
        className="mt-4 inline-flex items-center rounded-lg bg-[#13B5EA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0fa3d4]"
      >
        Connect with Xero
      </a>
    </div>
  );
}
