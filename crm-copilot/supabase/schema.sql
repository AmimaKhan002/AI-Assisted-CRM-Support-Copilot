-- =============================================================================
-- CRM Support Copilot — database schema
-- =============================================================================
-- PURPOSE:
--   Defines the two core tables this product stores in Supabase Postgres:
--   · tickets      — support issues + AI-filled summary/reply fields
--   · kb_articles  — knowledge base used to ground suggested replies
--
-- HOW TO RUN:
--   1. Open https://supabase.com → your project → SQL Editor
--   2. Paste this entire file → Run
--
-- HOW IT CONNECTS (later steps):
--   seed.ts                    → INSERT into these tables
--   lib/supabase/*.ts          → SELECT / UPDATE rows from the app
--   /api/summarize             → UPDATE tickets.summary + suggested_reply
--   Dashboard + Realtime       → listens to changes on tickets
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tickets
-- One row = one support conversation item an agent works on.
-- summary / suggested_reply start NULL and get filled by the AI route.
-- ---------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),

  -- Raw ticket content (from form, CSV seed, or future integrations)
  subject text not null,
  body text not null,

  -- Agent workflow signal → drives StatusBadge in the UI
  -- open | in_progress | resolved
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved')),

  -- AI outputs (nullable until /api/summarize runs)
  summary text,
  suggested_reply text,

  created_at timestamptz not null default now()
);

-- Helpful for "newest first" ticket lists
create index if not exists tickets_created_at_idx
  on public.tickets (created_at desc);

-- Helpful if we filter the dashboard by status later
create index if not exists tickets_status_idx
  on public.tickets (status);

comment on table public.tickets is
  'Support tickets; summary/suggested_reply are written by the summarize API.';

-- ---------------------------------------------------------------------------
-- kb_articles
-- Knowledge base snippets. The summarize route searches these (keyword first,
-- embeddings + pgvector later) and passes matches into the LLM prompt.
-- ---------------------------------------------------------------------------
create table if not exists public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

comment on table public.kb_articles is
  'Knowledge base articles used as retrieval context for suggested replies.';

-- ---------------------------------------------------------------------------
-- Realtime (needed for live dashboard updates in a later step)
-- In Supabase Dashboard you can also toggle this under:
-- Database → Publications / Realtime → enable for `tickets`
-- Idempotent: safe to re-run if the table is already in the publication.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STRETCH RAG: see supabase/rag.sql (pgvector + match_kb_articles)
-- ---------------------------------------------------------------------------
