"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell flex flex-1 items-center justify-center px-4 py-10">
      <div className="animate-fade-up grid w-full max-w-4xl overflow-hidden border border-white/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between bg-[linear-gradient(160deg,#0f172a_0%,#134e4a_100%)] p-10 text-white md:flex">
          <div>
            <div className="flex h-10 w-10 items-center justify-center bg-accent text-sm font-bold">
              CS
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/90">
              CRM Support Copilot
            </p>
            <h1 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight">
              Resolve tickets faster with grounded AI drafts.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Summaries and reply suggestions pull from your knowledge base —
              so agents stay accurate, consistent, and in control.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Live queue · KB-aware drafts · Realtime updates
          </p>
        </div>

        <div className="bg-panel p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent md:hidden">
            CRM Support Copilot
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "Agent sign in" : "Create agent account"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Sign in with your support agent credentials to open the workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full border border-[var(--border)] bg-white px-3 py-2.5 text-foreground outline-none transition-colors focus:border-accent"
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full border border-[var(--border)] bg-white px-3 py-2.5 text-foreground outline-none transition-colors focus:border-accent"
              />
            </label>

            {error ? (
              <p
                className="border border-danger/20 bg-red-50 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Sign up"}
            </button>
          </form>

          <button
            type="button"
            className="mt-5 text-sm font-medium text-muted underline-offset-4 hover:text-accent hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
