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
      <p className="p-4 text-sm text-zinc-500">
        No tickets yet. Run <code className="text-zinc-700">npm run seed</code>.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-y-auto">
      {tickets.map((ticket) => {
        const selected = ticket.id === selectedId;
        return (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onSelect(ticket.id)}
              className={`w-full px-4 py-3 text-left transition-colors ${
                selected ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`line-clamp-2 text-sm font-medium ${
                    selected ? "text-white" : "text-zinc-900"
                  }`}
                >
                  {ticket.subject}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
              <p
                className={`mt-1 line-clamp-2 text-xs ${
                  selected ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                {ticket.body}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
