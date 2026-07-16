"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusSelect } from "@/components/StatusSelect";
import { CopyButton } from "@/components/CopyButton";
import type { Ticket, TicketStatus } from "@/lib/types/ticket";

export function TicketDetail({
  ticket,
  onUpdated,
  showBack = false,
}: {
  ticket: Ticket | null;
  onUpdated: (ticket: Ticket) => void;
  showBack?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) {
    return (
      <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 bg-panel-muted/40 p-6 text-center sm:p-10">
        <p className="text-base font-bold text-foreground">Select a ticket</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Pick a conversation from the queue to review the customer message and
          generate an AI-assisted summary and reply.
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
        status?: TicketStatus;
      };

      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onUpdated({
        ...ticket,
        summary: data.summary ?? ticket.summary,
        suggested_reply: data.suggestedReply ?? ticket.suggested_reply,
        status: data.status ?? ticket.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-panel">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        {showBack ? (
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover lg:hidden"
          >
            ← Back to queue
          </Link>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <span className="font-mono text-[11px] text-muted">
                #{ticket.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl md:text-2xl">
              {ticket.subject}
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              Received{" "}
              {new Date(ticket.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>

            <div className="mt-4">
              <StatusSelect
                ticketId={ticket.id}
                status={ticket.status}
                onChange={(status) => onUpdated({ ...ticket, status })}
              />
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={loading}
              className="btn-primary w-full px-4 py-2.5 text-sm sm:w-auto"
            >
              {loading ? "Generating…" : "Regenerate summary"}
            </button>
            <CopyButton text={ticket.suggested_reply ?? ""} />
          </div>
        </div>

        {error ? (
          <p
            className="mt-4 border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
        <section className="animate-fade-up border border-[var(--border)] bg-panel-muted p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Customer message
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {ticket.body}
          </p>
        </section>

        <section className="animate-fade-up border border-[var(--border)] bg-panel-muted p-4 shadow-[var(--shadow-sm)] sm:p-5 [animation-delay:50ms]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              AI summary
            </h3>
            <span className="bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Copilot
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-foreground">
            {ticket.summary ?? (
              <span className="text-muted">
                No summary yet. Click Regenerate summary to create one with
                knowledge-base context.
              </span>
            )}
          </p>
        </section>

        <section className="animate-fade-up border border-accent/25 bg-accent-soft/50 p-4 sm:p-5 [animation-delay:100ms]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Suggested reply
            </h3>
            <CopyButton text={ticket.suggested_reply ?? ""} label="Copy" />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {ticket.suggested_reply ?? (
              <span className="text-muted">
                No draft yet. Regenerate to produce a reply grounded in your KB.
              </span>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
