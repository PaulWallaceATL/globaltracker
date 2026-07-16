"use client";

import { useMemo } from "react";
import { severityLabel } from "@/lib/intel/humanize";
import type { Situation } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

function signalTotal(s: Situation): number {
  const m = s.metrics;
  return (
    (m.conflictCount ?? 0) +
    (m.thermalCount ?? 0) +
    (m.aircraftCount ?? 0) +
    (m.shipCount ?? 0) +
    (m.trafficCount ?? 0)
  );
}

export function SituationsRail({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const situations = useTrackerStore((s) => s.situations);
  const selectedSituation = useTrackerStore((s) => s.selectedSituation);
  const focusEntity = useTrackerStore((s) => s.focusEntity);

  const ranked = useMemo(() => {
    return [...situations].sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return signalTotal(b) - signalTotal(a);
    });
  }, [situations]);

  if (!open || ranked.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute top-[7.5rem] left-3 z-30 w-[min(100%-1.5rem,15rem)] max-h-[min(48vh,24rem)] overflow-hidden border border-[var(--border)] bg-[var(--panel)]/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] max-lg:top-auto max-lg:bottom-[11rem] max-lg:left-2">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-2.5 py-2">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.16em] text-[var(--accent)] uppercase">
            Active situations
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {ranked.length} ranked by severity
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[9px] tracking-wide text-[var(--muted)] uppercase hover:text-[var(--fg)]"
        >
          Hide
        </button>
      </div>

      <ul className="max-h-[min(40vh,20rem)] overflow-y-auto">
        {ranked.map((sit) => {
          const active = selectedSituation?.id === sit.id;
          const signals = signalTotal(sit);
          return (
            <li key={sit.id} className="border-b border-[var(--border)]/60 last:border-0">
              <button
                type="button"
                onClick={() => void focusEntity("situation", sit.id)}
                className={`w-full px-2.5 py-2 text-left transition hover:bg-white/[0.04] ${
                  active ? "bg-[var(--accent)]/10" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--accent)] uppercase">
                    {severityLabel(sit.severity)} · {sit.severity}/5
                  </span>
                  <span className="text-[9px] tabular-nums text-[var(--muted)]">
                    {signals} sig
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--fg)]">
                  {sit.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[9px] text-[var(--muted)]">
                  {sit.status}
                  {sit.metrics.conflictCount
                    ? ` · ${sit.metrics.conflictCount} conflict`
                    : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
