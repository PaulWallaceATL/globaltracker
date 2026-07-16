"use client";

import { useEffect } from "react";
import { useTrackerStore } from "@/store/tracker-store";

export function NewsPreview() {
  const article = useTrackerStore((s) => s.previewArticle);
  const previewNews = useTrackerStore((s) => s.previewNews);

  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") previewNews(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [article, previewNews]);

  if (!article) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-preview-title"
      onClick={() => previewNews(null)}
    >
      <article
        className="max-h-[min(90dvh,36rem)] w-full max-w-lg overflow-y-auto border border-[var(--border)] bg-[var(--panel)] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="h-44 w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-28 items-center justify-center border-b border-[var(--border)] bg-[var(--bg)]">
            <span className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.2em] text-[var(--muted)] uppercase">
              Article preview
            </span>
          </div>
        )}

        <div className="p-5">
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--accent)] uppercase">
            {article.source}
            {article.publishedAt
              ? ` · ${new Date(article.publishedAt).toLocaleString()}`
              : ""}
          </p>
          <h2
            id="news-preview-title"
            className="mt-2 font-[family-name:var(--font-body)] text-xl leading-snug text-[var(--fg)]"
          >
            {article.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-dim)]">
            {article.description?.trim() ||
              "No summary available for this article."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--accent)] px-4 py-2 font-[family-name:var(--font-display)] text-xs font-semibold tracking-wider text-[var(--accent-fg)] uppercase transition hover:brightness-110"
            >
              Open original
            </a>
            <button
              type="button"
              onClick={() => previewNews(null)}
              className="border border-[var(--border)] px-4 py-2 font-[family-name:var(--font-display)] text-xs tracking-wider text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
            >
              Close
            </button>
          </div>

          <p className="mt-4 truncate text-[10px] text-[var(--muted)]">
            {article.url}
          </p>
        </div>
      </article>
    </div>
  );
}
