# AI-Assisted CRM Support Copilot — Learning Guide

> **How we will build this:** one phase at a time.  
> **Order:** System Design → Architecture → Development → QA → Deployment  
> **Rule:** every file we add will include *why it exists*, *what it talks to*, and *what you learn from it*.

This document is your map. Read Phase 0–1 before we write any application code. After that, we add files one by one.

---

## Table of contents

1. [Phase 0 — What problem are we solving?](#phase-0--what-problem-are-we-solving)
2. [Phase 1 — System Design](#phase-1--system-design)
3. [Phase 2 — Architecture](#phase-2--architecture)
4. [Phase 3 — Development (file-by-file roadmap)](#phase-3--development-file-by-file-roadmap)
5. [Phase 4 — QA](#phase-4--qa)
6. [Phase 5 — Deployment](#phase-5--deployment)
7. [Learning checklist](#learning-checklist)
8. [How we will proceed in Cursor](#how-we-will-proceed-in-cursor)

---

## Phase 0 — What problem are we solving?

### Real-world problem

Support agents open dozens of tickets per day. For each ticket they must:

1. Read a long message and understand the issue
2. Search the knowledge base (KB) for the right answer
3. Write a polite, accurate reply
4. Update ticket status

That is slow, repetitive, and inconsistent across agents.

### What this product does


| Capability      | What the agent sees                     | What the system does                                            |
| --------------- | --------------------------------------- | --------------------------------------------------------------- |
| Auto-summary    | 2-sentence summary on open ticket       | Claude/OpenAI/Gemini summarizes `subject` + `body`              |
| Suggested reply | Draft reply ready to copy/edit          | LLM drafts using ticket + matched KB articles                   |
| KB lookup       | Context the AI used                     | Keyword search first; embeddings + pgvector later (RAG stretch) |
| Live updates    | Ticket list refreshes without reload    | Supabase Realtime `postgres_changes`                            |
| Auth            | Only logged-in agents see the dashboard | Supabase Auth email/password                                    |


### Success criteria (definition of done)

- Agent can log in
- Ticket list loads from Postgres
- Clicking a ticket shows detail + summary + suggested reply
- “Regenerate” calls our API, AI writes back to DB, UI updates live
- “Copy reply” copies draft to clipboard
- Status badges reflect `open` / `in_progress` / `resolved`
- README has deploy notes + demo GIF placeholder
- (Stretch) Semantic KB search with embeddings

### Out of scope (for v1 — keep focus)

- Multi-tenant orgs / roles beyond “logged-in agent”
- Email/Slack ingest of real tickets (we use form + CSV seed)
- Full ticketing workflow (SLA, assignments, macros)
- Production-grade rate limiting / abuse protection

---

## Phase 1 — System Design

System design answers: **what are the pieces, what data do they hold, and what flows between them?**

### 1.1 Actors

```
┌─────────────┐         ┌──────────────────────┐         ┌─────────────┐
│ Support     │  uses   │ CRM Support Copilot  │  calls  │ LLM APIs    │
│ Agent       │────────▶│ (Next.js + Supabase) │────────▶│ Claude /    │
└─────────────┘         └──────────────────────┘         │ OpenAI /    │
                                                         │ Gemini      │
                                                         └─────────────┘
```

### 1.2 Core entities (data model)

```
tickets
├── id              uuid (PK)
├── subject         text
├── body            text
├── status          text ('open' | 'in_progress' | 'resolved')
├── summary         text (nullable — filled by AI)
├── suggested_reply text (nullable — filled by AI)
└── created_at      timestamptz

kb_articles
├── id              uuid (PK)
├── title           text
└── content         text

(stretch later)
kb_articles.embedding  vector(1536)   -- OpenAI text-embedding-3-small
```

**Why these fields?**

- `subject` / `body` — raw ticket input (human or CSV).
- `summary` / `suggested_reply` — AI outputs stored in DB so we don’t re-call the LLM on every page load.
- `status` — agent workflow signal for badges/filters.
- `kb_articles` — retrieval context so replies are grounded (not pure hallucination).

### 1.3 Primary user flows

#### Flow A — View tickets (read path)

```
Agent opens Dashboard
  → Client checks supabase.auth.getUser()
  → If no user → redirect to /login
  → Client queries tickets from Supabase
  → Subscribes to Realtime channel 'tickets'
  → Renders list + detail panel
```

#### Flow B — Summarize / draft reply (write path)

```
Agent clicks "Regenerate summary"
  → Browser POST /api/summarize { ticketId }
  → API route (server):
       1. Auth check (optional but recommended)
       2. Fetch ticket from Supabase (service or user client)
       3. Find top KB matches (keyword → later vector)
       4. Call LLM with system + user prompt
       5. UPDATE tickets SET summary, suggested_reply
  → Supabase Realtime emits postgres_changes
  → Dashboard subscription receives event
  → UI updates without manual refresh
```

#### Flow C — Seed data (setup path)

```
Developer runs seed script / SQL
  → Inserts ~15 tickets + ~5 KB articles
  → Dashboard has realistic data for demos
```

### 1.4 API contract (v1)


| Method | Path             | Body                       | Response                           | Side effect           |
| ------ | ---------------- | -------------------------- | ---------------------------------- | --------------------- |
| `POST` | `/api/summarize` | `{ "ticketId": "<uuid>" }` | `{ "summary", "suggested_reply" }` | Updates `tickets` row |


Later you may add:


| Method  | Path                | Purpose                     |
| ------- | ------------------- | --------------------------- |
| `POST`  | `/api/tickets`      | Create ticket from form     |
| `PATCH` | `/api/tickets/[id]` | Update status               |
| `POST`  | `/api/embed`        | (Stretch) embed KB articles |


### 1.5 Auth & security design (important)


| Concern                        | Approach                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| Who can see tickets?           | Supabase Auth session; Row Level Security (RLS) later              |
| Who can call LLM?              | Only authenticated agents via Next.js API route                    |
| Where do API keys live?        | Server-only env vars (`ANTHROPIC_API_KEY`, etc.) — never in client |
| Which Supabase key in browser? | `NEXT_PUBLIC_SUPABASE_ANON_KEY` only                               |
| Service role key?              | Optional, server-only, for seed / admin scripts                    |


### 1.6 Non-functional requirements


| Requirement         | Target for portfolio demo                                |
| ------------------- | -------------------------------------------------------- |
| Latency (summarize) | ~2–8s acceptable (LLM)                                   |
| Live update delay   | < 1s after DB write                                      |
| Availability        | Vercel + Supabase free tiers                             |
| Cost control        | Cap seed size; don’t auto-summarize every ticket on load |


### 1.7 Design decisions (trade-offs to discuss in interviews)


| Decision               | Choice                                  | Why                               | Alternative                           |
| ---------------------- | --------------------------------------- | --------------------------------- | ------------------------------------- |
| Store AI output in DB  | Yes                                     | Cache + Realtime updates          | Generate on every open (slow, costly) |
| Keyword search first   | Yes                                     | Ship fast; learn RAG later        | Jump straight to embeddings           |
| Next.js App Router     | Yes                                     | API routes + React in one repo    | Separate Express + SPA                |
| Supabase               | Auth + DB + Realtime                    | One backend platform              | Firebase / custom sockets             |
| Multiple LLM providers | Claude primary; OpenAI/Gemini available | Flexibility + learn provider APIs | Single provider only                  |


---

## Phase 2 — Architecture

Architecture answers: **how do the pieces sit in folders, which layer owns what, and how traffic moves?**

### 2.1 High-level box diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  React Dashboard  ·  Auth UI  ·  Realtime subscription           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js (Vercel)                            │
│  app/page.tsx          → Dashboard UI                            │
│  app/login/page.tsx    → Auth gate                               │
│  app/api/summarize     → Orchestrates ticket + KB + LLM          │
│  lib/supabase/*        → DB/Auth clients                         │
│  lib/ai/*              → Provider adapters (Claude/OpenAI/Gemini)│
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Supabase Cloud           │   │  LLM Providers              │
│  · Postgres (tickets, KB) │   │  · Anthropic Claude         │
│  · Auth (email)           │   │  · OpenAI (chat + embed)    │
│  · Realtime               │   │  · Google Gemini            │
└───────────────────────────┘   └─────────────────────────────┘
```

### 2.2 Layered responsibilities

```
┌────────────────────────────┐
│ Presentation (UI)          │  Pages, components, status badges
├────────────────────────────┤
│ Application (API routes)   │  Validate input, orchestrate steps
├────────────────────────────┤
│ Domain helpers (lib/)      │  searchKB, summarizeTicket, mapStatus
├────────────────────────────┤
│ Infrastructure             │  Supabase client, LLM SDKs, env
└────────────────────────────┘
```

**Learning point:** keep UI dumb (display + click), keep orchestration in API routes, keep pure helpers testable in `lib/`.

### 2.3 Target folder structure (what we will create)

```
LEARNING_GUIDE.md              ← workspace root (this guide)
crm-copilot/                   ← Step 1 scaffolded Next.js app (npm-valid name)
├── README.md                  ← final summary + deploy + demo GIF
├── .env.local.example         ← template for secrets (no real keys)
├── .env.local                 ← your real keys (never commit)
├── package.json
├── next.config.ts
├── tsconfig.json
├── supabase/
│   └── schema.sql             ← tables + (later) RLS + pgvector
├── scripts/
│   └── seed.ts                ← insert tickets + KB
├── lib/
│   ├── supabase/
│   │   ├── client.ts          ← browser Supabase client
│   │   └── server.ts          ← server Supabase client
│   ├── ai/
│   │   ├── types.ts           ← shared SummarizeResult types
│   │   ├── claude.ts          ← Claude call
│   │   ├── openai.ts          ← OpenAI chat (+ later embeddings)
│   │   └── gemini.ts          ← Gemini call
│   ├── kb/
│   │   └── search.ts          ← keyword match (v1)
│   └── prompts/
│       └── summarize.ts       ← system/user prompt templates
├── app/
│   ├── layout.tsx             ← root shell, fonts, providers
│   ├── page.tsx               ← dashboard (or redirect)
│   ├── login/page.tsx         ← email auth UI
│   ├── globals.css
│   └── api/
│       └── summarize/route.ts ← POST summarize + draft
└── components/
    ├── TicketList.tsx
    ├── TicketDetail.tsx
    ├── StatusBadge.tsx
    └── CopyButton.tsx
```

> **Step 1 done:** App lives in `crm-copilot/`. All further files are added inside that folder unless noted.

### 2.4 How files connect (dependency map)

```
app/page.tsx
  ├── uses → components/TicketList, TicketDetail
  ├── uses → lib/supabase/client.ts  (query + realtime)
  └── auth → redirect if no session

TicketDetail
  └── on "Regenerate" → fetch('/api/summarize')

app/api/summarize/route.ts
  ├── uses → lib/supabase/server.ts   (fetch ticket, update)
  ├── uses → lib/kb/search.ts         (KB context)
  ├── uses → lib/prompts/summarize.ts (prompt text)
  └── uses → lib/ai/claude.ts (or openai/gemini)

Realtime path (no extra file needed beyond subscription in page/hooks):
  DB UPDATE → Supabase Realtime → client channel → setState → re-render
```

### 2.5 Environment variables (architecture boundary)


| Variable                        | Used where                     | Public?              |
| ------------------------------- | ------------------------------ | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser + server               | Yes (`NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server               | Yes                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Seed / server admin only       | **No**               |
| `ANTHROPIC_API_KEY`             | API route only                 | **No**               |
| `OPENAI_API_KEY`                | API route / embeddings         | **No**               |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | API route                      | **No**               |
| `AI_PROVIDER`                   | `claude` | `openai` | `gemini` | **No**               |


**Learning point:** anything prefixed `NEXT_PUBLIC_` is visible in the browser bundle. LLM keys must never use that prefix.

### 2.6 Sequence: Regenerate summary (deep dive)

```
Agent          TicketDetail      Next.js API       Supabase         LLM
  │                 │                 │                │              │
  │  click Regenerate                 │                │              │
  │────────────────▶│                 │                │              │
  │                 │  POST {ticketId}│                │              │
  │                 │────────────────▶│                │              │
  │                 │                 │  SELECT ticket │              │
  │                 │                 │───────────────▶│              │
  │                 │                 │  SELECT kb     │              │
  │                 │                 │───────────────▶│              │
  │                 │                 │  messages+prompt              │
  │                 │                 │──────────────────────────────▶│
  │                 │                 │◀──── summary + reply ─────────│
  │                 │                 │  UPDATE ticket │              │
  │                 │                 │───────────────▶│              │
  │                 │◀── JSON result ─│                │              │
  │                 │                 │   Realtime event              │
  │  list/detail auto-refresh ◀───────┼────────────────│              │
```

---

## Phase 3 — Development (file-by-file roadmap)

We build in **small steps**. After each file, you should be able to answer: *What is this for? What calls it? What does it call?*

### Step order (do not skip ahead)


| Step | File / action                   | Purpose (one sentence)                 | You learn                        |
| ---- | ------------------------------- | -------------------------------------- | -------------------------------- |
| 0    | This guide                      | Shared mental model                    | System design vocabulary         |
| 1    | Scaffold Next.js app            | Generate framework boilerplate         | Next.js App Router, TS, Tailwind |
| 2    | `.env.local.example`            | Document required secrets              | Env hygiene                      |
| 3    | `supabase/schema.sql`           | Create `tickets` + `kb_articles`       | Relational schema, UUID PKs      |
| 4    | Supabase project + paste keys   | Cloud Postgres/Auth/Realtime ready     | Hosted BaaS setup                |
| 5    | `lib/supabase/client.ts`        | Browser client for auth/query/realtime | Client-side Supabase SDK         |
| 6    | `lib/supabase/server.ts`        | Server client for API routes           | Server vs browser secrets        |
| 7    | `scripts/seed.ts`               | Insert demo tickets + KB               | Seeding, script runners          |
| 8    | `lib/prompts/summarize.ts`      | Centralize prompt text                 | Prompt engineering basics        |
| 9    | `lib/kb/search.ts`              | Keyword KB match                       | Retrieval without ML             |
| 10   | `lib/ai/types.ts` + `claude.ts` | Call Claude, return structured result  | LLM API integration              |
| 11   | `app/api/summarize/route.ts`    | Glue ticket → KB → LLM → DB            | Backend orchestration            |
| 12   | Auth pages + gate               | Email login                            | Supabase Auth                    |
| 13   | `components/*` + dashboard page | Ticket list/detail UI                  | React state + composition        |
| 14   | Realtime subscription           | Live UI on DB changes                  | Event-driven UI                  |
| 15   | (Stretch) embeddings + pgvector | Semantic search                        | RAG talking point                |
| 16   | README + GIF + Vercel           | Ship + show                            | Deployment literacy              |


### What each future file is for (preview)

#### Scaffold / config


| File              | Purpose                                         | Connects to          |
| ----------------- | ----------------------------------------------- | -------------------- |
| `package.json`    | Dependencies & scripts (`dev`, `build`, `seed`) | npm / Next toolchain |
| `app/layout.tsx`  | HTML shell wrapping all pages                   | All `app/`** routes  |
| `app/globals.css` | Tailwind + base styles                          | All UI               |


#### Data layer


| File                     | Purpose                    | Connects to                  |
| ------------------------ | -------------------------- | ---------------------------- |
| `supabase/schema.sql`    | Source of truth for tables | Supabase SQL editor          |
| `scripts/seed.ts`        | Demo data                  | Uses service role → Postgres |
| `lib/supabase/client.ts` | Browser DB/Auth/Realtime   | Dashboard components         |
| `lib/supabase/server.ts` | Secure server DB access    | API routes                   |


#### AI layer


| File                         | Purpose                    | Connects to               |
| ---------------------------- | -------------------------- | ------------------------- |
| `lib/prompts/summarize.ts`   | Prompt strings             | Used by AI adapters       |
| `lib/kb/search.ts`           | Find relevant articles     | Called by summarize route |
| `lib/ai/claude.ts` (etc.)    | Provider-specific HTTP/SDK | Called by summarize route |
| `app/api/summarize/route.ts` | End-to-end AI job          | UI → API → DB → Realtime  |


#### UI layer


| File                          | Purpose                    | Connects to            |
| ----------------------------- | -------------------------- | ---------------------- |
| `app/login/page.tsx`          | Sign in                    | `supabase.auth`        |
| `app/page.tsx`                | Main dashboard composition | Components + Realtime  |
| `components/TicketList.tsx`   | List with selection        | Reads `tickets`        |
| `components/TicketDetail.tsx` | Summary, reply, actions    | Calls `/api/summarize` |
| `components/StatusBadge.tsx`  | Visual status chip         | Ticket `status` field  |
| `components/CopyButton.tsx`   | Clipboard UX               | Suggested reply text   |


---

## Phase 4 — QA

QA answers: **how do we know it works before we deploy?**

### 4.1 Manual test plan


| #   | Scenario        | Steps                                     | Expected                               |
| --- | --------------- | ----------------------------------------- | -------------------------------------- |
| 1   | Auth gate       | Open `/` logged out                       | Redirect to `/login`                   |
| 2   | Login           | Valid email/password                      | Land on dashboard                      |
| 3   | Seed visible    | After seed                                | ~15 tickets in list                    |
| 4   | Select ticket   | Click a row                               | Detail shows subject/body              |
| 5   | Summarize       | Click Regenerate                          | Summary + reply appear; DB row updated |
| 6   | Realtime        | Open 2 browser windows; regenerate in one | Other updates without refresh          |
| 7   | Copy reply      | Click Copy                                | Clipboard has suggested reply          |
| 8   | Status badge    | Tickets with different statuses           | Correct colors/labels                  |
| 9   | Bad ticket id   | POST unknown UUID                         | 404/error JSON, no crash               |
| 10  | Missing API key | Unset key, call summarize                 | Clear 500/config error                 |


### 4.2 What to log / observe

- Network tab: `POST /api/summarize` status + body
- Supabase Table Editor: `summary` / `suggested_reply` columns fill in
- Browser console: Realtime subscription status (`SUBSCRIBED`)
- Vercel / local terminal: LLM errors (rate limit, auth)

### 4.3 Edge cases worth handling

- Ticket has empty body
- KB returns zero matches → still summarize, note “no KB context”
- LLM returns malformed text → fallback message, don’t wipe existing fields
- Double-click Regenerate → disable button while loading

### 4.4 (Optional later) Automated checks

- Unit test `search.ts` keyword ranking with fixture articles
- Unit test prompt builder includes subject/body/KB
- Smoke test: `GET /` returns 200 after auth mock

We will not overbuild tests in v1; manual QA is enough for portfolio honesty.

---

## Phase 5 — Deployment

### 5.1 Hosting map


| Piece                      | Host                                            | Why                                         |
| -------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Next.js app                | Vercel                                          | Native Next support, env vars, preview URLs |
| Postgres / Auth / Realtime | Supabase                                        | Already hosted when you create the project  |
| Secrets                    | Vercel Project Settings → Environment Variables | Same keys as `.env.local`                   |


### 5.2 Deploy steps (when we get there)

1. Push code to GitHub
2. Import repo in Vercel
3. Add env vars in Vercel dashboard
4. Deploy production
5. Run schema SQL in Supabase (if not already)
6. Run seed once against production DB (careful)
7. Create a test agent user in Supabase Auth
8. Record a ~20s demo GIF (`peek` / `licecap`)
9. Put live URL + GIF in `README.md`

### 5.3 Post-deploy smoke test

- Production URL loads login
- Login works
- Tickets list loads
- Summarize works (check provider billing/quota)
- Realtime works on production (enable Realtime on `tickets` table in Supabase)

---

## Learning checklist

Track what you’re internalizing — not just finishing features.

### System Design

- Can explain the problem in 30 seconds
- Can sketch entities + flows on a whiteboard
- Can justify store-vs-regenerate AI output

### Architecture

- Knows client vs server Supabase clients
- Knows why LLM keys stay server-side
- Can draw the Regenerate sequence diagram from memory

### Development

- Next.js App Router: `page` vs `route`
- Supabase query + Realtime subscription
- Prompt + provider adapter pattern
- Controlled React components for ticket UI

### QA & Deployment

- Has a written smoke checklist
- Deployed once to Vercel
- Demo GIF + README for portfolio

### Interview talking points this project unlocks

1. “I built a support copilot that caches LLM drafts in Postgres and updates the UI via Realtime.”
2. “I started with keyword retrieval, then upgraded to embeddings + pgvector for RAG.”
3. “API keys never touch the client; summarization is an authenticated server route.”
4. “I separated prompt templates, KB search, and provider adapters so switching Claude/OpenAI/Gemini is a config change.”

---

## How we will proceed in Cursor

Going forward, each message from me will typically:

1. **Name the phase + step** (e.g. *Phase 3 / Step 1 — Scaffold*)
2. **Explain the purpose** in plain language
3. **Show how it connects** to previous files
4. **Add exactly one file (or one coherent scaffold step)**
5. **Tell you what to verify** before we continue

### Your role as learner

After each file:

- Read it once without rushing
- Answer for yourself: *input? output? who calls this?*
- Run the verification step
- Then reply **“next”** (or ask a question) so we add the next piece

### First development step (next session)

When you are ready, say **“start step 1”** and we will:

1. Scaffold the Next.js app (`create-next-app` with TypeScript, Tailwind, App Router)
2. Explain every generated file Next creates
3. Then stop — no AI routes yet

Do **not** jump to Claude or Realtime until the foundation is clear.

---

## Glossary (quick reference)


| Term             | Meaning here                                                 |
| ---------------- | ------------------------------------------------------------ |
| App Router       | Next.js file-based routing under `app/`                      |
| API Route        | Server endpoint like `app/api/summarize/route.ts`            |
| BaaS             | Backend-as-a-Service (Supabase)                              |
| RLS              | Row Level Security — Postgres policies per user              |
| Realtime         | Websocket feed of Postgres row changes                       |
| RAG              | Retrieval-Augmented Generation — retrieve docs, then ask LLM |
| Embedding        | Vector of numbers representing meaning of text               |
| pgvector         | Postgres extension for vector similarity search              |
| Anon key         | Public Supabase key; safe with RLS                           |
| Service role key | Full-access key; server/scripts only                         |


---

*Document version: 1.0 — living guide. We update this only when architecture decisions change.*