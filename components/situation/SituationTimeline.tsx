"use client";

import { useMemo } from "react";
import { intelHeadline } from "@/lib/intel/format";
import type { TrackerEvent } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

function ageLabel(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_COLOR: Record<string, string> = {
  conflict: "#e85d4c",
  thermal: "#f0a202",
  aircraft: "#5ec8e8",
  ship: "#7ddea3",
  traffic: "#fb923c",
  weather: "#94a3b8",
  population: "#c084fc",
  news: "#c4a35a",
};

/** Chronological “what happened” list for the selected situation. */
export function SituationTimeline({ limit = 6 }: { limit?: number }) {
  const situation = useTrackerStore((s) => s.selectedSituation);
  const events = useTrackerStore((s) => s.events);
  const selectEvent = useTrackerStore((s) => s.selectEvent);

  const timeline = useMemo(() => {
    if (!situation) return [] as TrackerEvent[];
    const ids = new Set(situation.eventIds ?? []);
    let list: TrackerEvent[];
    if (ids.size > 0) {
      list = events.filter((e) => ids.has(e.id));
    } else {
      // Fallback: nearest events to centroid when joins are missing
      const { lat, lng } = situation.centroid;
      list = [...events]
        .map((e) => ({
          e,
          d: (e.lat - lat) ** 2 + (e.lng - lng) ** 2,
        }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 24)
        .map((x) => x.e);
    }
    return list
      .slice()
      .sort(
        (a, b) =>
          Date.parse(b.timestamp) - Date.parse(a.timestamp),
      )
      .slice(0, limit);
  }, [situation, events, limit]);

  if (!situation || timeline.length === 0) return null;

  return (
    <div className="mt-2 border-t border-[var(--border)] pt-2">
      <p className="mb-1.5 font-[family-name:var(--font-display)] text-[8px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Recent activity
      </p>
      <ul className="flex flex-col gap-1">
        {timeline.map((event) => {
          const color = TYPE_COLOR[event.type] ?? "var(--accent)";
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => selectEvent(event)}
                className="w-full rounded-sm border-l-2 px-2 py-1 text-left transition hover:bg-white/[0.04]"
                style={{ borderLeftColor: color }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-[family-name:var(--font-display)] text-[8px] tracking-wider uppercase"
                    style={{ color }}
                  >
                    {event.type}
                  </span>
                  <span className="text-[8px] tabular-nums text-[var(--muted)]">
                    {ageLabel(event.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--fg-dim)]">
                  {intelHeadline(event)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
