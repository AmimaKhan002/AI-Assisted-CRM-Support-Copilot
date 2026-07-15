export type KbSnippet = {
  title: string;
  content: string;
};

export type SummarizePromptInput = {
  subject: string;
  body: string;
  kbArticles: KbSnippet[];
};

/**
 * System prompt: stable rules the model should follow on every request.
 * Keep this short and specific — vague rules produce vague replies.
 */
export const SUMMARIZE_SYSTEM_PROMPT = `You are a CRM support copilot helping a human support agent.

Your job:
1. Summarize the customer ticket in exactly 2 clear sentences.
2. Draft a polite, professional reply the agent can send (or lightly edit).

Rules:
- Use the knowledge base context when it is relevant.
- If the KB does not cover the issue, say so briefly in the summary and draft a helpful reply that asks for the missing details or next steps.
- Do not invent policies, prices, or features that are not in the ticket or KB.
- Do not include markdown code fences.
- Reply in this exact format (labels on their own lines):

SUMMARY:
<two sentences>

REPLY:
<body of the email-style reply>`;

/**
 * Build the user message: ticket content + retrieved KB articles.
 * The LLM only "knows" what we put here + its general training — this is
 * where we ground the answer in OUR product docs (simple RAG pattern).
 */
export function buildSummarizeUserPrompt(input: SummarizePromptInput): string {
  const { subject, body, kbArticles } = input;

  const kbSection =
    kbArticles.length === 0
      ? "(No matching knowledge base articles found.)"
      : kbArticles
          .map(
            (article, index) =>
              `[${index + 1}] ${article.title}\n${article.content}`,
          )
          .join("\n\n");

  return `Customer ticket:

Subject: ${subject}

Body:
${body}

Knowledge base context:
${kbSection}

Produce SUMMARY and REPLY in the required format.`;
}

/**
 * Parse the LLM's plain-text response back into structured fields.
 * Kept here so every provider can share the same parser.
 */
export function parseSummarizeResponse(raw: string): {
  summary: string;
  suggestedReply: string;
} {
  const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?=REPLY:|$)/i);
  const replyMatch = raw.match(/REPLY:\s*([\s\S]*?)$/i);

  const summary = (summaryMatch?.[1] ?? raw).trim();
  const suggestedReply = (replyMatch?.[1] ?? "").trim();

  return {
    summary: summary || "Summary unavailable.",
    suggestedReply:
      suggestedReply ||
      "Suggested reply unavailable. Please regenerate or write manually.",
  };
}
