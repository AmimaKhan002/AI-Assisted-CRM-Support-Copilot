/**
 * POST /api/summarize
 * -----------------------------------------------------------------------------
 * PURPOSE:
 *   Orchestrate one "AI assist" job for a ticket:
 *   1. Load the ticket from Supabase
 *   2. Find related KB articles (keyword search)
 *   3. Call Groq to summarize + draft a reply
 *   4. Save summary + suggested_reply back onto the ticket
 *
 * HOW IT CONNECTS:
 *   TicketDetail "Regenerate" (later UI)
 *        │  POST { ticketId }
 *        ▼
 *   app/api/summarize/route.ts  ← YOU ARE HERE
 *        │
 *        ├─ createServiceRoleClient()     → fetch + update ticket
 *        ├─ searchKbArticles()            → KB context
 *        └─ summarizeTicket()             → Groq
 *                │
 *                ▼
 *        UPDATE tickets SET summary, suggested_reply
 *                │
 *                ▼
 *        Supabase Realtime → dashboard refreshes (later step)
 *
 * BODY:    { "ticketId": "<uuid>" }
 * RETURNS: { summary, suggestedReply, provider, ticketId }
 */

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { searchKbArticles } from "@/lib/kb/search";
import { summarizeTicket } from "@/lib/ai";

type SummarizeBody = {
  ticketId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummarizeBody;
    const ticketId = body.ticketId?.trim();

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 1) Load ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, subject, body")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return NextResponse.json(
        { error: `Failed to load ticket: ${ticketError.message}` },
        { status: 500 },
      );
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 },
      );
    }

    // 2) Retrieve KB context
    const kbArticles = await searchKbArticles(
      supabase,
      `${ticket.subject} ${ticket.body}`,
      3,
    );

    // 3) Call LLM (Groq)
    const result = await summarizeTicket({
      subject: ticket.subject,
      body: ticket.body,
      kbArticles,
    });

    // 4) Persist AI output
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        summary: result.summary,
        suggested_reply: result.suggestedReply,
      })
      .eq("id", ticketId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save AI output: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ticketId,
      summary: result.summary,
      suggestedReply: result.suggestedReply,
      provider: result.provider,
      kbMatched: kbArticles.map((a) => a.title),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/summarize]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
