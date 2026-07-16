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
      className="btn-secondary px-3.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
