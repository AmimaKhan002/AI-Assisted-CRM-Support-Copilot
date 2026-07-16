import type { SupabaseClient } from "@supabase/supabase-js";
import type { KbSnippet } from "@/lib/prompts/summarize";
import {
  embedText,
  hasEmbeddingsProvider,
  toPgvectorLiteral,
} from "@/lib/ai/embeddings";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "i",
  "we",
  "you",
  "my",
  "our",
  "your",
  "this",
  "that",
  "it",
  "with",
  "from",
  "as",
  "by",
  "can",
  "could",
  "please",
  "help",
  "hi",
  "hello",
  "thanks",
  "thank",
]);

type KbRow = {
  id: string;
  title: string;
  content: string;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreArticle(tokens: string[], article: KbRow): number {
  const haystack = `${article.title} ${article.content}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      if (article.title.toLowerCase().includes(token)) {
        score += 3;
      } else {
        score += 1;
      }
    }
  }

  return score;
}

/** Keyword search (v1) — no API keys required. */
export async function searchKbArticlesKeyword(
  supabase: SupabaseClient,
  ticketText: string,
  limit = 3,
): Promise<KbSnippet[]> {
  const { data, error } = await supabase
    .from("kb_articles")
    .select("id, title, content");

  if (error) {
    throw new Error(`KB keyword search failed: ${error.message}`);
  }

  const articles = (data ?? []) as KbRow[];
  if (articles.length === 0) return [];

  const tokens = tokenize(ticketText);
  if (tokens.length === 0) {
    return articles.slice(0, limit).map(({ title, content }) => ({
      title,
      content,
    }));
  }

  return articles
    .map((article) => ({ article, score: scoreArticle(tokens, article) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => ({
      title: article.title,
      content: article.content,
    }));
}

/** Semantic search (v2) — embed query, then pgvector similarity. */
export async function searchKbArticlesSemantic(
  supabase: SupabaseClient,
  ticketText: string,
  limit = 3,
): Promise<KbSnippet[]> {
  const embedding = await embedText(ticketText);
  const { data, error } = await supabase.rpc("match_kb_articles", {
    query_embedding: toPgvectorLiteral(embedding),
    match_count: limit,
  });

  if (error) {
    throw new Error(`KB semantic search failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    title: string;
    content: string;
    similarity?: number;
  }>;

  return rows.map(({ title, content }) => ({ title, content }));
}
export async function searchKbArticles(
  supabase: SupabaseClient,
  ticketText: string,
  limit = 3,
): Promise<KbSnippet[]> {
  if (hasEmbeddingsProvider()) {
    try {
      const semantic = await searchKbArticlesSemantic(
        supabase,
        ticketText,
        limit,
      );
      if (semantic.length > 0) {
        return semantic;
      }
    } catch (err) {
      console.warn(
        "[kb/search] Semantic search unavailable, falling back to keywords:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return searchKbArticlesKeyword(supabase, ticketText, limit);
}
