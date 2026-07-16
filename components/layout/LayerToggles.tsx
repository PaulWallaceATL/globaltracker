"use client";

import { useMemo } from "react";
import type { TrackLayer } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const LAYER_META: {
  id: TrackLayer;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "conflict",
    label: "Conflicts",
    hint: "ACLED / GDELT events",
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
    hint: "ADS-B / OpenSky / AviationStack",
    color: "#5ec8e8",
  },
  {
    id: "ship",
    label: "Ships",
    hint: "AIS naval tracks",
    color: "#7ddea3",
  },
  {
    id: "population",
    label: "Population",
    hint: "Density estimates",
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
    hint: "Open-Meteo context",
    color: "#94a3b8",
  },
];

export function LayerToggles() {
  const layers = useTrackerStore((s) => s.layers);
  const events = useTrackerStore((s) => s.events);
  const populationPoints = useTrackerStore((s) => s.populationPoints);
  const weather = useTrackerStore((s) => s.weather);
  const toggleLayer = useTrackerStore((s) => s.toggleLayer);
  const setAllLayers = useTrackerStore((s) => s.setAllLayers);
  const hasSearched = useTrackerStore((s) => s.hasSearched);

  const counts = useMemo(() => {
    const c: Record<TrackLayer, number> = {
      conflict: 0,
      thermal: 0,
      aircraft: 0,
      ship: 0,
      population: populationPoints.length,
      traffic: 0,
      weather: weather ? 1 : 0,
    };
    for (const e of events) {
      if (e.type in c && e.type !== "population" && e.type !== "weather") {
        c[e.type as TrackLayer] += 1;
      }
    }
    return c;
  }, [events, populationPoints.length, weather]);

  const allOn = LAYER_META.every((l) => layers[l.id]);

  const legendLayers = LAYER_META.filter((l) =>
    ["conflict", "thermal", "aircraft", "ship", "traffic"].includes(l.id),
  );

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 w-[min(100%-1.5rem,14.5rem)] border border-[var(--border)] bg-[var(--panel)]/95 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] max-lg:bottom-[10rem]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.18em] text-[var(--fg)] uppercase">
            Map layers
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {hasSearched
              ? "Show or hide signal types"
              : "Live overview — search a place for denser data"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAllLayers(!allOn)}
          className="shrink-0 border border-[var(--border)] px-2 py-1 text-[10px] tracking-wide text-[var(--muted)] uppercase transition hover:text-[var(--fg)]"
        >
          {allOn ? "All off" : "All on"}
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-2 gap-y-1 border-b border-[var(--border)] pb-2">
        {legendLayers.map((layer) => (
          <span
            key={`legend-${layer.id}`}
            className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)]"
            title={layer.hint}
          >
            <i
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: layer.color }}
            />
            {layer.label.replace(/s$/, "")}
          </span>
        ))}
      </div>

      <ul className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
        {LAYER_META.map((layer) => {
          const on = layers[layer.id];
          const count = counts[layer.id];
          return (
            <li key={layer.id}>
              <button
                type="button"
                onClick={() => toggleLayer(layer.id)}
                aria-pressed={on}
                title={layer.hint}
                className={`flex w-full items-center gap-2 rounded-sm border px-1.5 py-1.5 text-left transition ${
                  on
                    ? "border-[var(--border)] bg-white/[0.03]"
                    : "border-transparent opacity-40 hover:opacity-65"
                }`}
              >
                <span
                  className="relative flex h-4 w-7 shrink-0 items-center rounded-full transition"
                  style={{
                    background: on ? `${layer.color}33` : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="absolute h-2.5 w-2.5 rounded-full transition-all"
                    style={{
                      background: on ? layer.color : "#6f7f94",
                      left: on ? "0.95rem" : "0.15rem",
                    }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-[var(--fg)]">
                    {layer.label}
                  </span>
                  <span className="block truncate text-[9px] text-[var(--muted)]">
                    {layer.hint}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-display)] text-[9px] tabular-nums text-[var(--muted)]">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
