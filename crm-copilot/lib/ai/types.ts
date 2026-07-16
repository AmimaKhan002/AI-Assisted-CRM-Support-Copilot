import type { SummarizePromptInput } from "@/lib/prompts/summarize";

export type SummarizeResult = {
  summary: string;
  suggestedReply: string;
  provider: "claude" | "openai" | "gemini";
  raw?: string;
};
export type SummarizeTicketFn = (
  input: SummarizePromptInput,
) => Promise<SummarizeResult>;
