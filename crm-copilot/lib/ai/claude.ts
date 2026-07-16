import Anthropic from "@anthropic-ai/sdk";
import {
  SUMMARIZE_SYSTEM_PROMPT,
  buildSummarizeUserPrompt,
  parseSummarizeResponse,
  type SummarizePromptInput,
} from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("your_key_here")) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to crm-copilot/.env.local " +
        "(create a key at https://console.anthropic.com).",
    );
  }
  return new Anthropic({ apiKey });
}


export async function summarizeWithClaude(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  const client = getAnthropicClient();
  const userPrompt = buildSummarizeUserPrompt(input);

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: 1024,
    system: SUMMARIZE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const raw = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  if (!raw) {
    throw new Error("Claude returned an empty response.");
  }

  const parsed = parseSummarizeResponse(raw);

  return {
    summary: parsed.summary,
    suggestedReply: parsed.suggestedReply,
    provider: "claude",
    raw,
  };
}
