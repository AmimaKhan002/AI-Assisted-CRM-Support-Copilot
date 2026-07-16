import type { TicketStatus } from "@/lib/types/ticket";

const STYLES: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-900",
  in_progress: "bg-sky-100 text-sky-900",
  resolved: "bg-emerald-100 text-emerald-900",
};

const LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
