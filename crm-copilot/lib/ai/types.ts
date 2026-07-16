import type { SummarizePromptInput } from "@/lib/prompts/summarize";

export type SummarizeResult = {
  summary: string;
  suggestedReply: string;
  provider: "grok";
  raw?: string;
};

export type SummarizeTicketFn = (
  input: SummarizePromptInput,
) => Promise<SummarizeResult>;
