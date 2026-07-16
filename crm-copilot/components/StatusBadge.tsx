import type { TicketStatus } from "@/lib/types/ticket";

const STYLES: Record<TicketStatus, string> = {
  open: "bg-[var(--open-bg)] text-[var(--open)] ring-1 ring-[var(--open)]/15",
  in_progress:
    "bg-[var(--progress-bg)] text-[var(--progress)] ring-1 ring-[var(--progress)]/15",
  resolved:
    "bg-[var(--resolved-bg)] text-[var(--resolved)] ring-1 ring-[var(--resolved)]/15",
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
      className={`inline-flex shrink-0 items-center font-medium tracking-wide ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      } ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
