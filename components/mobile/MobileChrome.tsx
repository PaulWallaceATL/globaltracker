"use client";

import { FormEvent, useMemo, useState } from "react";
import { LENS_CONFIGS } from "@/lib/lenses";
import {
  buildIntelFields,
  intelHeadline,
  intelSubtitle,
} from "@/lib/intel/format";
import { severityLabel } from "@/lib/intel/humanize";
import type { StakeholderLens, TrackLayer, TrackerEvent } from "@/lib/types";
import { ShareButton } from "@/components/layout/ShareButton";
import { SavedTray } from "@/components/layout/SavedTray";
import { useTrackerStore } from "@/store/tracker-store";
import { MobileBottomNav, type MobileTab } from "./MobileBottomNav";
import { MobileSheet } from "./MobileSheet";

const LAYER_META: {
  id: TrackLayer;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "conflict",
    label: "Conflicts",
    hint: "ACLED / GDELT",
    color: "#e85d4c",
  },
  {
    id: "thermal",
    label: "Thermal",
    hint: "FIRMS hotspots",
    color: "#f0a202",
  },
  {
    id: "aircraft",
    label: "Aircraft",
    hint: "ADS-B / OpenSky",
    color: "#5ec8e8",
  },
  {
    id: "ship",
    label: "Ships",
    hint: "AIS tracks",
    color: "#7ddea3",
  },
  {
    id: "population",
    label: "Population",
    hint: "Density",
    color: "#c084fc",
  },
  {
    id: "traffic",
    label: "Traffic",
    hint: "Road disruptions",
    color: "#fb923c",
  },
  {
    id: "weather",
    label: "Weather",
    hint: "Open-Meteo",
    color: "#94a3b8",
  },
];

const LENS_ORDER: StakeholderLens[] = [
  "public",
  "civic",
  "government",
  "business",
];

const TYPE_COLOR: Record<string, string> = {
  conflict: "#e85d4c",
  thermal: "#f0a202",
  aircraft: "#5ec8e8",
  ship: "#7ddea3",
  traffic: "#fb923c",
};

/**
 * Phone / tablet chrome: compact search, full globe, bottom tabs + sheets.
 * Desktop panels stay out of the way entirely.
 */
