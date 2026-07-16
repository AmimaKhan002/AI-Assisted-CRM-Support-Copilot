"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { Ticket } from "@/lib/types/ticket";

export function TicketList({
  tickets,
  selectedId,
}: {
  tickets: Ticket[];
  selectedId?: string | null;
}) {
  if (tickets.length === 0) {
    return (
      <p className="p-5 text-sm text-muted">
        No tickets yet. Run{" "}
        <code className="font-mono text-xs text-foreground">npm run seed</code>.
      </p>
    );
  }

  return (
    <ul className="overflow-y-auto">
      {tickets.map((ticket, index) => {
        const selected = ticket.id === selectedId;
        return (
          <li
            key={ticket.id}
            className="animate-fade-up border-b border-[var(--border)]"
            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
          >
            <Link
              href={`/tickets/${ticket.id}`}
              className={`relative block w-full px-3 py-3.5 text-left transition-colors sm:px-4 ${
                selected ? "bg-accent-soft" : "hover:bg-panel-muted"
              }`}
            >
              {selected ? (
                <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
              ) : null}
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <span className="line-clamp-2 text-[13px] font-bold leading-snug text-foreground">
                  {ticket.subject}
                </span>
                <StatusBadge status={ticket.status} compact />
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {ticket.body}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted/90">
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
