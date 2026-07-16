"use client";

import { useMemo, useState } from "react";
import type { EntityType } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

export function SavedTray() {
  const bookmarks = useTrackerStore((s) => s.bookmarks);
  const history = useTrackerStore((s) => s.history);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const situations = useTrackerStore((s) => s.situations);
  const places = useTrackerStore((s) => s.places);
  const topics = useTrackerStore((s) => s.topics);
  const events = useTrackerStore((s) => s.events);
  const [open, setOpen] = useState(false);

  const hasAny = bookmarks.length > 0 || history.length > 0;

  const resolveLabel = useMemo(() => {
    return (type: string, id: string): string => {
      if (type === "situation") {
        return situations.find((s) => s.id === id)?.title ?? id;
      }
      if (type === "place") {
        return places.find((p) => p.id === id)?.name ?? id;
      }
      if (type === "topic") {
        return topics.find((t) => t.id === id)?.label ?? id;
      }
      if (type === "event") {
        const ev = events.find((e) => e.id === id);
        return ev?.description?.slice(0, 40) ?? id;
      }
      return id;
    };
  }, [situations, places, topics, events]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`shrink-0 rounded-sm border px-2 py-1 text-[9px] tracking-wide uppercase transition ${
          open
            ? "border-[var(--accent)]/50 text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
        }`}
        title="Bookmarks and recent views"
      >
        Saved{hasAny ? ` · ${bookmarks.length || history.length}` : ""}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-56 max-h-64 overflow-y-auto border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {!hasAny && (
            <p className="px-3 py-4 text-center text-[10px] text-[var(--muted)]">
              Save situations, places, or signals to reopen them here.
            </p>
          )}

          {bookmarks.length > 0 && (
            <section className="border-b border-[var(--border)] px-2 py-1.5">
              <p className="mb-1 px-1 font-[family-name:var(--font-display)] text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Bookmarks
              </p>
              <ul className="flex flex-col gap-0.5">
                {bookmarks.slice(0, 8).map((b) => (
                  <li key={`bm-${b.entity_type}-${b.entity_id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        void focusEntity(
                          b.entity_type as EntityType,
                          b.entity_id,
                        );
                        setOpen(false);
                      }}
                      className="w-full rounded-sm px-1.5 py-1 text-left hover:bg-white/[0.04]"
                    >
                      <span className="block font-[family-name:var(--font-display)] text-[8px] tracking-wider text-[var(--accent)] uppercase">
                        {b.entity_type}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--fg)]">
                        {b.label ?? resolveLabel(b.entity_type, b.entity_id)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section className="px-2 py-1.5">
              <p className="mb-1 px-1 font-[family-name:var(--font-display)] text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Recent
              </p>
              <ul className="flex flex-col gap-0.5">
                {history.slice(0, 8).map((h) => (
                  <li
                    key={`hist-${h.entity_type}-${h.entity_id}-${h.viewed_at}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        void focusEntity(
                          h.entity_type as EntityType,
                          h.entity_id,
                        );
                        setOpen(false);
                      }}
                      className="w-full rounded-sm px-1.5 py-1 text-left hover:bg-white/[0.04]"
                    >
                      <span className="block font-[family-name:var(--font-display)] text-[8px] tracking-wider text-[var(--accent)] uppercase">
                        {h.entity_type}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--fg-dim)]">
                        {resolveLabel(h.entity_type, h.entity_id)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
