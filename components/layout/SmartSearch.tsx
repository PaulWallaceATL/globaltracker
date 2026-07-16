"use client";

import { FormEvent, useEffect, useState } from "react";
import { TOPIC_CATALOG } from "@/lib/graph/topics";
import type { SearchHit } from "@/lib/types";
import { FirstRunCoach } from "@/components/layout/FirstRunCoach";
import { SavedTray } from "@/components/layout/SavedTray";
import { ShareButton } from "@/components/layout/ShareButton";
import { useTrackerStore } from "@/store/tracker-store";

const PLACE_EXAMPLES = ["Sudan", "Ukraine", "Gaza", "Yemen", "Taiwan"];
const TOPIC_EXAMPLES = TOPIC_CATALOG.slice(0, 5).map((t) => t.slug);

export function SmartSearch({
  onOpenSituations,
}: {
  onOpenSituations?: () => void;
}) {
  const query = useTrackerStore((s) => s.query);
  const loading = useTrackerStore((s) => s.loading);
  const error = useTrackerStore((s) => s.error);
  const hasSearched = useTrackerStore((s) => s.hasSearched);
  const events = useTrackerStore((s) => s.events);
  const situations = useTrackerStore((s) => s.situations);
  const searchHits = useTrackerStore((s) => s.searchHits);
  const runSearch = useTrackerStore((s) => s.runSearch);
  const previewSearch = useTrackerStore((s) => s.previewSearch);
  const setQuery = useTrackerStore((s) => s.setQuery);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const showGraphNav = useTrackerStore((s) => s.showGraphNav);
  const toggleGraphNav = useTrackerStore((s) => s.toggleGraphNav);
  const [showHits, setShowHits] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      return;
    }
    const id = window.setTimeout(() => {
      void previewSearch(q);
    }, 250);
    return () => window.clearTimeout(id);
  }, [query, previewSearch]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setShowHits(false);
    void runSearch(query);
  };

  const runChip = (value: string) => {
    setQuery(value);
    setShowHits(false);
    void runSearch(value);
  };

  const pickHit = (hit: SearchHit) => {
    setShowHits(false);
    setQuery(hit.label);
    if (
      hit.type === "situation" ||
      hit.type === "place" ||
      hit.type === "topic" ||
      hit.type === "event" ||
      hit.type === "media"
    ) {
      void focusEntity(hit.type, hit.id);
    } else {
      void runSearch(hit.label);
    }
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-3 pt-3">
      <div className="pointer-events-auto w-full max-w-2xl">
        <div className="mb-1.5 flex items-end justify-between gap-3 px-0.5">
          <div>
            <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.22em] text-[var(--fg)] uppercase">
              GlobalTracker
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              God&apos;s-eye · track a place or topic
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ShareButton />
            <SavedTray />
            <button
              type="button"
              onClick={() => onOpenSituations?.()}
              disabled={situations.length === 0}
              className="shrink-0 rounded-sm border border-[var(--border)] px-2 py-1 text-[9px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)] disabled:opacity-40"
              title="Browse active situations"
            >
              Situations
              {situations.length > 0 ? ` · ${situations.length}` : ""}
            </button>
            <button
              type="button"
              onClick={() => toggleGraphNav()}
              className={`shrink-0 rounded-sm border px-2 py-1 text-[9px] tracking-wide uppercase transition ${
                showGraphNav
                  ? "border-[var(--accent)]/50 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
              title="Toggle related-entity graph panel"
            >
              Graph {showGraphNav ? "on" : "off"}
            </button>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="relative flex items-stretch overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel)]/95 shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        >
          <label className="sr-only" htmlFor="smart-search">
            Search situations, places, topics, or events
          </label>
          <input
            id="smart-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowHits(true);
            }}
            onFocus={() => setShowHits(true)}
            onBlur={() => {
              window.setTimeout(() => setShowHits(false), 150);
            }}
            placeholder="Situation, place, topic, or event…"
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="border-l border-[var(--border)] bg-[var(--accent)] px-5 font-[family-name:var(--font-display)] text-xs font-semibold tracking-wider text-[var(--accent-fg)] uppercase transition enabled:hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Track"}
          </button>

          {showHits && searchHits.length > 0 && query.trim() && (
            <div className="absolute top-full right-0 left-0 z-40 mt-1 max-h-64 overflow-y-auto border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
              {searchHits.map((hit) => (
                <button
                  key={`${hit.type}-${hit.id}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickHit(hit)}
                  className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-3 py-2 text-left last:border-0 hover:bg-white/[0.04]"
                >
                  <span className="font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--accent)] uppercase">
                    {hit.type}
                  </span>
                  <span className="truncate text-xs text-[var(--fg)]">
                    {hit.label}
                  </span>
                  {hit.subtitle && (
                    <span className="truncate text-[10px] text-[var(--muted)]">
                      {hit.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </form>

        <FirstRunCoach onOpenSituations={() => onOpenSituations?.()} />

        <div className="mt-2 flex flex-col gap-1.5">
          <ChipRow label="Places" chips={PLACE_EXAMPLES} onPick={runChip} />
          <ChipRow label="Topics" chips={TOPIC_EXAMPLES} onPick={runChip} />
          {situations.length > 0 && (
            <ChipRow
              label="Top situations"
              chips={situations.slice(0, 3).map((s) => s.title.slice(0, 28))}
              onPick={(label) => {
                const sit = situations.find((s) =>
                  s.title.startsWith(label.slice(0, 20)),
                );
                if (sit) void focusEntity("situation", sit.id);
                else runChip(label);
              }}
            />
          )}
        </div>

        {error && (
          <p className="mt-2 text-center text-xs text-[var(--danger)]">
            {error}
          </p>
        )}

        {hasSearched && !loading && (
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            {events.length} signals
            {situations.length ? ` · ${situations.length} situations` : ""}
            {query ? ` for “${query}”` : ""}
          </p>
        )}
      </div>
    </header>
  );
}

function ChipRow({
  label,
  chips,
  onPick,
}: {
  label: string;
  chips: string[];
  onPick: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-[family-name:var(--font-display)] text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
        {label}
      </span>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="rounded-sm border border-[var(--border)] bg-[var(--panel)]/70 px-2.5 py-1 text-[11px] text-[var(--fg-dim)] transition hover:border-[var(--accent)]/50 hover:text-[var(--fg)]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
