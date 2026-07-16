"use client";

import { ShareButton } from "@/components/layout/ShareButton";
import { MetricsStrip } from "@/components/situation/MetricsStrip";
import { SituationTimeline } from "@/components/situation/SituationTimeline";
import { severityLabel, whyItMatters } from "@/lib/intel/humanize";
import { useTrackerStore } from "@/store/tracker-store";

export function SituationBrief({ embedded = false }: { embedded?: boolean }) {
  const situation = useTrackerStore((s) => s.selectedSituation);
  const lens = useTrackerStore((s) => s.lens);
  const weather = useTrackerStore((s) => s.weather);
  const clearSelection = useTrackerStore((s) => s.clearSelection);
  const toggleBookmark = useTrackerStore((s) => s.toggleBookmark);
  const bookmarks = useTrackerStore((s) => s.bookmarks);
  const flyTo = useTrackerStore((s) => s.flyTo);
  const related = useTrackerStore((s) => s.related);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const places = useTrackerStore((s) => s.places);

  if (!situation) return null;

  const brief = situation.briefs[lens];
  const bookmarked = bookmarks.some(
    (b) => b.entity_type === "situation" && b.entity_id === situation.id,
  );
  const placeName =
    places.find((p) => p.id === situation.placeId)?.name ??
    related?.places[0]?.label;

  const shell = embedded
    ? "border border-[var(--border)] bg-[var(--panel)]/95 p-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
    : "pointer-events-auto absolute top-[7.5rem] right-3 z-30 w-[min(100%-1.5rem,16.5rem)] border border-[var(--border)] bg-[var(--panel)]/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)] max-lg:top-auto max-lg:right-3 max-lg:bottom-[12rem]";

  return (
    <div className={shell}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.16em] text-[var(--accent)] uppercase">
            {severityLabel(situation.severity)} · {situation.severity}/5
          </p>
          <h3 className="mt-0.5 truncate font-[family-name:var(--font-body)] text-[12px] leading-snug text-[var(--fg)]">
            {brief.headline || situation.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="shrink-0 text-[9px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
        >
          Esc
        </button>
      </div>

      <p className="line-clamp-3 text-[11px] leading-relaxed text-[var(--fg-dim)]">
        {brief.body || situation.summary}
      </p>

      <p className="mt-1.5 border-l-2 border-[var(--accent)]/50 pl-2 text-[10px] leading-snug text-[var(--fg)]">
        {whyItMatters({
          severity: situation.severity,
          conflictCount: situation.metrics.conflictCount,
          populationNear: situation.metrics.populationNear,
          placeName,
        })}
      </p>

      <MetricsStrip metrics={situation.metrics} lens={lens} />

      {!embedded && (
        <ul className="mt-2 flex flex-col gap-1">
          {brief.bullets.slice(0, 3).map((b) => (
            <li
              key={b}
              className="border-l-2 border-[var(--accent)]/40 pl-2 text-[10px] text-[var(--fg-dim)]"
            >
              {b}
            </li>
          ))}
        </ul>
      )}

      {brief.callToAction && (
        <p className="mt-2 rounded-sm bg-[var(--accent)]/10 px-2 py-1.5 text-[10px] leading-snug text-[var(--fg)]">
          <span className="font-[family-name:var(--font-display)] text-[8px] tracking-wider text-[var(--accent)] uppercase">
            Next ·{" "}
          </span>
          {brief.callToAction}
        </p>
      )}

      {(weather || situation.metrics.weatherSummary) && (
        <p className="mt-1.5 text-[9px] text-[var(--muted)]">
          Weather · {weather?.summary ?? situation.metrics.weatherSummary}
        </p>
      )}

      {related && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[
            ...related.places.slice(0, 2),
            ...related.topics.slice(0, 2),
          ].map((ref) => (
            <button
              key={`${ref.type}-${ref.id}`}
              type="button"
              onClick={() => void focusEntity(ref.type, ref.id)}
              className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--fg-dim)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
            >
              {ref.label.slice(0, 16)}
            </button>
          ))}
        </div>
      )}

      {!embedded && <SituationTimeline limit={5} />}

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() =>
            flyTo({
              lat: situation.centroid.lat,
              lng: situation.centroid.lng,
              zoom: 1.85,
            })
          }
          className="bg-[var(--accent)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase"
        >
          Focus
        </button>
        <ShareButton />
        <button
          type="button"
          onClick={() =>
            void toggleBookmark("situation", situation.id, situation.title)
          }
          className="border border-[var(--border)] px-2 py-1 font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--muted)] uppercase hover:text-[var(--fg)]"
        >
          {bookmarked ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
