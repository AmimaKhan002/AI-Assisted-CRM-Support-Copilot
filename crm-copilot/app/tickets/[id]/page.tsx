"use client";

/**
 * Ticket detail route — /tickets/[id]
 * Mobile: full-screen detail with back link
 * Desktop: queue sidebar + detail pane
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { TicketList } from "@/components/TicketList";
import { TicketDetail } from "@/components/TicketDetail";
import { createBrowserClient } from "@/lib/supabase/client";
import { useTicketsRealtime } from "@/lib/hooks/useTicketsRealtime";
import type { Ticket } from "@/lib/types/ticket";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const realtimeStatus = useTicketsRealtime(setTickets);

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const selected = tickets.find((t) => t.id === ticketId) ?? null;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id, subject, body, status, summary, suggested_reply, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setTickets([]);
    } else {
      setTickets((data ?? []) as Ticket[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function handleUpdated(updated: Ticket) {
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
  }

  return (
    <AuthGate>
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <AppHeader
          counts={counts}
          realtimeStatus={realtimeStatus}
          title="Ticket detail"
        />

        <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 lg:grid-cols-[minmax(280px,400px)_1fr] lg:gap-4 lg:px-4 lg:py-4 xl:px-6">
          {/* Queue — desktop only (mobile uses Back to queue) */}
          <aside className="hidden min-h-0 flex-col border border-[var(--border)] bg-panel shadow-[var(--shadow-sm)] lg:flex">
            <div className="flex shrink-0 items-end justify-between border-b border-[var(--border)] px-4 py-3.5">
              <div>
                <p className="text-sm font-extrabold text-foreground">Queue</p>
                <p className="text-xs text-muted">
                  {tickets.length} conversations
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-5 text-sm text-muted">Loading…</p>
              ) : loadError ? (
                <p className="p-5 text-sm text-danger">{loadError}</p>
              ) : (
                <TicketList tickets={tickets} selectedId={ticketId} />
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-[var(--border)] bg-panel shadow-[var(--shadow-sm)] max-lg:flex-1 lg:border">
            {loading && !selected ? (
              <p className="p-6 text-sm text-muted">Loading ticket…</p>
            ) : !selected && !loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="font-bold text-foreground">Ticket not found</p>
                <a href="/" className="text-sm font-semibold text-accent">
                  ← Back to queue
                </a>
              </div>
            ) : (
              <TicketDetail
                ticket={selected}
                onUpdated={handleUpdated}
                showBack
              />
            )}
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
