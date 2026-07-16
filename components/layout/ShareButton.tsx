"use client";

import { useState } from "react";

/** Copy the current deep-link URL so others open the same view. */
export function ShareButton({
  className = "",
  label = "Share",
}: {
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "GlobalTracker",
          text: "Situational view on GlobalTracker",
          url,
        });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={
        className ||
        "border border-[var(--border)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--muted)] uppercase hover:text-[var(--fg)]"
      }
      title="Copy or share a link to this exact view"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
