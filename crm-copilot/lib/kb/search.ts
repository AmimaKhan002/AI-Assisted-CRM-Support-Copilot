import type { SupabaseClient } from "@supabase/supabase-js";
import type { KbSnippet } from "@/lib/prompts/summarize";

/** Tiny words that would match almost every article — ignore them. */
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
      // Title matches count more — they are stronger signals.
      if (article.title.toLowerCase().includes(token)) {
        score += 3;
      } else {
        score += 1;
      }
    }
  }

  return score;
}

/**
 * Find the most relevant KB articles for a ticket's text.
 *
 * @param supabase - Server Supabase client (anon or service_role)
 * @param ticketText - Usually `subject + " " + body`
 * @param limit - Max articles to return (default 3)
 */
export async function searchKbArticles(
  supabase: SupabaseClient,
  ticketText: string,
  limit = 3,
): Promise<KbSnippet[]> {
  const { data, error } = await supabase
    .from("kb_articles")
    .select("id, title, content");

  if (error) {
    throw new Error(`KB search failed: ${error.message}`);
  }

  const articles = (data ?? []) as KbRow[];
  if (articles.length === 0) {
    return [];
  }

  const tokens = tokenize(ticketText);
  if (tokens.length === 0) {
    // No useful words — return a few articles as weak fallback.
    return articles.slice(0, limit).map(({ title, content }) => ({
      title,
      content,
    }));
  }

  const ranked = articles
    .map((article) => ({
      article,
      score: scoreArticle(tokens, article),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If nothing scored > 0, return empty — prompt will say "no KB context".
  return ranked.map(({ article }) => ({
    title: article.title,
    content: article.content,
  }));
}
