'use client';

import { useState } from 'react';
import { ConnectXero } from '@/components/ConnectXero';
import { MappingPreview } from '@/components/MappingPreview';
import { SyncWorkspace } from '@/components/SyncWorkspace';
import type { SyncPreviewResponse } from '@/lib/types';

export default function Home() {
  const [preview, setPreview] = useState<SyncPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50 to-zinc-100">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#13B5EA]">
              Bounty 02 · Vibe Integrator
            </p>
            <h1 className="text-xl font-bold text-zinc-900">Deal-to-Cash</h1>
            <p className="text-sm text-zinc-600">AI-powered CRM & payments → Xero invoice sync</p>
          </div>
          <div className="hidden text-right text-xs text-zinc-500 sm:block">
            <p>Replace brittle if-this-then-that</p>
            <p>with adaptive field mapping</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <ConnectXero />
        <SyncWorkspace
          onPreview={setPreview}
          onError={setError}
          loading={loading}
          setLoading={setLoading}
        />
        <MappingPreview preview={preview} onError={setError} />
      </main>
    </div>
  );
}
