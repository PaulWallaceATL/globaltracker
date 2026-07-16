import type { TrackerEvent } from "../types";

export function normalizeFirmsCsv(csv: string): TrackerEvent[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const latIdx = headers.findIndex((h) => h === "latitude" || h === "lat");
  const lngIdx = headers.findIndex(
    (h) => h === "longitude" || h === "lon" || h === "long",
  );
  const brightIdx = headers.findIndex(
    (h) => h === "brightness" || h === "bright_ti4" || h === "brightness_ti4",
  );
  const frpIdx = headers.findIndex((h) => h === "frp");
  const dateIdx = headers.findIndex(
    (h) => h === "acq_date" || h === "acquisition_date",
  );
  const timeIdx = headers.findIndex(
    (h) => h === "acq_time" || h === "acquisition_time",
  );

  if (latIdx < 0 || lngIdx < 0) return [];

  const events: TrackerEvent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : "";
    const time = timeIdx >= 0 ? cols[timeIdx]?.trim().padStart(4, "0") : "";
    let timestamp = new Date().toISOString();
    if (date) {
      const hh = time ? time.slice(0, 2) : "00";
      const mm = time ? time.slice(2, 4) : "00";
      const parsed = new Date(`${date}T${hh}:${mm}:00Z`);
      if (!Number.isNaN(parsed.getTime())) timestamp = parsed.toISOString();
    }

    const brightness = brightIdx >= 0 ? Number(cols[brightIdx]) : null;
    const frp = frpIdx >= 0 ? Number(cols[frpIdx]) : null;

    events.push({
      id: `firms-${lat.toFixed(3)}-${lng.toFixed(3)}-${date}-${time}`,
      lat,
      lng,
      type: "thermal",
      description: `Thermal hotspot${Number.isFinite(frp) ? ` FRP ${frp}` : ""}`,
      timestamp,
      source: "nasa-firms",
      news_links: [],
      meta: {
        brightness: Number.isFinite(brightness as number) ? brightness : null,
        frp: Number.isFinite(frp as number) ? frp : null,
      },
    });
  }

  return events;
}
