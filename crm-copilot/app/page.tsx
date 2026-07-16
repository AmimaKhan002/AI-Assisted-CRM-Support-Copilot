"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { TicketList } from "@/components/TicketList";
import { TicketDetail } from "@/components/TicketDetail";
import { createBrowserClient } from "@/lib/supabase/client";
import { useTicketsRealtime } from "@/lib/hooks/useTicketsRealtime";
import type { Ticket } from "@/lib/types/ticket";

export default function HomePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      const rows = (data ?? []) as Ticket[];
      setTickets(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function signOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function handleUpdated(updated: Ticket) {
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
  }

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <AuthGate>
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[var(--border)] bg-panel/90 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-accent text-sm font-extrabold text-white">
                CS
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                  CRM Support Copilot
                </p>
                <h1 className="text-[15px] font-extrabold tracking-tight text-foreground">
                  Agent workspace
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-muted lg:flex">
                <span className="border border-[var(--border)] bg-panel-muted px-2.5 py-1.5">
                  Open {counts.open}
                </span>
                <span className="border border-[var(--border)] bg-panel-muted px-2.5 py-1.5">
                  Active {counts.in_progress}
                </span>
                <span className="border border-[var(--border)] bg-panel-muted px-2.5 py-1.5">
                  Done {counts.resolved}
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold ${
                  realtimeStatus === "subscribed"
                    ? "border-emerald-500/30 bg-[var(--success-bg)] text-[var(--success)]"
                    : realtimeStatus === "channel_error" ||
                        realtimeStatus === "timed_out"
                      ? "border-red-500/30 bg-[var(--danger-bg)] text-danger"
                      : "border-[var(--border)] bg-panel-muted text-muted"
                }`}
                title={`Realtime: ${realtimeStatus}`}
              >
                <span
                  className={`h-1.5 w-1.5 ${
                    realtimeStatus === "subscribed"
                      ? "live-dot bg-[var(--success)]"
                      : "bg-slate-400"
                  }`}
                />
                {realtimeStatus === "subscribed"
                  ? "Live"
                  : realtimeStatus === "connecting"
                    ? "Connecting"
                    : "Offline"}
              </span>

              <button
                type="button"
                onClick={() => void signOut()}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 md:grid-cols-[minmax(300px,380px)_1fr] md:gap-4 md:px-4 md:py-4 lg:px-6">
          <aside className="flex min-h-0 flex-col border border-[var(--border)] bg-panel shadow-[var(--shadow-sm)] max-md:border-x-0 max-md:border-t-0">
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
                <p className="p-5 text-sm text-muted">Loading tickets…</p>
              ) : loadError ? (
                <p className="p-5 text-sm text-danger">{loadError}</p>
              ) : (
                <TicketList
                  tickets={tickets}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>
          </aside>

          <section className="min-h-0 overflow-hidden border border-[var(--border)] bg-panel shadow-[var(--shadow-sm)] max-md:border-x-0">
            <TicketDetail ticket={selected} onUpdated={handleUpdated} />
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
