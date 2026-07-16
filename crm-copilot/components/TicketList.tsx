import { StatusBadge } from "@/components/StatusBadge";
import type { Ticket } from "@/lib/types/ticket";

export function TicketList({
  tickets,
  selectedId,
  onSelect,
}: {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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
            style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
          >
            <button
              type="button"
              onClick={() => onSelect(ticket.id)}
              className={`relative w-full px-4 py-3.5 text-left transition-colors ${
                selected
                  ? "bg-accent-soft/60"
                  : "hover:bg-panel-muted"
              }`}
            >
              {selected ? (
                <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 text-sm font-semibold text-foreground">
                  {ticket.subject}
                </span>
                <StatusBadge status={ticket.status} compact />
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {ticket.body}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted/80">
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
