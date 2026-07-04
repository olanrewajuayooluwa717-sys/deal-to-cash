# Deal-to-Cash — Winning Checklist

**Track:** Bounty 02 · The Vibe Integrator  
**Prize:** $3,000  
**Pitch:** 3 minutes ([Xero playbook](https://devblog.xero.com/land-your-hackathon-pitch-a-playbook-for-winning-the-room-8b327de726ca))

---

## Build (technical)

- [x] Xero OAuth connect (granular scopes: `accounting.invoices`, `accounting.contacts`)
- [x] Messy CRM / Stripe sample data
- [x] Preview mappings + reasoning + warnings
- [x] Human approve → sync draft invoices to Xero
- [x] **Brittle vs Brain toggle** (Zapier Mode vs Agent Mode) — key differentiator
- [x] **Ask Xero** chat over live Xero data
- [ ] Add `OPENAI_API_KEY` to `.env` for full AI mapping + smarter chat
- [ ] Push latest commits to GitHub
- [ ] Optional: deploy to Vercel for public demo URL

---

## Demo (70 sec — most important)

Record or rehearse this exact flow:

1. **Hook (15 sec):** “CRM deals don’t match Xero field names. Zapier breaks on `Amount` vs `amount`.”
2. **Zapier Mode (20 sec):** Load sample → Preview → show Green Cafe = Unknown, £0, warnings
3. **Agent Mode (20 sec):** Toggle → Preview → show correct contact, £1,850, clean mappings
4. **Sync (10 sec):** Approve & sync → open Xero Sales → Invoices → Draft (3)
5. **Ask Xero (10 sec):** “List our draft invoices” → live answer
6. **Close (5 sec):** “Adaptive agent + human approval + Xero-native sync.”

**Tip:** Pre-record if WiFi is risky. A working video beats a broken live demo.

---

## Pitch (3 min structure)

| Time | Section | Say |
|------|---------|-----|
| 0:00–0:30 | Hook | Specific customer (consultancy closing HubSpot deals), pain (manual re-keying / broken Zapier) |
| 0:30–1:40 | Demo | Brittle vs Agent toggle — your wow moment |
| 1:40–2:30 | Tech | Next.js, xero-node OAuth, OpenAI agent, Xero Agent Toolkit / MCP patterns, granular scopes |
| 2:30–3:00 | Future | HubSpot webhook, full MCP server, mapping memory per CRM |

---

## Submission

- [ ] Hackathon platform: project **Deal-to-Cash**, track **Bounty 02**
- [ ] GitHub: https://github.com/olanrewajuayooluwa717-sys/deal-to-cash
- [ ] 2–3 min demo video uploaded
- [ ] One-line description: *AI agent maps messy CRM exports to Xero invoices — brittle rules fail, we adapt.*

---

## Judge Q&A prep

**“How is this different from Zapier?”**  
Live demo: Zapier Mode breaks on same data; Agent Mode succeeds.

**“Why would an accountant trust this?”**  
Human approval before anything writes to Xero. Draft status only.

**“How did you use Xero’s platform?”**  
OAuth, Invoices API, Contacts API, granular scopes, Agent Toolkit patterns, MCP-ready chat layer.

**“What if OpenAI is down?”**  
Heuristic fallback still maps; brittle mode shows why AI matters.

---

## Tonight priority order

1. Add OpenAI key → test Agent Mode preview
2. Rehearse brittle → agent toggle demo twice
3. Record demo video
4. Submit + push final commit
