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
      <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-500">
        Select a ticket to view details and AI suggestions.
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
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <StatusBadge status={ticket.status} />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">
            {ticket.subject}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void regenerate()}
            disabled={loading}
            className="bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Regenerate summary"}
          </button>
          <CopyButton text={ticket.suggested_reply ?? ""} />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Customer message
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {ticket.body}
        </p>
      </section>

      <section className="mt-8 border-t border-zinc-200 pt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          AI summary
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-800">
          {ticket.summary ?? (
            <span className="text-zinc-400">
              No summary yet — click Regenerate summary.
            </span>
          )}
        </p>
      </section>

      <section className="mt-6 border-t border-zinc-200 pt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Suggested reply
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {ticket.suggested_reply ?? (
            <span className="text-zinc-400">
              No draft yet — click Regenerate summary.
            </span>
          )}
        </p>
      </section>
    </div>
  );
}
