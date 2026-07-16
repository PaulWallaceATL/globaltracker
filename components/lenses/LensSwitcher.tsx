"use client";

import { LENS_CONFIGS } from "@/lib/lenses";
import type { StakeholderLens } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const ORDER: StakeholderLens[] = ["public", "civic", "government", "business"];

export function LensSwitcher() {
  const lens = useTrackerStore((s) => s.lens);
  const setLens = useTrackerStore((s) => s.setLens);
  const cfg = LENS_CONFIGS[lens];

  return (
    <div className="pointer-events-auto absolute top-3 right-3 z-30 max-w-[min(100%-1.5rem,13.5rem)] border border-[var(--border)] bg-[var(--panel)]/95 p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.35)] max-md:right-auto max-md:left-3 max-md:top-[11.5rem]">
      <p className="mb-1 px-1 font-[family-name:var(--font-display)] text-[8px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Who is this for?
      </p>
      <div className="grid grid-cols-2 gap-0.5">
        {ORDER.map((id) => {
          const item = LENS_CONFIGS[id];
          const on = lens === id;
          return (
            <button
              key={id}
              type="button"
              title={item.description}
              onClick={() => setLens(id)}
              className={`rounded-sm px-1.5 py-1 text-left transition ${
                on
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
              }`}
            >
              <span className="block font-[family-name:var(--font-display)] text-[9px] tracking-wider uppercase">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 px-1 text-[9px] leading-snug text-[var(--muted)]">
        {cfg.description}
      </p>
    </div>
  );
}
