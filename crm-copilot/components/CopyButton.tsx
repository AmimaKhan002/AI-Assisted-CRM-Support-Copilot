"use client";
import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy reply",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      disabled={!text.trim()}
      className="border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
