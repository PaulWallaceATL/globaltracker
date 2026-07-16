"use client";

import { useEffect, useRef, useState } from "react";
import { LENS_CONFIGS } from "@/lib/lenses";
import { useTrackerStore } from "@/store/tracker-store";

/** Brief toast when the audience lens changes — explains the value shift. */
export function LensToast() {
  const lens = useTrackerStore((s) => s.lens);
  const [message, setMessage] = useState<string | null>(null);
  const prevRef = useRef(lens);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      prevRef.current = lens;
      return;
    }
    if (prevRef.current === lens) return;
    prevRef.current = lens;
    const cfg = LENS_CONFIGS[lens];
    const armed = Object.entries(cfg.defaultLayers)
      .filter(([, on]) => on)
      .map(([k]) => k)
      .slice(0, 4)
      .join(", ");
    const text = `${cfg.label}: ${cfg.description}. Layers: ${armed}.`;
    const showId = window.setTimeout(() => setMessage(text), 0);
    const hideId = window.setTimeout(() => setMessage(null), 4200);
    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [lens]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-40 w-[min(100%-2rem,22rem)] -translate-x-1/2 border border-[var(--border)] bg-[var(--panel)]/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] max-lg:bottom-[9rem]"
    >
      <p className="font-[family-name:var(--font-display)] text-[8px] tracking-[0.14em] text-[var(--accent)] uppercase">
        Lens updated
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--fg-dim)]">
        {message}
      </p>
    </div>
  );
}
