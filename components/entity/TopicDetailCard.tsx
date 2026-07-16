"use client";

import { useTrackerStore } from "@/store/tracker-store";

export function TopicDetailCard() {
  const topic = useTrackerStore((s) => s.selectedTopic);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const selectedPlace = useTrackerStore((s) => s.selectedPlace);
  const clearSelection = useTrackerStore((s) => s.clearSelection);
  const related = useTrackerStore((s) => s.related);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const toggleBookmark = useTrackerStore((s) => s.toggleBookmark);
  const bookmarks = useTrackerStore((s) => s.bookmarks);
  const runSearch = useTrackerStore((s) => s.runSearch);

  if (!topic || selectedEvent || selectedPlace) return null;

  const bookmarked = bookmarks.some(
    (b) => b.entity_type === "topic" && b.entity_id === topic.id,
  );

  return (
    <div className="pointer-events-auto absolute bottom-[12rem] left-3 z-30 w-[min(100%-1.5rem,17.5rem)] max-h-[min(55vh,26rem)] overflow-y-auto border border-[var(--border)] bg-[var(--panel)]/96 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] lg:bottom-3 lg:left-[16rem]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--accent)] uppercase">
            Topic
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-body)] text-sm leading-snug text-[var(--fg)]">
            {topic.label}
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            /{topic.slug}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="text-[10px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
          aria-label="Close topic detail"
        >
          Esc
        </button>
      </div>

      {topic.description && (
        <p className="text-xs leading-relaxed text-[var(--fg-dim)]">
          {topic.description}
        </p>
      )}

      {topic.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {topic.keywords.slice(0, 6).map((kw) => (
            <span
              key={kw}
              className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => void runSearch(topic.slug)}
          className="bg-[var(--accent)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase"
        >
          Track
        </button>
        <button
          type="button"
          onClick={() =>
            void toggleBookmark("topic", topic.id, topic.label)
          }
          className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase"
        >
          {bookmarked ? "Saved" : "Save"}
        </button>
      </div>

      {related && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">
          <p className="mb-1.5 text-[9px] tracking-[0.15em] text-[var(--muted)] uppercase">
            Related
          </p>
          <div className="flex flex-wrap gap-1">
            {[
              ...related.situations.slice(0, 3),
              ...related.places.slice(0, 2),
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
