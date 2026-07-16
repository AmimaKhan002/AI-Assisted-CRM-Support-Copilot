/**
 * Google Gemini adapter (default free-tier provider)
 * -----------------------------------------------------------------------------
 * PURPOSE:
 *   Call Gemini with our summarize prompts and return a SummarizeResult.
 *   Best free option for this portfolio project (Google AI Studio free tier).
 *
 * HOW IT CONNECTS:
 *   .env.local → GOOGLE_GENERATIVE_AI_API_KEY + AI_PROVIDER=gemini
 *        │
 *        ▼
 *   summarizeWithGemini(input)
 *        │  uses prompts from lib/prompts/summarize.ts
 *        ▼
 *   SummarizeResult → /api/summarize writes to Supabase
 *
 * GET A FREE KEY:
 *   https://aistudio.google.com/apikey
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "@google/generative-ai";
import {
  SUMMARIZE_SYSTEM_PROMPT,
  buildSummarizeUserPrompt,
  parseSummarizeResponse,
  type SummarizePromptInput,
} from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";

/** Fast, capable free-tier model. Override with GEMINI_MODEL in .env if needed. */
const DEFAULT_MODEL = "gemini-2.0-flash";

function getGeminiModel(): GenerativeModel {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini_key_here")) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add a free key from " +
        "https://aistudio.google.com/apikey to crm-copilot/.env.local",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    systemInstruction: SUMMARIZE_SYSTEM_PROMPT,
  });
}

/**
 * Summarize a ticket and draft a reply using Gemini.
 * Server-only — never import this into a Client Component.
 */
export async function summarizeWithGemini(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  const model = getGeminiModel();
  const userPrompt = buildSummarizeUserPrompt(input);

  const result = await model.generateContent(userPrompt);
  const raw = result.response.text().trim();

  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = parseSummarizeResponse(raw);

  return {
    summary: parsed.summary,
    suggestedReply: parsed.suggestedReply,
    provider: "gemini",
    raw,
  };
}
