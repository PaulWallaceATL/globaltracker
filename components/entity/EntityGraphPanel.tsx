"use client";

import type { EntityRef, EntityType } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const SECTIONS: { key: keyof RelatedSections; label: string }[] = [
  { key: "situations", label: "Situations" },
  { key: "places", label: "Places" },
  { key: "topics", label: "Topics" },
  { key: "events", label: "Events" },
  { key: "media", label: "Media" },
];

type RelatedSections = {
  situations: EntityRef[];
  places: EntityRef[];
  topics: EntityRef[];
  events: EntityRef[];
  media: EntityRef[];
};

export function EntityGraphPanel({
  offsetForSituations = false,
}: {
  offsetForSituations?: boolean;
}) {
  const related = useTrackerStore((s) => s.related);
  const selection = useTrackerStore((s) => s.selection);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const history = useTrackerStore((s) => s.history);
  const bookmarks = useTrackerStore((s) => s.bookmarks);
  const showGraphNav = useTrackerStore((s) => s.showGraphNav);
  const setShowGraphNav = useTrackerStore((s) => s.setShowGraphNav);

  if (!showGraphNav || !related || !selection.type) return null;

  const hasAny = SECTIONS.some((s) => (related[s.key] ?? []).length > 0);
  if (!hasAny) return null;

  return (
    <div
      className={`pointer-events-auto absolute top-[7.5rem] z-30 w-[min(100%-1.5rem,14.5rem)] max-h-[min(42vh,22rem)] overflow-y-auto border border-[var(--border)] bg-[var(--panel)]/95 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] max-lg:hidden ${
        offsetForSituations ? "left-[16.25rem]" : "left-3"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.16em] text-[var(--accent)] uppercase">
          Graph · {selection.type}
        </p>
        <button
          type="button"
          onClick={() => setShowGraphNav(false)}
          className="text-[9px] tracking-wide text-[var(--muted)] uppercase hover:text-[var(--fg)]"
        >
          Hide
        </button>
      </div>

      {SECTIONS.map((section) => {
        const items = related[section.key] ?? [];
        if (!items.length) return null;
        return (
          <div key={section.key} className="mb-2">
            <p className="mb-0.5 text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.slice(0, 5).map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => void focusEntity(item.type, item.id)}
                    className="w-full rounded-sm px-1 py-0.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="block truncate text-[10px] text-[var(--fg)]">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {(bookmarks.length > 0 || history.length > 0) && (
        <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
          {bookmarks.length > 0 && (
            <Tray
              label="Bookmarks"
              items={bookmarks.slice(0, 3).map((b) => ({
                type: b.entity_type as EntityType,
                id: b.entity_id,
                label: b.label ?? b.entity_id,
              }))}
              onPick={(t, id) => void focusEntity(t, id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Tray({
  label,
  items,
  onPick,
}: {
  label: string;
  items: Array<{ type: EntityType; id: string; label: string }>;
  onPick: (type: EntityType, id: string) => void;
}) {
  return (
    <div className="mb-1">
      <p className="mb-0.5 text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={`${label}-${item.type}-${item.id}`}>
            <button
              type="button"
              onClick={() => onPick(item.type, item.id)}
              className="w-full truncate px-1 py-0.5 text-left text-[9px] text-[var(--fg-dim)] hover:text-[var(--accent)]"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
