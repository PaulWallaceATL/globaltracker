"use client";

import {
  buildIntelFields,
  intelHeadline,
  intelSubtitle,
} from "@/lib/intel/format";
import type { EventType, TrackerEvent } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const TYPE_COLOR: Record<EventType, string> = {
  conflict: "#e85d4c",
  thermal: "#f0a202",
  aircraft: "#5ec8e8",
  ship: "#7ddea3",
  news: "#c4a35a",
  traffic: "#fb923c",
  population: "#c084fc",
  weather: "#94a3b8",
};

export function ClusterStackPanel() {
  const stack = useTrackerStore((s) => s.stackPanel);
  const setStackPanel = useTrackerStore((s) => s.setStackPanel);
  const selectEvent = useTrackerStore((s) => s.selectEvent);

  if (!stack) return null;

  return (
    <div className="pointer-events-auto absolute bottom-[12rem] left-3 z-30 flex max-h-[min(42vh,18rem)] w-[min(100%-1.5rem,15rem)] flex-col border border-[var(--border)] bg-[var(--panel)]/96 shadow-[0_8px_24px_rgba(0,0,0,0.5)] lg:bottom-3 lg:left-[16rem]">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--accent)] uppercase">
            Stack · {stack.events.length} signals
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[var(--muted)] tabular-nums">
            {stack.lat.toFixed(2)}°, {stack.lng.toFixed(2)}° · pick one
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStackPanel(null)}
          className="text-[10px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
          aria-label="Close stack list"
        >
          Esc
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {stack.events.map((event) => {
          const color = TYPE_COLOR[event.type] ?? "var(--accent)";
          const isTrack =
            event.type === "aircraft" || event.type === "ship";
          return (
            <li key={event.id} className="border-b border-[var(--border)]/60 last:border-0">
              <button
                type="button"
                onClick={() => selectEvent(event)}
                className="w-full px-3.5 py-2.5 text-left transition hover:bg-white/[0.04]"
              >
                <p
                  className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] uppercase"
                  style={{ color }}
                >
                  {isTrack
                    ? `${event.type === "aircraft" ? "Air" : "Ship"} · ${event.source}`
                    : `${event.type} · ${event.source}`}
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--fg-dim)]">
                  {isTrack ? intelHeadline(event) : truncate(event.description, 90)}
                </p>
                {isTrack ? (
                  <TrackStackMeta event={event} />
                ) : (
                  <p className="mt-1 text-[10px] text-[var(--muted)] tabular-nums">
                    {formatAge(event.timestamp)}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrackStackMeta({ event }: { event: TrackerEvent }) {
  const bits = buildIntelFields(event)
    .filter((f) =>
      ["Altitude", "Speed", "SOG", "Heading", "COG", "Route", "MMSI"].includes(
        f.label,
      ),
    )
    .slice(0, 3)
    .map((f) => f.value)
    .filter((v) => v && v !== "—");
  const sub = intelSubtitle(event);
  return (
    <p className="mt-1 text-[10px] leading-snug text-[var(--muted)]">
      {sub}
      {bits.length ? ` · ${bits.join(" · ")}` : ""}
      {" · "}
      {formatAge(event.timestamp)}
    </p>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatAge(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
