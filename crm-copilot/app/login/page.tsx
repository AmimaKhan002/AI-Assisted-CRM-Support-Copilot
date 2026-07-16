"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("over_email")) {
    return "Too many signup attempts. Wait about a minute, then try again — or sign in if this email already has an account.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already")
  ) {
    return "This email already has an account. Use the Sign in tab.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Incorrect email or password. Check your credentials and try again.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "Signup was rejected by Auth settings. If Confirm email is enabled in Supabase, confirm your inbox — or disable Confirm email for local demos, then sign in.";
  }
  return message;
}

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setConfirmPassword("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const trimmedEmail = email.trim().toLowerCase();

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setInfo(
            "Account created. If email confirmation is on in Supabase, check your inbox — then use Sign in. For local demos, turn Confirm email off under Authentication → Providers → Email.",
          );
          switchMode("signin");
          setLoading(false);
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) throw signInError;

      router.replace("/");
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Authentication failed";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell flex flex-1 items-center justify-center px-4 py-8 md:py-12">
      <div className="auth-card animate-fade-up grid w-full max-w-5xl overflow-hidden rounded-sm border border-white/10 bg-white md:grid-cols-[1.1fr_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white md:flex lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(600px 320px at 20% 20%, rgba(31,79,224,0.45), transparent 60%), radial-gradient(500px 280px at 90% 90%, rgba(14,165,160,0.22), transparent 55%)",
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center bg-accent text-sm font-extrabold tracking-tight">
                CS
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200/90">
                  CRM Support Copilot
                </p>
                <p className="text-xs text-slate-400">Agent operations suite</p>
              </div>
            </div>

            <h1
              className="mt-12 max-w-md text-[2.35rem] leading-[1.15] text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Professional support, powered by grounded AI.
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-300">
              Triage tickets, generate KB-aware summaries, and ship consistent
              replies — with live updates across your team.
            </p>

            <ul className="mt-10 space-y-3 text-sm text-slate-300">
              {[
                "Queue with status at a glance",
                "RAG-backed draft replies",
                "Realtime sync when AI writes back",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-slate-500">
            Secure session via Supabase Auth
          </p>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col justify-center bg-panel p-7 sm:p-10 lg:p-12">
          <div className="mb-6 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center bg-accent text-sm font-extrabold text-white">
              CS
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              CRM Support Copilot
            </p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your agent account"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {mode === "signin"
              ? "Sign in to open your ticket workspace."
              : "Set up access for the support dashboard. Use a real email you control."}
          </p>

          {/* Tabs */}
          <div className="mt-7 grid grid-cols-2 border border-[var(--border)] bg-panel-muted p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`px-3 py-2.5 text-sm font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`px-3 py-2.5 text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-foreground">
              Work email
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input mt-1.5"
              />
            </label>

            <label className="block text-sm font-semibold text-foreground">
              Password
              <input
                type="password"
                required
                minLength={6}
                placeholder={
                  mode === "signup" ? "At least 6 characters" : "Your password"
                }
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input mt-1.5"
              />
            </label>

            {mode === "signup" ? (
              <label className="block text-sm font-semibold text-foreground">
                Confirm password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field-input mt-1.5"
                />
              </label>
            ) : null}

            {error ? (
              <p
                className="border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-3.5 py-3 text-sm leading-relaxed text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {info ? (
              <p
                className="border border-accent/20 bg-accent-soft px-3.5 py-3 text-sm leading-relaxed text-foreground"
                role="status"
              >
                {info}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-1 w-full px-4 py-3 text-sm"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in to workspace"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border)] pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Demo access
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              <span className="font-mono text-[11px] text-foreground">
                admin@gmail.com
              </span>{" "}
              or{" "}
              <span className="font-mono text-[11px] text-foreground">
                agent@crm-copilot.local
              </span>
              <br />
              Password:{" "}
              <span className="font-mono text-[11px] text-foreground">
                AgentDemo123!
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
