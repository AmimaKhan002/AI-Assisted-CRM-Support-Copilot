const EMBEDDING_DIMENSIONS = 768;

export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

export function hasEmbeddingsProvider(): boolean {
  const openai = process.env.OPENAI_API_KEY;
  const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return Boolean(
    (openai && !openai.includes("your_")) ||
      (google && !google.includes("your_")),
  );
}

/**
 * Embed one string. Throws if no embeddings provider is configured.
 */
export async function embedText(text: string): Promise<number[]> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    throw new Error("Cannot embed empty text.");
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai && !openai.includes("your_")) {
    return embedWithOpenAI(cleaned, openai);
  }

  const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (google && !google.includes("your_")) {
    return embedWithGemini(cleaned, google);
  }

  throw new Error(
    "No embeddings provider configured. Groq cannot embed text. " +
      "Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to .env.local " +
      "(or rely on keyword search fallback).",
  );
}

async function embedWithOpenAI(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI embeddings error ${response.status}: ${detail.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("OpenAI returned an empty embedding.");
  }
  return embedding;
}

async function embedWithGemini(text: string, apiKey: string): Promise<number[]> {
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent` +
    `?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Gemini embeddings error ${response.status}: ${detail.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const embedding = data.embedding?.values;
  if (!embedding?.length) {
    throw new Error("Gemini returned an empty embedding.");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-d embedding, got ${embedding.length}.`,
    );
  }
  return embedding;
}

export function toPgvectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
