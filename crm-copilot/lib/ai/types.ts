import type { SummarizePromptInput } from "@/lib/prompts/summarize";

export type SummarizeResult = {
  summary: string;
  suggestedReply: string;
  provider: "groq";
  raw?: string;
};

export type SummarizeTicketFn = (
  input: SummarizePromptInput,
) => Promise<SummarizeResult>;
