"use client";

import { useState } from "react";
import { useTrackerStore } from "@/store/tracker-store";

const STORAGE_KEY = "gt_coach_dismissed";

function readCoachVisible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function FirstRunCoach({
  onOpenSituations,
}: {
  onOpenSituations: () => void;
}) {
  const runSearch = useTrackerStore((s) => s.runSearch);
  const setAllLayers = useTrackerStore((s) => s.setAllLayers);
  const layers = useTrackerStore((s) => s.layers);
  const [visible, setVisible] = useState(readCoachVisible);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const allOn = Object.values(layers).every(Boolean);

  return (
    <div className="mt-2 border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] leading-snug text-[var(--fg-dim)]">
          Search a place or pick a situation to focus the globe.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-[9px] tracking-wide text-[var(--muted)] uppercase hover:text-[var(--fg)]"
          aria-label="Dismiss tip"
        >
          Got it
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            void runSearch("Sudan");
            dismiss();
          }}
          className="border border-[var(--border)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--fg-dim)] uppercase hover:border-[var(--accent)]/50 hover:text-[var(--fg)]"
        >
          Try Sudan
        </button>
        <button
          type="button"
          onClick={() => {
            onOpenSituations();
            dismiss();
          }}
          className="border border-[var(--border)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--fg-dim)] uppercase hover:border-[var(--accent)]/50 hover:text-[var(--fg)]"
        >
          Open situations
        </button>
        <button
          type="button"
          onClick={() => {
            setAllLayers(!allOn);
            dismiss();
          }}
          className="border border-[var(--border)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--fg-dim)] uppercase hover:border-[var(--accent)]/50 hover:text-[var(--fg)]"
        >
          {allOn ? "Clear layers" : "Arm layers"}
        </button>
      </div>
    </div>
  );
}
