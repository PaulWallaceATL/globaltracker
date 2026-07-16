import type { TrackerEvent } from "../types";

interface AcledRow {
  event_id_cnty?: string;
  data_id?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  notes?: string;
  event_type?: string;
  sub_event_type?: string;
  event_date?: string;
  country?: string;
  source?: string;
}

export function normalizeAcled(rows: AcledRow[]): TrackerEvent[] {
  const events: TrackerEvent[] = [];

  for (const row of rows) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const id = String(row.event_id_cnty ?? row.data_id ?? `${lat}-${lng}`);
    const description =
      row.notes?.trim() ||
      [row.event_type, row.sub_event_type].filter(Boolean).join(" — ") ||
      "ACLED conflict event";

    events.push({
      id: `acled-${id}`,
      lat,
      lng,
      type: "conflict",
      description,
      timestamp: row.event_date
        ? new Date(row.event_date).toISOString()
        : new Date().toISOString(),
      source: "acled",
      news_links: [],
      meta: {
        country: row.country ?? null,
        event_type: row.event_type ?? null,
        original_source: row.source ?? null,
      },
    });
  }

  return events;
}
