"use client";

import { LENS_CONFIGS } from "@/lib/lenses";
import type { SituationMetrics, StakeholderLens } from "@/lib/types";

const METRIC_META: {
  key: keyof SituationMetrics;
  label: string;
  color: string;
}[] = [
  { key: "conflictCount", label: "Conflict", color: "#e85d4c" },
  { key: "thermalCount", label: "Thermal", color: "#f0a202" },
  { key: "aircraftCount", label: "Air", color: "#5ec8e8" },
  { key: "shipCount", label: "Sea", color: "#7ddea3" },
  { key: "trafficCount", label: "Traffic", color: "#fb923c" },
  { key: "populationNear", label: "Pop", color: "#c084fc" },
];

function formatMetric(key: keyof SituationMetrics, value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (key === "populationNear") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  }
  return String(value);
}

export function MetricsStrip({
  metrics,
  lens,
}: {
  metrics: SituationMetrics;
  lens?: StakeholderLens;
}) {
  const emphasis = lens ? new Set(LENS_CONFIGS[lens].metricEmphasis) : null;
  const rows = METRIC_META.filter((m) => {
    const v = metrics[m.key];
    return typeof v === "number" && v > 0;
  });

  if (rows.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-3 gap-1 border-t border-[var(--border)] pt-2">
      {rows.slice(0, 6).map((m) => {
        const hot = emphasis?.has(m.key);
        return (
          <div
            key={m.key}
            className={`rounded-sm px-1 py-0.5 text-center ${
              hot ? "bg-[var(--accent)]/10" : ""
            }`}
            title={hot && lens ? `Emphasized by ${lens} lens` : undefined}
          >
            <p
              className="font-[family-name:var(--font-display)] text-[11px] tabular-nums"
              style={{ color: m.color }}
            >
              {formatMetric(m.key, metrics[m.key])}
            </p>
            <p className="text-[8px] tracking-wider text-[var(--muted)] uppercase">
              {m.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
