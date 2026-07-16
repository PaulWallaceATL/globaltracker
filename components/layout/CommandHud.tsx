"use client";

import { useEffect, useMemo, useState } from "react";
import { LENS_CONFIGS } from "@/lib/lenses";
import { useTrackerStore } from "@/store/tracker-store";

export function CommandHud() {
  const query = useTrackerStore((s) => s.query);
  const countryCode = useTrackerStore((s) => s.countryCode);
  const events = useTrackerStore((s) => s.events);
  const news = useTrackerStore((s) => s.news);
  const situations = useTrackerStore((s) => s.situations);
  const loading = useTrackerStore((s) => s.loading);
  const hasSearched = useTrackerStore((s) => s.hasSearched);
  const lastUpdated = useTrackerStore((s) => s.lastUpdated);
  const layers = useTrackerStore((s) => s.layers);
  const lens = useTrackerStore((s) => s.lens);
  const weather = useTrackerStore((s) => s.weather);
  const cameraZoom = useTrackerStore((s) => s.cameraZoom);
  const clusterMergeDeg = useTrackerStore((s) => s.clusterMergeDeg);
  const [utc, setUtc] = useState("");

  useEffect(() => {
    const tick = () => {
      setUtc(
        new Date().toLocaleString("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " UTC",
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    let conflict = 0;
    let thermal = 0;
    let aircraft = 0;
    let ship = 0;
    let traffic = 0;
    for (const e of events) {
      if (e.type === "conflict" && layers.conflict) conflict++;
      else if (e.type === "thermal" && layers.thermal) thermal++;
      else if (e.type === "aircraft" && layers.aircraft) aircraft++;
      else if (e.type === "ship" && layers.ship) ship++;
      else if (e.type === "traffic" && layers.traffic) traffic++;
    }
    return {
      conflict,
      thermal,
      aircraft,
      ship,
      traffic,
      total: events.length,
      situations: situations.length,
    };
  }, [events, layers, situations.length]);

  const theater = hasSearched
    ? countryCode
      ? `${query.toUpperCase()} · ${countryCode}`
      : query.toUpperCase() || "THEATER"
    : "GLOBAL PULSE";

  const lensLabel = LENS_CONFIGS[lens].shortLabel;
  const zoomBand =
    cameraZoom >= 3.2
      ? "Street"
      : cameraZoom >= 2.5
        ? "Local"
        : cameraZoom >= 1.6
          ? "Theater"
          : cameraZoom >= 1.0
            ? "Region"
            : "Orbit";
  const pinsSeparated = clusterMergeDeg <= 0.55;

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 hidden w-[min(100%-2rem,32rem)] -translate-x-1/2 lg:block">
      <div className="command-hud pointer-events-auto border border-[var(--border)] bg-[var(--panel)]/95 px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-[10px] tracking-[0.2em] uppercase ${
                loading ? "text-[var(--accent)]" : "text-[#7ddea3]"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  loading
                    ? "animate-pulse bg-[var(--accent)]"
                    : "bg-[#7ddea3] shadow-[0_0_8px_#7ddea3]"
                }`}
                aria-hidden
              />
              {loading ? "Scanning" : hasSearched ? "Live" : "Pulse"}
            </span>
            <span className="text-[10px] tracking-wide text-[var(--muted)] uppercase">
              Lens · {lensLabel}
            </span>
            <span
              className={`text-[10px] tracking-wide uppercase ${
                cameraZoom >= 2.5
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
              title={`Zoom ${cameraZoom.toFixed(2)} · merge ${clusterMergeDeg.toFixed(2)}°`}
            >
              View · {zoomBand}
              {pinsSeparated ? " · unclustered" : ""}
            </span>
          </div>
          <span className="font-[family-name:var(--font-display)] text-[10px] tabular-nums tracking-wider text-[var(--muted)]">
            {utc}
          </span>
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.12em] text-[var(--fg)] uppercase">
              Focus · {theater}
            </p>
            <p className="text-[9px] text-[var(--muted)]">
              Area currently tracked on the globe
            </p>
          </div>
          {lastUpdated && (
            <p className="text-[10px] text-[var(--muted)]">
              Synced {formatAge(lastUpdated)}
            </p>
          )}
        </div>

        <div className="mt-2 grid grid-cols-6 gap-1 border-t border-[var(--border)] pt-2">
          <Stat label="Signals" value={counts.total} />
          <Stat label="Sits" value={counts.situations} color="#c4a35a" title="Situations" />
          <Stat label="Conflict" value={counts.conflict} color="#e85d4c" />
          <Stat label="Air" value={counts.aircraft} color="#5ec8e8" />
          <Stat label="Sea" value={counts.ship} color="#7ddea3" />
          <Stat label="Traffic" value={counts.traffic} color="#fb923c" />
        </div>

        <p className="mt-2 text-[10px] text-[var(--muted)]">
          {weather
            ? `Wx · ${weather.summary} · `
            : ""}
          {cameraZoom >= 2.5
            ? "Deep zoom · track labels on · scroll for street-level"
            : "Scroll to zoom in · pins separate and label as you close"}
          {news.length ? ` · ${news.length} media` : ""}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  title,
}: {
  label: string;
  value: number;
  color?: string;
  title?: string;
}) {
  return (
    <div className="text-center" title={title ?? label}>
      <p
        className="font-[family-name:var(--font-display)] text-sm tabular-nums"
        style={{ color: color ?? "var(--fg)" }}
      >
        {value}
      </p>
      <p className="text-[9px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
    </div>
  );
}

function formatAge(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "—";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
