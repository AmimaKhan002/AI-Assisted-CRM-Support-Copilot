"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { createBrowserClient } from "@/lib/supabase/client";
import { getProfile, isAdmin, type Profile } from "@/lib/auth/roles";

type KbArticle = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

async function getAccessToken() {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminKbPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadArticles = useCallback(async () => {
    setLoadingList(true);
    const supabase = createBrowserClient();
    const { data, error: listError } = await supabase
      .from("kb_articles")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false });

    if (listError) {
      setError(listError.message);
      setArticles([]);
    } else {
      setArticles((data ?? []) as KbArticle[]);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      let p = await getProfile(supabase, data.user.id);

      // If profile missing (roles.sql not run yet / race), try service-less retry
      if (!p) {
        setError(
          "No profile found. Run supabase/roles.sql in the SQL Editor, then refresh.",
        );
        setChecking(false);
        return;
      }

      setProfile(p);
      setChecking(false);

      if (!isAdmin(p)) {
        return;
      }

      void loadArticles();
    }

    void checkAdmin();
  }, [router, loadArticles]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSaving(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/kb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save article");

      setTitle("");
      setContent("");
      setInfo("Article saved. It will be used in future AI replies.");
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const name = file.name.replace(/\.[^.]+$/, "");
    if (!title.trim()) setTitle(name);
    setContent(text);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this KB article?")) return;
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch(`/api/kb?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (checking) {
    return (
      <AuthGate>
        <div className="app-shell flex flex-1 items-center justify-center text-sm text-muted">
          Checking admin access…
        </div>
      </AuthGate>
    );
  }

  if (!isAdmin(profile)) {
    return (
      <AuthGate>
        <div className="app-shell flex min-h-0 flex-1 flex-col">
          <AppHeader title="Admin" />
          <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-lg font-bold text-foreground">Admins only</p>
            <p className="text-sm text-muted">
              Your account is an agent. Ask an owner to promote you, or run:
            </p>
            <code className="block w-full border border-[var(--border)] bg-panel px-3 py-2 text-left text-xs text-foreground">
              npm run promote-admin -- you@email.com
            </code>
            <Link href="/" className="text-sm font-semibold text-accent">
              ← Back to workspace
            </Link>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="app-shell flex min-h-0 flex-1 flex-col">
        <AppHeader title="Knowledge base (Admin)" />

        <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-foreground">
                Manage KB articles
              </p>
              <p className="text-xs text-muted">
                Signed in as {profile?.email} · role: admin
              </p>
            </div>
            <Link
              href="/"
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              ← Workspace
            </Link>
          </div>

          <form
            onSubmit={onSubmit}
            className="border border-[var(--border)] bg-panel p-4 shadow-[var(--shadow-sm)] sm:p-6"
          >
            <h2 className="text-base font-bold text-foreground">
              Add article
            </h2>
            <p className="mt-1 text-xs text-muted">
              Paste content or upload a .txt / .md file. New articles are
              embedded automatically when Gemini/OpenAI embeddings are
              configured.
            </p>

            <label className="mt-5 block text-sm font-semibold text-foreground">
              Title
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field-input mt-1.5"
                placeholder="e.g. Resetting your password"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-foreground">
              Content
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="field-input mt-1.5 resize-y font-sans"
                placeholder="Write the answer agents and the AI should use…"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-foreground">
              Or upload file (.txt / .md)
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:border file:border-[var(--border)] file:bg-panel-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {error ? (
              <p className="mt-4 border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="mt-4 border border-accent/20 bg-accent-soft px-3 py-2 text-sm text-foreground">
                {info}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary mt-5 px-4 py-2.5 text-sm"
            >
              {saving ? "Saving…" : "Publish article"}
            </button>
          </form>

          <section className="mt-6 border border-[var(--border)] bg-panel shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-bold text-foreground">
                Published articles ({articles.length})
              </p>
            </div>
            {loadingList ? (
              <p className="p-4 text-sm text-muted">Loading…</p>
            ) : articles.length === 0 ? (
              <p className="p-4 text-sm text-muted">No articles yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {articles.map((article) => (
                  <li
                    key={article.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        {article.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {article.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDelete(article.id)}
                      className="btn-secondary shrink-0 px-3 py-1.5 text-xs text-danger hover:border-danger hover:text-danger"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