export function MobileChrome() {
  const [tab, setTab] = useState<MobileTab>("map");
  const query = useTrackerStore((s) => s.query);
  const setQuery = useTrackerStore((s) => s.setQuery);
  const runSearch = useTrackerStore((s) => s.runSearch);
  const loading = useTrackerStore((s) => s.loading);
  const error = useTrackerStore((s) => s.error);
  const events = useTrackerStore((s) => s.events);
  const news = useTrackerStore((s) => s.news);
  const situations = useTrackerStore((s) => s.situations);
  const layers = useTrackerStore((s) => s.layers);
  const toggleLayer = useTrackerStore((s) => s.toggleLayer);
  const setAllLayers = useTrackerStore((s) => s.setAllLayers);
  const setLens = useTrackerStore((s) => s.setLens);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const selectEvent = useTrackerStore((s) => s.selectEvent);
  const selectedSituation = useTrackerStore((s) => s.selectedSituation);
  const selectedPlace = useTrackerStore((s) => s.selectedPlace);
  const selectedTopic = useTrackerStore((s) => s.selectedTopic);
  const stackPanel = useTrackerStore((s) => s.stackPanel);
  const setStackPanel = useTrackerStore((s) => s.setStackPanel);
  const previewNews = useTrackerStore((s) => s.previewNews);
  const focusEntity = useTrackerStore((s) => s.focusEntity);
  const flyTo = useTrackerStore((s) => s.flyTo);
  const hasSearched = useTrackerStore((s) => s.hasSearched);
  const clearSelection = useTrackerStore((s) => s.clearSelection);
  const lens = useTrackerStore((s) => s.lens);

  const sheetOpen = tab !== "map";
  const allOn = LAYER_META.every((l) => layers[l.id]);

  const rankedSignals = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
      .slice(0, 40);
  }, [events]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(query);
    setTab("map");
  };

  const openSignal = (event: TrackerEvent) => {
    setStackPanel(null);
    selectEvent(event);
    flyTo({ lat: event.lat, lng: event.lng, zoom: 2.6 });
    setTab("map");
  };

  return (
    <>
      {/* Compact top search */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto">
          <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
            <p className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.18em] text-[var(--fg)] uppercase">
              GlobalTracker
            </p>
            <div className="flex items-center gap-1">
              <ShareButton />
              <SavedTray />
            </div>
          </div>
          <form
            onSubmit={onSubmit}
            className="flex overflow-hidden border border-[var(--border)] bg-[var(--panel)]/95 shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Track a place or topic…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="border-l border-[var(--border)] bg-[var(--accent)] px-3.5 font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase disabled:opacity-50"
            >
              {loading ? "…" : "Go"}
            </button>
          </form>
          {error ? (
            <p className="mt-1 text-center text-[11px] text-[var(--danger)]">
              {error}
            </p>
          ) : (
            <p className="mt-1 text-center text-[10px] text-[var(--muted)]">
              {loading
                ? "Scanning theater…"
                : hasSearched
                  ? `${events.length} signals · pinch to zoom · tap a pin`
                  : "Pinch to zoom · tap pins for intel"}
            </p>
          )}
        </div>
      </header>

      {/* Selected / stack detail as bottom sheet above nav */}
      {(selectedEvent || stackPanel) && tab === "map" && (
        <MobileSheet
          open
          title={
            stackPanel
              ? `Stack · ${stackPanel.events.length}`
              : selectedEvent
                ? selectedEvent.type === "aircraft"
                  ? "Air track"
                  : selectedEvent.type === "ship"
                    ? "Maritime"
                    : `Signal · ${selectedEvent.type}`
                : "Detail"
          }
          subtitle={
            selectedEvent
              ? intelHeadline(selectedEvent)
              : stackPanel
                ? "Pick a signal"
                : undefined
          }
          onClose={() => {
            selectEvent(null);
            setStackPanel(null);
            clearSelection();
          }}
          tall={Boolean(selectedEvent)}
        >
          {stackPanel ? (
            <ul>
              {stackPanel.events.map((ev) => (
                <li key={ev.id} className="border-b border-[var(--border)]/50">
                  <button
                    type="button"
                    onClick={() => openSignal(ev)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                  >
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: TYPE_COLOR[ev.type] ?? "#c4a35a",
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-[var(--fg)]">
                        {intelHeadline(ev)}
                      </span>
                      <span className="block text-[10px] text-[var(--muted)]">
                        {intelSubtitle(ev)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : selectedEvent ? (
            <MobileEventBody event={selectedEvent} />
          ) : null}
        </MobileSheet>
      )}

      {!selectedEvent &&
        !stackPanel &&
        tab === "map" &&
        (selectedSituation || selectedPlace || selectedTopic) && (
          <MobileSheet
            open
            title={
              selectedSituation
                ? "Situation"
                : selectedPlace
                  ? `Place · ${selectedPlace.kind}`
                  : "Topic"
            }
            subtitle={
              selectedSituation?.title ??
              selectedPlace?.name ??
              selectedTopic?.label
            }
            onClose={clearSelection}
            tall
          >
            <div className="px-3 py-3">
              {selectedSituation ? (
                <>
                  <p className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] text-[var(--accent)] uppercase">
                    {severityLabel(selectedSituation.severity)} ·{" "}
                    {selectedSituation.severity}/5
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-[var(--fg)]">
                    {selectedSituation.briefs[lens]?.headline ||
                      selectedSituation.title}
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-dim)]">
                    {selectedSituation.briefs[lens]?.body ||
                      selectedSituation.summary}
                  </p>
                </>
              ) : null}
              {selectedPlace ? (
                <>
                  <p className="text-[14px] font-semibold text-[var(--fg)]">
                    {selectedPlace.name}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {[selectedPlace.iso2, selectedPlace.iso3]
                      .filter(Boolean)
                      .join(" · ") || selectedPlace.kind}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      flyTo({
                        lat: selectedPlace.lat,
                        lng: selectedPlace.lng,
                        zoom: 1.5,
                      })
                    }
                    className="mt-3 bg-[var(--accent)] px-3 py-2 font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-wider text-[var(--accent-fg)] uppercase"
                  >
                    Fly to place
                  </button>
                </>
              ) : null}
              {selectedTopic ? (
                <>
                  <p className="text-[14px] font-semibold text-[var(--fg)]">
                    {selectedTopic.label}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Topic · {selectedTopic.slug}
                  </p>
                </>
              ) : null}
            </div>
          </MobileSheet>
        )}

      <MobileSheet
        open={sheetOpen && tab === "layers"}
        title="Map layers"
        subtitle="Show or hide signal types"
        onClose={() => setTab("map")}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[11px] text-[var(--muted)]">
            {LAYER_META.filter((l) => layers[l.id]).length} active
          </p>
          <button
            type="button"
            onClick={() => setAllLayers(!allOn)}
            className="border border-[var(--border)] px-2 py-1 text-[10px] tracking-wide text-[var(--muted)] uppercase"
          >
            {allOn ? "All off" : "All on"}
          </button>
        </div>
        <ul className="px-2 pb-3">
          {LAYER_META.map((layer) => {
            const on = layers[layer.id];
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  onClick={() => toggleLayer(layer.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-sm border px-2.5 py-3 text-left ${
                    on
                      ? "border-[var(--border)] bg-white/[0.03]"
                      : "border-transparent opacity-45"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ background: layer.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-[var(--fg)]">
                      {layer.label}
                    </span>
                    <span className="block text-[10px] text-[var(--muted)]">
                      {layer.hint}
                    </span>
                  </span>
                  <span
                    className="text-[10px] tracking-wider uppercase"
                    style={{ color: on ? layer.color : "var(--muted)" }}
                  >
                    {on ? "On" : "Off"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </MobileSheet>

      <MobileSheet
        open={sheetOpen && tab === "signals"}
        title="Signals"
        subtitle={
          situations.length
            ? `${events.length} events · ${situations.length} situations`
            : `${events.length} events in view`
        }
        onClose={() => setTab("map")}
        tall
      >
        {situations.length > 0 && (
          <div className="border-b border-[var(--border)] px-2 py-2">
            <p className="mb-1.5 px-1 font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] text-[var(--muted)] uppercase">
              Situations
            </p>
            <ul className="flex flex-col gap-1">
              {situations.slice(0, 8).map((sit) => (
                <li key={sit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void focusEntity("situation", sit.id);
                      setTab("map");
                    }}
                    className="w-full rounded-sm border border-[var(--border)] px-2.5 py-2 text-left"
                  >
                    <span className="font-[family-name:var(--font-display)] text-[9px] tracking-wider text-[var(--accent)] uppercase">
                      {severityLabel(sit.severity)} · {sit.severity}/5
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--fg)]">
                      {sit.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul>
          {rankedSignals.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[var(--muted)]">
              No signals yet — search a place or wait for pulse data.
            </p>
          ) : (
            rankedSignals.map((ev) => (
              <li key={ev.id} className="border-b border-[var(--border)]/50">
                <button
                  type="button"
                  onClick={() => openSignal(ev)}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                >
                  <span
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: TYPE_COLOR[ev.type] ?? "#c4a35a",
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-[var(--fg)]">
                      {intelHeadline(ev)}
                    </span>
                    <span className="block text-[10px] text-[var(--muted)]">
                      {intelSubtitle(ev)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </MobileSheet>

      <MobileSheet
        open={sheetOpen && tab === "news"}
        title="News"
        subtitle={
          news.length
            ? `${news.length} articles`
            : "Track a place to fill the feed"
        }
        onClose={() => setTab("map")}
        tall
      >
        {news.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-[var(--muted)]">
            No live articles for this theater yet.
          </p>
        ) : (
          <ul>
            {news.map((article) => (
              <li key={article.id} className="border-b border-[var(--border)]/50">
                <button
                  type="button"
                  onClick={() => {
                    previewNews(article);
                    setTab("map");
                  }}
                  className="w-full px-3 py-3 text-left"
                >
                  <p className="text-[13px] leading-snug text-[var(--fg)]">
                    {article.title}
                  </p>
                  <p className="mt-1 text-[10px] tracking-wide text-[var(--muted)] uppercase">
                    {article.source}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileSheet>

      <MobileSheet
        open={sheetOpen && tab === "more"}
        title="More"
        subtitle="Lens, tips, and view"
        onClose={() => setTab("map")}
      >
        <div className="px-3 py-3">
          <p className="mb-2 font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] text-[var(--muted)] uppercase">
            Who is this for?
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {LENS_ORDER.map((id) => {
              const item = LENS_CONFIGS[id];
              const on = lens === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLens(id)}
                  className={`rounded-sm px-2 py-2 text-left ${
                    on
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "border border-[var(--border)] text-[var(--fg-dim)]"
                  }`}
                >
                  <span className="block font-[family-name:var(--font-display)] text-[10px] tracking-wider uppercase">
                    {item.shortLabel}
                  </span>
                  <span
                    className={`mt-0.5 block text-[9px] leading-snug ${
                      on ? "opacity-80" : "text-[var(--muted)]"
                    }`}
                  >
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
            Drag to rotate · pinch to zoom · tap a colored pin for intel. Use
            Layers to filter conflicts, aircraft, ships, and more.
          </p>
        </div>
      </MobileSheet>

      <MobileBottomNav
        active={tab}
        onChange={setTab}
        signalCount={events.length}
        newsCount={news.length}
      />
    </>
  );
}

function MobileEventBody({ event }: { event: TrackerEvent }) {
  const fields = buildIntelFields(event);
  const color = TYPE_COLOR[event.type] ?? "#c4a35a";

  return (
    <div className="px-3 py-3">
      <p
        className="font-[family-name:var(--font-display)] text-[9px] tracking-[0.14em] uppercase"
        style={{ color }}
      >
        {event.type} · {event.source}
      </p>
      <p className="mt-1 text-[14px] font-semibold text-[var(--fg)]">
        {intelHeadline(event)}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">
        {intelSubtitle(event)}
      </p>
      {event.description ? (
        <p className="mt-2 text-[12px] leading-snug text-[var(--fg-dim)]">
          {event.description}
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[9px] tracking-wider text-[var(--muted)] uppercase">
              {f.label}
            </dt>
            <dd className="truncate text-[12px] tabular-nums text-[var(--fg)]">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10px] tabular-nums text-[var(--muted)]">
        {event.lat.toFixed(3)}°, {event.lng.toFixed(3)}°
      </p>
    </div>
  );
}
