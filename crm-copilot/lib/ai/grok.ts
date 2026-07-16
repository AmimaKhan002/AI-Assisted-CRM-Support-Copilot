/**
 * xAI Grok adapter (sole LLM provider for this project)
 * -----------------------------------------------------------------------------
 * PURPOSE:
 *   Call Grok with our summarize prompts and return a SummarizeResult.
 *   xAI's API is OpenAI-compatible (chat/completions).
 *
 * HOW IT CONNECTS:
 *   .env.local → XAI_API_KEY
 *        │
 *        ▼
 *   summarizeWithGrok(input)
 *        │  uses prompts from lib/prompts/summarize.ts
 *        ▼
 *   SummarizeResult → /api/summarize writes to Supabase
 *
 * GET A KEY:
 *   https://console.x.ai/ → API Keys
 */

import {
  SUMMARIZE_SYSTEM_PROMPT,
  buildSummarizeUserPrompt,
  parseSummarizeResponse,
  type SummarizePromptInput,
} from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";

const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";
/** Fast/cheap default; override with XAI_MODEL in .env.local */
const DEFAULT_MODEL = "grok-3-mini";

export async function summarizeWithGrok(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || apiKey.includes("your_xai_key")) {
    throw new Error(
      "Missing XAI_API_KEY. Create a key at https://console.x.ai/ " +
        "and add it to crm-copilot/.env.local",
    );
  }

  const userPrompt = buildSummarizeUserPrompt(input);
  const model = process.env.XAI_MODEL ?? DEFAULT_MODEL;

  const response = await fetch(XAI_CHAT_URL, {
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
      `Grok API error ${response.status}: ${detail.slice(0, 400)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("Grok returned an empty response.");
  }

  const parsed = parseSummarizeResponse(raw);

  return {
    summary: parsed.summary,
    suggestedReply: parsed.suggestedReply,
    provider: "grok",
    raw,
  };
}
