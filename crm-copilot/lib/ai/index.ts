import type { SummarizePromptInput } from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";
import { summarizeWithClaude } from "@/lib/ai/claude";
import { summarizeWithGemini } from "@/lib/ai/gemini";

export type AiProvider = "claude" | "openai" | "gemini";

export function getAiProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "gemini").toLowerCase().trim();
  if (raw === "claude" || raw === "openai" || raw === "gemini") {
    return raw;
  }
  throw new Error(
    `Unknown AI_PROVIDER="${process.env.AI_PROVIDER}". Use: gemini | claude | openai`,
  );
}

export async function summarizeTicket(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  const provider = getAiProvider();

  switch (provider) {
    case "gemini":
      return summarizeWithGemini(input);
    case "claude":
      return summarizeWithClaude(input);
    case "openai":
      throw new Error(
        'AI_PROVIDER=openai is not wired yet. Use "gemini" (free) for now.',
      );
    default:
      return summarizeWithGemini(input);
  }
}
