'use client';

import { useState } from 'react';
import type { MappingMode, SourceType, SyncPreviewResponse } from '@/lib/types';

interface SyncWorkspaceProps {
  onPreview: (response: SyncPreviewResponse) => void;
  onError: (message: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const SAMPLES: Record<SourceType, { label: string; path: string }> = {
  crm: { label: 'Messy CRM deals', path: '/sample-data/messy-crm-deals.json' },
  stripe: { label: 'Stripe payouts', path: '/sample-data/messy-stripe-payouts.json' },
  generic: { label: 'Generic export', path: '/sample-data/messy-crm-deals.json' },
};

export function SyncWorkspace({ onPreview, onError, loading, setLoading }: SyncWorkspaceProps) {
  const [sourceType, setSourceType] = useState<SourceType>('crm');
  const [mappingMode, setMappingMode] = useState<MappingMode>('agent');
  const [rawJson, setRawJson] = useState('');

  async function loadSample() {
    const sample = SAMPLES[sourceType];
    const res = await fetch(sample.path);
    const data = await res.json();
    setRawJson(JSON.stringify(data, null, 2));
  }

  async function runPreview() {
    setLoading(true);
    onError('');
    try {
      let records;
      try {
        records = JSON.parse(rawJson);
      } catch {
        throw new Error('Invalid JSON — paste an array of { id, raw } records');
      }
      if (!Array.isArray(records)) {
        throw new Error('Expected a JSON array of records');
      }

      const res = await fetch('/api/sync/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, records, mode: mappingMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Preview failed');
      onPreview(data as SyncPreviewResponse);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">2. Import messy data</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Paste records from a CRM, Stripe, or any export. Compare brittle rules vs adaptive agent mapping.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mapping engine</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMappingMode('brittle')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mappingMode === 'brittle'
                ? 'bg-red-600 text-white'
                : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100'
            }`}
          >
            Zapier Mode (brittle)
          </button>
          <button
            type="button"
            onClick={() => setMappingMode('agent')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mappingMode === 'agent'
                ? 'bg-[#13B5EA] text-white'
                : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100'
            }`}
          >
            Agent Mode (adaptive)
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          {mappingMode === 'brittle'
            ? 'Exact field names only — watch it break on `Account Name` and `£1,850.00`.'
            : 'AI interprets messy fields, parses currency, explains every mapping.'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(SAMPLES) as SourceType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSourceType(type)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              sourceType === type
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={loadSample}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Load sample: {SAMPLES[sourceType].label}
        </button>
      </div>

      <textarea
        value={rawJson}
        onChange={(e) => setRawJson(e.target.value)}
        placeholder='[{"id":"1","raw":{"company":"Acme","deal_value":500}}]'
        className="mt-4 h-48 w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs text-zinc-800 focus:border-[#13B5EA] focus:outline-none focus:ring-2 focus:ring-[#13B5EA]/20"
      />

      <button
        type="button"
        onClick={runPreview}
        disabled={loading || !rawJson.trim()}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? 'Mapping…' : mappingMode === 'brittle' ? 'Preview brittle mapping' : 'Preview agent mapping'}
      </button>
    </div>
  );
}
