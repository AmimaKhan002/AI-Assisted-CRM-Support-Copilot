/**
 * AI entry point — Grok only
 * -----------------------------------------------------------------------------
 * PURPOSE:
 *   /api/summarize calls summarizeTicket(). Vendor details stay in grok.ts.
 */

import type { SummarizePromptInput } from "@/lib/prompts/summarize";
import type { SummarizeResult } from "@/lib/ai/types";
import { summarizeWithGrok } from "@/lib/ai/grok";

export async function summarizeTicket(
  input: SummarizePromptInput,
): Promise<SummarizeResult> {
  return summarizeWithGrok(input);
}
