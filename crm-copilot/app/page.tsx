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

  const counts = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    };
  }, [tickets]);

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
        <header className="shrink-0 border-b border-[var(--border)] bg-panel/90 px-5 py-3.5 backdrop-blur-sm md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-accent text-sm font-bold text-white">
                CS
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  CRM Support Copilot
                </p>
                <h1 className="text-base font-semibold tracking-tight text-foreground">
                  Agent workspace
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="hidden items-center gap-2 text-[11px] text-muted sm:flex">
                <span className="border border-[var(--border)] bg-panel-muted px-2 py-1">
                  Open {counts.open}
                </span>
                <span className="border border-[var(--border)] bg-panel-muted px-2 py-1">
                  Active {counts.in_progress}
                </span>
                <span className="border border-[var(--border)] bg-panel-muted px-2 py-1">
                  Resolved {counts.resolved}
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium ${
                  realtimeStatus === "subscribed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : realtimeStatus === "channel_error" ||
                        realtimeStatus === "timed_out"
                      ? "border-red-200 bg-red-50 text-danger"
                      : "border-[var(--border)] bg-panel-muted text-muted"
                }`}
                title={`Realtime: ${realtimeStatus}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-sm ${
                    realtimeStatus === "subscribed"
                      ? "live-dot bg-emerald-600"
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
                className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 md:grid-cols-[minmax(300px,380px)_1fr] md:gap-0 md:px-4 md:py-4 lg:px-6">
          <aside className="flex min-h-0 flex-col border-[var(--border)] bg-panel md:border">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Queue</p>
                <p className="text-xs text-muted">{tickets.length} tickets</p>
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

          <section className="min-h-0 border-[var(--border)] bg-panel md:border md:border-l-0">
            <TicketDetail ticket={selected} onUpdated={handleUpdated} />
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
