"use client";

import {
  buildIntelFields,
  intelHeadline,
  intelSubtitle,
} from "@/lib/intel/format";
import { ShareButton } from "@/components/layout/ShareButton";
import { useTrackerStore } from "@/store/tracker-store";

export function EventDetailCard() {
  const selected = useTrackerStore((s) => s.selectedEvent);
  const selectEvent = useTrackerStore((s) => s.selectEvent);
  const flyTo = useTrackerStore((s) => s.flyTo);
  const news = useTrackerStore((s) => s.news);
  const previewNews = useTrackerStore((s) => s.previewNews);
  const related = useTrackerStore((s) => s.related);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const toggleBookmark = useTrackerStore((s) => s.toggleBookmark);
  const bookmarks = useTrackerStore((s) => s.bookmarks);
  const topics = useTrackerStore((s) => s.topics);
  const places = useTrackerStore((s) => s.places);

  if (!selected) return null;

  const isTrack = selected.type === "aircraft" || selected.type === "ship";
  const fields = buildIntelFields(selected);
  const relatedNews = news.filter((n) => selected.news_links.includes(n.url));
  // For tracks, also surface theater news (keyword match is weak on callsigns)
  const theaterNews =
    isTrack && relatedNews.length === 0 ? news.slice(0, 4) : relatedNews;
  const bookmarked = bookmarks.some(
    (b) => b.entity_type === "event" && b.entity_id === selected.id,
  );
  const topicChips = (selected.topicIds ?? [])
    .map((id) => topics.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, 3);
  const placeChips = (selected.placeIds ?? [])
    .map((id) => places.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div className="pointer-events-auto absolute bottom-[12rem] left-3 z-30 w-[min(100%-1.5rem,17.5rem)] max-h-[min(55vh,26rem)] overflow-y-auto border border-[var(--border)] bg-[var(--panel)]/96 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] lg:bottom-3 lg:left-[16rem]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--accent)] uppercase">
            {selected.type === "aircraft"
              ? "Air track"
              : selected.type === "ship"
                ? "Maritime track"
                : `Signal · ${selected.type}`}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-body)] text-sm leading-snug text-[var(--fg)]">
            {intelHeadline(selected)}
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {intelSubtitle(selected)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectEvent(null)}
          className="text-[10px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
          aria-label="Close event detail"
        >
          Esc
        </button>
      </div>

      {!isTrack && (
        <p className="text-xs leading-relaxed text-[var(--fg-dim)]">
          {selected.description}
        </p>
      )}

      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[8px] tracking-[0.12em] text-[var(--muted)] uppercase">
              {f.label}
            </dt>
            <dd className="truncate text-[11px] tabular-nums text-[var(--fg-dim)]">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {(topicChips.length > 0 || placeChips.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {placeChips.map((p) =>
            p ? (
              <button
                key={p.id}
                type="button"
                onClick={() => void focusEntity("place", p.id)}
                className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--fg-dim)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
              >
                place: {p.name.slice(0, 16)}
              </button>
            ) : null,
          )}
          {topicChips.map((t) =>
            t ? (
              <button
                key={t.id}
                type="button"
                onClick={() => void focusEntity("topic", t.id)}
                className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--fg-dim)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
              >
                topic: {t.label.slice(0, 16)}
              </button>
            ) : null,
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] text-[var(--muted)]">
        Updated {new Date(selected.timestamp).toLocaleString()}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() =>
            flyTo({ lat: selected.lat, lng: selected.lng, zoom: 2.4 })
          }
          className="bg-[var(--accent)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase"
        >
          Re-center
        </button>
        <button
          type="button"
          onClick={() =>
            void toggleBookmark(
              "event",
              selected.id,
              intelHeadline(selected).slice(0, 40),
            )
          }
          className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase"
        >
          {bookmarked ? "Saved" : "Bookmark"}
        </button>
        <ShareButton className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase hover:text-[var(--fg)]" />
        <button
          type="button"
          onClick={() => selectEvent(null)}
          className="border border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-wider text-[var(--muted)] uppercase"
        >
          Clear
        </button>
      </div>

      {related && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">
          <p className="mb-1.5 text-[9px] tracking-[0.15em] text-[var(--muted)] uppercase">
            Related
          </p>
          <div className="flex flex-wrap gap-1">
            {[
              ...related.places.slice(0, 2),
              ...related.topics.slice(0, 2),
              ...related.situations.slice(0, 2),
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

      {theaterNews.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">
          <p className="mb-1.5 text-[9px] tracking-[0.15em] text-[var(--muted)] uppercase">
            {isTrack ? "Theater news" : "Linked intel"}
          </p>
          <ul className="flex flex-col gap-1">
            {theaterNews.slice(0, 4).map((article) => (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => previewNews(article)}
                  className="w-full text-left"
                >
                  <span className="line-clamp-2 text-[11px] text-[var(--accent)] hover:underline">
                    {article.title}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-[var(--muted)] uppercase">
                    {article.source}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
