"use client";

import {
  buildIntelFields,
  intelHeadline,
  intelSubtitle,
} from "@/lib/intel/format";
import type { EventType } from "@/lib/types";
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

const TYPE_LABEL: Record<EventType, string> = {
  conflict: "Conflict",
  thermal: "Thermal",
  aircraft: "Air track",
  ship: "Maritime",
  news: "News",
  traffic: "Traffic",
  population: "Population",
  weather: "Weather",
};

/**
 * Screen-space hover intel card — uses CSS classes from globals.css.
 * Hidden on coarse pointers (touch) where tap opens the detail sheet instead.
 */
export function HoverTooltip() {
  const event = useTrackerStore((s) => s.hoveredEvent);
  const screen = useTrackerStore((s) => s.hoverScreen);
  const selectedId = useTrackerStore((s) => s.selectedEvent?.id ?? null);

  if (!event || !screen || event.id === selectedId) return null;

  const color = TYPE_COLOR[event.type] ?? "#c4a35a";
  const fields = buildIntelFields(event).slice(0, 4);
  const openBelow = screen.y < 140;
  const maxX =
    typeof window !== "undefined" ? window.innerWidth - 16 : screen.x;
  const left = Math.min(maxX - 120, Math.max(120, screen.x));

  return (
    <div
      className="pointer-events-none absolute z-[28] hidden md:block"
      style={{
        left,
        top: screen.y,
        transform: openBelow
          ? "translate(-50%, 14px)"
          : "translate(-50%, calc(-100% - 12px))",
      }}
    >
      <div
        aria-hidden
        className={`absolute left-1/2 h-2.5 w-px -translate-x-1/2 ${
          openBelow ? "bottom-full" : "top-full"
        }`}
        style={{ background: `${color}66` }}
      />
      <div className="marker-tooltip">
        <p className="marker-tooltip__type" style={{ color }}>
          {TYPE_LABEL[event.type]}
          <span className="marker-tooltip__src"> · {event.source}</span>
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-snug text-[var(--fg)]">
          {intelHeadline(event)}
        </p>
        <p className="marker-tooltip__body">{intelSubtitle(event)}</p>
        {fields.length > 0 && (
          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {fields.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[8px] tracking-wider text-[var(--muted)] uppercase">
                  {f.label}
                </dt>
                <dd className="truncate text-[10px] tabular-nums text-[var(--fg-dim)]">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="marker-tooltip__hint">Click for full intel</p>
      </div>
    </div>
  );
}
