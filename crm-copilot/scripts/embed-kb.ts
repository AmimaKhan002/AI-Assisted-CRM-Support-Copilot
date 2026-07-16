import { config } from "dotenv";
import { resolve } from "path";
import { createServiceRoleClient } from "../lib/supabase/server";
import {
  embedText,
  hasEmbeddingsProvider,
  toPgvectorLiteral,
} from "../lib/ai/embeddings";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const force = process.argv.includes("--force");

  if (!hasEmbeddingsProvider()) {
    throw new Error(
      "No embeddings provider. Groq cannot create embeddings.\n" +
        "Add OPENAI_API_KEY (recommended) or GOOGLE_GENERATIVE_AI_API_KEY to .env.local.",
    );
  }

  const supabase = createServiceRoleClient();

  let query = supabase.from("kb_articles").select("id, title, content, embedding");
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const targets = force
    ? rows
    : rows.filter((row) => row.embedding == null);

  if (targets.length === 0) {
    console.log(
      `Nothing to embed (${rows.length} articles already have embeddings). Use --force to redo.`,
    );
    return;
  }

  console.log(`Embedding ${targets.length} article(s)…`);

  for (const row of targets) {
    const text = `${row.title}\n\n${row.content}`;
    const embedding = await embedText(text);
    const { error: updateError } = await supabase
      .from("kb_articles")
      .update({ embedding: toPgvectorLiteral(embedding) })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Failed to save embedding for "${row.title}": ${updateError.message}`,
      );
    }
    console.log(`  ✓ ${row.title}`);
  }

  console.log("Done. Semantic KB search is ready.");
}

main().catch((err) => {
  console.error("embed-kb failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
