"use client";
import { AuthGate } from "@/components/AuthGate";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGate>
      <div className="flex flex-1 flex-col bg-zinc-50">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
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

        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-zinc-900">
              You&apos;re signed in
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Auth gate works. Next step adds the ticket list, detail panel,
              and Regenerate / Copy actions.
            </p>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
