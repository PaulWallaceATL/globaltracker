"use client";

import { useMemo, useState } from "react";
import {
  buildIntelFields,
  intelHeadline,
  intelSubtitle,
} from "@/lib/intel/format";
import type { TrackerEvent } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const COLOR = {
  aircraft: "#5ec8e8",
  ship: "#7ddea3",
} as const;

/**
 * True HUD overlay: chips live in CSS pixel space over the canvas.
 * No drei Html / billboard scaling — positions come from LabelProjector.
 */
export function ViewportLabels() {
  const labels = useTrackerStore((s) => s.viewportLabels);
  const events = useTrackerStore((s) => s.events);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const selectEvent = useTrackerStore((s) => s.selectEvent);
  const setHoveredEvent = useTrackerStore((s) => s.setHoveredEvent);
  const [focusId, setFocusId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, TrackerEvent>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  if (labels.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[25] overflow-hidden">
      {labels.map((lab) => {
        const event = byId.get(lab.eventId);
        if (!event) return null;
        const color = COLOR[lab.kind];
        const selected = selectedEvent?.id === lab.eventId;
        const expanded = focusId === lab.eventId;
        // Flip card below pin when near the top safe zone
        const openBelow = lab.y < 160;

        return (
          <div
            key={lab.eventId}
            className="pointer-events-auto absolute"
            style={{
              left: Math.min(
                typeof window !== "undefined" ? window.innerWidth - 140 : lab.x,
                Math.max(70, lab.x),
              ),
              top: lab.y,
              transform: openBelow
                ? "translate(-50%, 12px)"
                : "translate(-50%, calc(-100% - 10px))",
            }}
          >
            <div
              aria-hidden
              className={`absolute left-1/2 h-2.5 w-px -translate-x-1/2 ${
                openBelow ? "bottom-full" : "top-full"
              }`}
              style={{ background: `${color}66` }}
            />

            {expanded && event ? (
              <ExpandedCard
                event={event}
                color={color}
                onLeave={() => {
                  setFocusId(null);
                  setHoveredEvent(null);
                }}
                onOpen={() => selectEvent(event)}
              />
            ) : (
              <button
                type="button"
                onMouseEnter={() => {
                  setFocusId(lab.eventId);
                  setHoveredEvent(event);
                }}
                onFocus={() => {
                  setFocusId(lab.eventId);
                  setHoveredEvent(event);
                }}
                onMouseLeave={() => {
                  setFocusId(null);
                  setHoveredEvent(null);
                }}
                onBlur={() => {
                  setFocusId(null);
                  setHoveredEvent(null);
                }}
                onClick={() => selectEvent(event)}
                className="max-w-[7.5rem] truncate border px-1.5 py-0.5 text-left text-[10px] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                style={{
                  borderColor: selected ? color : `${color}66`,
                  background: selected
                    ? "rgba(12,22,34,0.96)"
                    : "rgba(8,14,22,0.9)",
                  color,
                }}
                title={`${lab.title} — hover for intel, click to open`}
              >
                {lab.title}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedCard({
  event,
  color,
  onLeave,
  onOpen,
}: {
  event: TrackerEvent;
  color: string;
  onLeave: () => void;
  onOpen: () => void;
}) {
  const fields = buildIntelFields(event).slice(0, 6);

  return (
    <button
      type="button"
      onMouseLeave={onLeave}
      onBlur={onLeave}
      onClick={onOpen}
      className="w-[12.5rem] border px-2.5 py-2 text-left shadow-[0_8px_22px_rgba(0,0,0,0.5)]"
      style={{
        borderColor: `${color}66`,
        background: "rgba(8,14,22,0.97)",
      }}
    >
      <p
        className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] uppercase"
        style={{ color }}
      >
        {event.type === "aircraft" ? "Air track" : "Maritime"}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-[var(--fg)]">
        {intelHeadline(event)}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">
        {intelSubtitle(event)}
      </p>
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
      <p className="mt-2 text-[9px] tracking-wider text-[var(--accent)] uppercase">
        Click for full intel
      </p>
    </button>
  );
}
