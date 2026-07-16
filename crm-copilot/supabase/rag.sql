create extension if not exists vector;

alter table public.kb_articles
  add column if not exists embedding vector(768);

comment on column public.kb_articles.embedding is
  '768-d embedding for semantic KB search (OpenAI or Gemini).';

create index if not exists kb_articles_embedding_ivfflat
  on public.kb_articles
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

create or replace function public.match_kb_articles(
  query_embedding vector(768),
  match_count int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    a.id,
    a.title,
    a.content,
    (1 - (a.embedding <=> query_embedding))::float as similarity
  from public.kb_articles a
  where a.embedding is not null
  order by a.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

comment on function public.match_kb_articles is
  'Return top KB articles by cosine similarity to the query embedding.';
