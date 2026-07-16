"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import type { Ticket } from "@/lib/types/ticket";

export function TicketDetail({
  ticket,
  onUpdated,
}: {
  ticket: Ticket | null;
  onUpdated: (ticket: Ticket) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-sm font-medium text-foreground">No ticket selected</p>
        <p className="max-w-xs text-sm text-muted">
          Choose a conversation from the queue to review the message and generate
          an AI-assisted reply.
        </p>
      </div>
    );
  }

  async function regenerate() {
    if (!ticket) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id }),
      });

      const data = (await res.json()) as {
        error?: string;
        summary?: string;
        suggestedReply?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onUpdated({
        ...ticket,
        summary: data.summary ?? ticket.summary,
        suggested_reply: data.suggestedReply ?? ticket.suggested_reply,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="shrink-0 border-b border-[var(--border)] bg-panel px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <span className="font-mono text-[11px] text-muted">
                {ticket.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {ticket.subject}
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              Received{" "}
              {new Date(ticket.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={loading}
              className="bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Generating…" : "Regenerate summary"}
            </button>
            <CopyButton text={ticket.suggested_reply ?? ""} />
          </div>
        </div>

        {error ? (
          <p
            className="mt-4 border border-danger/20 bg-red-50 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-6 md:px-8">
        <section className="animate-fade-up border border-[var(--border)] bg-panel p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Customer message
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {ticket.body}
          </p>
        </section>

        <section className="animate-fade-up border border-[var(--border)] bg-panel p-5 [animation-delay:60ms]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              AI summary
            </h3>
            <span className="text-[10px] font-medium uppercase tracking-wide text-accent">
              Copilot
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-foreground">
            {ticket.summary ?? (
              <span className="text-muted">
                No summary yet — click Regenerate summary to draft one with KB
                context.
              </span>
            )}
          </p>
        </section>

        <section className="animate-fade-up border border-accent/20 bg-accent-soft/40 p-5 [animation-delay:120ms]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Suggested reply
            </h3>
            <CopyButton text={ticket.suggested_reply ?? ""} label="Copy" />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {ticket.suggested_reply ?? (
              <span className="text-muted">
                No draft yet — regenerate to create a reply grounded in your
                knowledge base.
              </span>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
