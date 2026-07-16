import type { SummarizePromptInput } from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";
import { summarizeWithGroq } from "@/lib/ai/groq";

export async function summarizeTicket(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  return summarizeWithGroq(input);
}
