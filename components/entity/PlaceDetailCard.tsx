"use client";

import { useTrackerStore } from "@/store/tracker-store";
import { ShareButton } from "@/components/layout/ShareButton";

function formatPop(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function PlaceDetailCard() {
  const place = useTrackerStore((s) => s.selectedPlace);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const clearSelection = useTrackerStore((s) => s.clearSelection);
  const flyTo = useTrackerStore((s) => s.flyTo);
  const related = useTrackerStore((s) => s.related);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const toggleBookmark = useTrackerStore((s) => s.toggleBookmark);
  const bookmarks = useTrackerStore((s) => s.bookmarks);

  if (!place || selectedEvent) return null;

  const bookmarked = bookmarks.some(
    (b) => b.entity_type === "place" && b.entity_id === place.id,
  );

  return (
    <div className="pointer-events-auto absolute bottom-[12rem] left-3 z-30 w-[min(100%-1.5rem,17.5rem)] max-h-[min(55vh,26rem)] overflow-y-auto border border-[var(--border)] bg-[var(--panel)]/96 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] lg:bottom-3 lg:left-[16rem]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--accent)] uppercase">
            Place · {place.kind}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-body)] text-sm leading-snug text-[var(--fg)]">
            {place.name}
          </h3>
          {(place.iso2 || place.iso3) && (
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {[place.iso2, place.iso3].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="text-[10px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
          aria-label="Close place detail"
        >
          Esc
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
        <div>
          <dt className="text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
            Population
          </dt>
          <dd className="text-[11px] tabular-nums text-[var(--fg-dim)]">
            {formatPop(place.population)}
          </dd>
        </div>
        <div>
          <dt className="text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
            Coords
          </dt>
          <dd className="truncate text-[11px] tabular-nums text-[var(--fg-dim)]">
            {place.lat.toFixed(2)}, {place.lng.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() =>
            flyTo({ lat: place.lat, lng: place.lng, zoom: 1.4 })
          }
          className="bg-[var(--accent)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase"
        >
          Focus
        </button>
        <button
          type="button"
          onClick={() =>
            void toggleBookmark("place", place.id, place.name)
          }
          className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase"
        >
          {bookmarked ? "Saved" : "Save"}
        </button>
        <ShareButton className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase hover:text-[var(--fg)]" />
      </div>

      {related && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">
          <p className="mb-1.5 text-[9px] tracking-[0.15em] text-[var(--muted)] uppercase">
            Related
          </p>
          <div className="flex flex-wrap gap-1">
            {[
              ...related.situations.slice(0, 3),
              ...related.topics.slice(0, 2),
              ...related.events.slice(0, 2),
            ].map((ref) => (
              <button
                key={`${ref.type}-${ref.id}`}
                type="button"
                onClick={() => void focusEntity(ref.type, ref.id)}
                className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--fg-dim)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
              >
                {ref.type}: {ref.label.slice(0, 18)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
