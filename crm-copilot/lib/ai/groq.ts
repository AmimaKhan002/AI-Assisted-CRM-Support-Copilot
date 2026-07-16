import {
  SUMMARIZE_SYSTEM_PROMPT,
  buildSummarizeUserPrompt,
  parseSummarizeResponse,
  type SummarizePromptInput,
} from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
/** Fast free-tier default; override with GROQ_MODEL in .env.local */
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function summarizeWithGroq(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq_key")) {
    throw new Error(
      "Missing GROQ_API_KEY. Create a free key at https://console.groq.com/keys " +
        "and add it to crm-copilot/.env.local",
    );
  }

  const userPrompt = buildSummarizeUserPrompt(input);
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Groq API error ${response.status}: ${detail.slice(0, 400)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("Groq returned an empty response.");
  }

  const parsed = parseSummarizeResponse(raw);

  return {
    summary: parsed.summary,
    suggestedReply: parsed.suggestedReply,
    provider: "groq",
    raw,
  };
}
