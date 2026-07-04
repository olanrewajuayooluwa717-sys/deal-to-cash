# Deal-to-Cash

**Bounty 02: The Vibe Integrator** — AI-powered sync from messy CRM / payment data into Xero invoices.

## What it does

1. **Connect Xero** via OAuth 2.0
2. **Import messy records** (CRM deals, Stripe payouts, or any JSON export)
3. **AI maps fields** dynamically — handles inconsistent names, currencies, missing data
4. **Review & approve** — audit trail of mappings + reasoning
5. **Sync to Xero** — creates contacts and draft invoices

## Quick start

```bash
cp .env.example .env
# Add XERO_CLIENT_ID, XERO_CLIENT_SECRET from https://developer.xero.com/app/manage
# Redirect URI: http://localhost:3000/api/xero/callback

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Xero app setup

1. Create a **Web app** at [Xero Developer](https://developer.xero.com/app/manage)
2. Set redirect URI: `http://localhost:3000/api/xero/callback`
3. Scopes: `openid`, `profile`, `email`, `accounting.transactions`, `accounting.contacts`, `accounting.settings`, `offline_access`
4. Use a **demo company** — not production data

### Optional: OpenAI

Add `OPENAI_API_KEY` for adaptive AI mapping. Without it, the app uses a rule-based fallback so you can still demo the flow.

## Demo script

1. Connect Xero (demo org)
2. Click **Load sample: Messy CRM deals**
3. **Preview Xero mapping** — show field mappings and reasoning
4. **Approve & sync to Xero** — draft invoices appear in Xero

## Xero Agent Toolkit

This project builds on official Xero AI integration patterns:

- [Xero Agent Toolkit](https://github.com/XeroAPI/xero-agent-toolkit) — reference agents (Invoice Specialist, Contact Manager) and OpenAI Agents SDK examples
- [Xero MCP Server](https://github.com/XeroAPI/xero-mcp-server) — MCP tools for live Xero operations

Deal-to-Cash adds two layers on top of those patterns:

1. **Messy-data mapping** — CRM deals, Stripe payouts, and generic exports with inconsistent field names are normalized into Xero invoice drafts via AI (or rule-based fallback)
2. **Human approval** — every sync is previewed with field mappings, confidence scores, and reasoning before anything is written to Xero

We use [xero-node](https://github.com/XeroAPI/xero-node) OAuth + SDK for the execute step today; MCP is a natural future path for agent-driven sync.

## Stack

- Next.js 16 · TypeScript · Tailwind
- [xero-node](https://github.com/XeroAPI/xero-node) SDK
- OpenAI for adaptive field mapping

## Project structure

```
src/
  app/api/xero/     OAuth connect + callback + status
  app/api/sync/     AI preview + Xero execute
  components/       UI
  lib/              Xero client, agent, session
sample-data/        Messy demo records for hackathon pitch
```
