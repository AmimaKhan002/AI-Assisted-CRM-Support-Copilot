"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setReady(true);
    }

    void check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="app-shell flex flex-1 items-center justify-center">
        <div className="border border-[var(--border)] bg-panel px-6 py-4 text-sm text-muted shadow-sm">
          Checking session…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
