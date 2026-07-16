import type { TicketStatus } from "@/lib/types/ticket";

const STYLES: Record<TicketStatus, string> = {
  open: "bg-[var(--warning-bg)] text-[var(--warning)] ring-1 ring-[var(--warning)]/20",
  in_progress:
    "bg-[var(--info-bg)] text-[var(--info)] ring-1 ring-[var(--info)]/20",
  resolved:
    "bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-[var(--success)]/20",
};

const LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: TicketStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center font-bold uppercase tracking-wide ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
