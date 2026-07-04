'use client';

import { useState } from 'react';
import type { SyncPreview, SyncPreviewResponse } from '@/lib/types';

interface MappingPreviewProps {
  preview: SyncPreviewResponse | null;
  onError: (message: string) => void;
}

export function MappingPreview({ preview, onError }: MappingPreviewProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!preview) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
        <p className="text-sm text-zinc-500">Run a preview to see AI field mappings and Xero invoice drafts.</p>
      </div>
    );
  }

  const resolvedPreview = preview;

  async function syncToXero() {
    setSyncing(true);
    onError('');
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: resolvedPreview.previews.map((p) => p.invoice),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSyncResult(`Created ${data.synced} draft invoice(s) in Xero.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">3. Review & sync</h2>
          <p className="mt-1 text-sm text-zinc-600">{resolvedPreview.summary}</p>
        </div>
        <button
          type="button"
          onClick={syncToXero}
          disabled={syncing}
          className="rounded-lg bg-[#13B5EA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0fa3d4] disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Approve & sync to Xero'}
        </button>
      </div>

      {syncResult && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{syncResult}</p>
      )}

      <div className="mt-4 space-y-4">
        {resolvedPreview.previews.map((item) => (
          <PreviewCard key={item.recordId} item={item} />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ item }: { item: SyncPreview }) {
  const { invoice } = item;
  const total = invoice.lineItems.reduce((sum, li) => sum + li.quantity * li.unitAmount, 0);

  return (
    <article className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">{invoice.contactName}</h3>
        <span className="text-sm font-medium text-zinc-700">
          {invoice.currencyCode} {total.toFixed(2)}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-600">{item.reasoning}</p>

      {item.warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.warnings.map((w) => (
            <li key={w} className="text-xs text-amber-700">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Invoice draft</p>
          <ul className="mt-1 text-sm text-zinc-700">
            <li>Due: {invoice.dueDate}</li>
            <li>Ref: {invoice.reference ?? '—'}</li>
            <li>Status: {invoice.status}</li>
          </ul>
          <ul className="mt-2 text-sm text-zinc-600">
            {invoice.lineItems.map((li, i) => (
              <li key={i}>
                {li.description} — {li.quantity} × {li.unitAmount}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Field mappings</p>
          <ul className="mt-1 space-y-1">
            {item.mappings.map((m) => (
              <li key={`${m.sourceField}-${m.targetField}`} className="font-mono text-xs text-zinc-600">
                {m.sourceField} → {m.targetField}
                <span className="ml-2 text-zinc-400">({Math.round(m.confidence * 100)}%)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
