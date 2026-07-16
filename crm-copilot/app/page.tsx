"use client";

/**
 * Dashboard — load tickets, list + detail
 * -----------------------------------------------------------------------------
 * PURPOSE:
 *   Authenticated agent workspace: browse tickets and run AI summarize.
 *
 * HOW IT CONNECTS:
 *   createBrowserClient() → SELECT tickets
 *   TicketDetail → POST /api/summarize
 *   (Step 14) Realtime subscription will live-update this list
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { TicketList } from "@/components/TicketList";
import { TicketDetail } from "@/components/TicketDetail";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/types/ticket";

export default function HomePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const selected =
    tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <AuthGate>
      <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              CRM Support Copilot
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Sign out
          </button>
        </header>

        <main className="grid min-h-0 flex-1 md:grid-cols-[minmax(280px,360px)_1fr]">
          <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
            <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
              <p className="text-sm font-medium text-zinc-900">
                Tickets{" "}
                <span className="font-normal text-zinc-500">
                  ({tickets.length})
                </span>
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-zinc-500">Loading tickets…</p>
              ) : loadError ? (
                <p className="p-4 text-sm text-red-600">{loadError}</p>
              ) : (
                <TicketList
                  tickets={tickets}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>
          </aside>

          <section className="min-h-0 bg-white">
            <TicketDetail ticket={selected} onUpdated={handleUpdated} />
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
