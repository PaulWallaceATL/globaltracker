"use client";

import { useTrackerStore } from "@/store/tracker-store";
import { SituationBrief } from "@/components/situation/SituationBrief";

/** Right column: optional situation strip + news (news always visible). */
export function RightRail() {
  const news = useTrackerStore((s) => s.news);
  const loading = useTrackerStore((s) => s.loading);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const previewArticle = useTrackerStore((s) => s.previewArticle);
  const previewNews = useTrackerStore((s) => s.previewNews);
  const query = useTrackerStore((s) => s.query);
  const selectedSituation = useTrackerStore((s) => s.selectedSituation);

  const highlighted = new Set(selectedEvent?.news_links ?? []);

  return (
    <div className="pointer-events-none absolute top-[7.25rem] right-2 bottom-3 z-20 flex w-[min(100%-1rem,17rem)] flex-col gap-2 max-lg:top-auto max-lg:bottom-[11rem] max-lg:left-2 max-lg:right-2 max-lg:h-[38vh]">
      {selectedSituation && (
        <div className="pointer-events-auto shrink-0">
          <SituationBrief embedded />
        </div>
      )}

      <aside className="pointer-events-auto flex min-h-0 flex-1 flex-col border border-[var(--border)] bg-[var(--panel)]/95 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="shrink-0 border-b border-[var(--border)] px-3 py-2">
          <h2 className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.16em] text-[var(--fg)] uppercase">
            News
          </h2>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {news.length > 0
              ? `${news.length} source${news.length === 1 ? "" : "s"}${query ? ` · “${query}”` : ""}`
              : query
                ? `No articles for “${query}” yet`
                : "Track a place to fill feed"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && news.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
              Loading news…
            </p>
          )}
          {!loading && news.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-[var(--muted)]">
                No live articles returned for this theater. Try another place or
                check news API quotas.
              </p>
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {news.map((article) => {
              const active =
                highlighted.has(article.url) ||
                previewArticle?.id === article.id;
              return (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => previewNews(article)}
                    className={`w-full rounded-sm px-2.5 py-2.5 text-left transition hover:bg-white/5 ${
                      active
                        ? "border border-[var(--accent)]/50 bg-[var(--accent)]/10"
                        : "border border-transparent"
                    }`}
                  >
                    <p className="font-[family-name:var(--font-body)] text-[12px] leading-snug text-[var(--fg)]">
                      {article.title}
                    </p>
                    {article.description ? (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--muted)]">
                        {article.description}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] tracking-wide text-[var(--muted)] uppercase">
                      <span className="truncate">{article.source}</span>
                      <time dateTime={article.publishedAt}>
                        {formatRelative(article.publishedAt)}
                      </time>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
