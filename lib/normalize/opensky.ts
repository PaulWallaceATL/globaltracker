import type { TrackerEvent } from "../types";

/** OpenSky state vector indices */
const IDX = {
  icao24: 0,
  callsign: 1,
  origin_country: 2,
  time_position: 3,
  last_contact: 4,
  longitude: 5,
  latitude: 6,
  baro_altitude: 7,
  on_ground: 8,
  velocity: 9,
  true_track: 10,
  vertical_rate: 11,
  sensors: 12,
  geo_altitude: 13,
  squawk: 14,
  spi: 15,
  position_source: 16,
} as const;

interface OpenSkyResponse {
  time?: number;
  states?: (string | number | boolean | null)[][] | null;
}

export function normalizeOpenSky(payload: OpenSkyResponse): TrackerEvent[] {
  const states = payload.states ?? [];
  const events: TrackerEvent[] = [];

  for (const state of states) {
    const lat = Number(state[IDX.latitude]);
    const lng = Number(state[IDX.longitude]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const icao = String(state[IDX.icao24] ?? "unknown");
    const callsign = String(state[IDX.callsign] ?? icao).trim() || icao;
    const ts = Number(state[IDX.time_position] ?? state[IDX.last_contact]);
    const baro =
      typeof state[IDX.baro_altitude] === "number"
        ? state[IDX.baro_altitude]
        : typeof state[IDX.geo_altitude] === "number"
          ? (state[IDX.geo_altitude] as number)
          : null;

    events.push({
      id: `opensky-${icao}`,
      lat,
      lng,
      type: "aircraft",
      description: `Aircraft ${callsign} (${state[IDX.origin_country] ?? "n/a"})`,
      timestamp: Number.isFinite(ts)
        ? new Date(ts * 1000).toISOString()
        : new Date().toISOString(),
      source: "opensky",
      news_links: [],
      meta: {
        callsign,
        icao24: icao,
        hex: icao,
        origin_country: String(state[IDX.origin_country] ?? ""),
        altitude: baro,
        altitude_unit: "m",
        heading:
          typeof state[IDX.true_track] === "number"
            ? state[IDX.true_track]
            : null,
        speed:
          typeof state[IDX.velocity] === "number" ? state[IDX.velocity] : null,
        speed_unit: "ms",
        vertical_rate:
          typeof state[IDX.vertical_rate] === "number"
            ? state[IDX.vertical_rate]
            : null,
        squawk:
          state[IDX.squawk] != null ? String(state[IDX.squawk]) : null,
        on_ground: Boolean(state[IDX.on_ground]),
      },
    });
  }

  return events;
}
