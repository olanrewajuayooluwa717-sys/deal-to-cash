'use client';

import { useState } from 'react';

const SUGGESTIONS = [
  'List our draft invoices',
  'Which customers have draft invoices?',
  'What is the total value of drafts?',
];

export function AskXero() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function send(text?: string) {
    const msg = (text ?? message).trim();
    if (!msg) return;

    setLoading(true);
    setError('');
    setReply(null);
    try {
      const res = await fetch('/api/xero/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Chat failed');
      setReply(data.reply);
      if (text) setMessage(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">4. Ask Xero</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Conversational layer over live Xero data — powered by Xero API + agent patterns (MCP-ready).
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={loading}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about draft invoices, contacts, totals…"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#13B5EA] focus:outline-none focus:ring-2 focus:ring-[#13B5EA]/20"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={loading || !message.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {reply && (
        <div className="mt-3 rounded-lg bg-sky-50 px-4 py-3 text-sm whitespace-pre-wrap text-zinc-800">
          {reply}
        </div>
      )}
    </div>
  );
}
