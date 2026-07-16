"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { TicketStatus } from "@/lib/types/ticket";

const OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export function StatusSelect({
  ticketId,
  status,
  onChange,
}: {
  ticketId: string;
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: TicketStatus) {
    if (next === status) return;
    setSaving(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ status: next })
      .eq("id", ticketId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        Status
      </label>
      <select
        value={status}
        disabled={saving}
        onChange={(e) => void handleChange(e.target.value as TicketStatus)}
        className="field-input max-w-[180px] py-2 text-sm font-semibold"
        aria-label="Ticket status"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
