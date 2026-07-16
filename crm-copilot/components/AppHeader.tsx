"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { getProfile, isAdmin } from "@/lib/auth/roles";
import type { RealtimeStatus } from "@/lib/hooks/useTicketsRealtime";

export function AppHeader({
  counts,
  realtimeStatus,
  title = "Agent workspace",
}: {
  counts?: { open: number; in_progress: number; resolved: number };
  realtimeStatus?: RealtimeStatus;
  title?: string;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const profile = await getProfile(supabase, data.user.id);
      setAdmin(isAdmin(profile));
    }
    void loadRole();
  }, []);

  async function signOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="shrink-0 border-b border-[var(--border)] bg-panel/90 px-3 py-3 backdrop-blur-md sm:px-4 md:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent text-xs font-extrabold text-white sm:h-10 sm:w-10 sm:text-sm">
            CS
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent sm:text-[10px] sm:tracking-[0.2em]">
              CRM Support Copilot
            </p>
            <h1 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
              {title}
            </h1>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {counts ? (
            <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-muted xl:flex">
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
          ) : null}

          {realtimeStatus ? (
            <span
              className={`inline-flex items-center gap-1.5 border px-2 py-1.5 text-[10px] font-bold sm:px-2.5 sm:text-[11px] ${
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
          ) : null}

          {admin ? (
            <Link
              href="/admin/kb"
              className="btn-secondary px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
            >
              KB Admin
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-secondary px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
