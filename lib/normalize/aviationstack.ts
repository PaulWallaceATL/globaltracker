import type { TrackerEvent } from "../types";

interface AviationStackFlight {
  flight_date?: string;
  flight_status?: string;
  departure?: {
    airport?: string;
    iata?: string;
    icao?: string;
    delay?: number | null;
    timezone?: string;
  };
  arrival?: {
    airport?: string;
    iata?: string;
    icao?: string;
    delay?: number | null;
  };
  airline?: { name?: string; iata?: string; icao?: string };
  flight?: { iata?: string; icao?: string; number?: string };
  aircraft?: { registration?: string; iata?: string; icao?: string; icao24?: string };
  live?: {
    updated?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    altitude?: number | null;
    direction?: number | null;
    speed_horizontal?: number | null;
    speed_vertical?: number | null;
    is_ground?: boolean | null;
  } | null;
}

interface AviationStackResponse {
  data?: AviationStackFlight[];
}

export function normalizeAviationStack(
  payload: AviationStackResponse,
): TrackerEvent[] {
  const list = payload.data ?? [];
  const events: TrackerEvent[] = [];

  for (const f of list) {
    const live = f.live;
    const lat = Number(live?.latitude);
    const lng = Number(live?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const callsign =
      (f.flight?.iata ?? f.flight?.icao ?? f.flight?.number ?? "UNKNOWN").trim();
    const airline = f.airline?.name ?? f.airline?.iata ?? "Commercial";
    const dep = f.departure?.iata ?? f.departure?.icao ?? "?";
    const arr = f.arrival?.iata ?? f.arrival?.icao ?? "?";
    const delayed = Number(f.departure?.delay ?? f.arrival?.delay ?? 0);
    // AviationStack live altitude is typically meters
    const alt = live?.altitude ?? null;
    const speedKmh = live?.speed_horizontal ?? null;

    events.push({
      id: `avstack-${callsign}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      type: "aircraft",
      description: `${airline} ${callsign} · ${dep}→${arr}${
        delayed > 15 ? ` · delayed ${delayed}m` : ""
      }`,
      timestamp: live?.updated
        ? new Date(live.updated).toISOString()
        : new Date().toISOString(),
      source: "aviationstack",
      news_links: [],
      meta: {
        callsign,
        airline,
        route: `${dep}-${arr}`,
        registration: f.aircraft?.registration ?? null,
        aircraft_type: f.aircraft?.iata ?? f.aircraft?.icao ?? null,
        icao24: f.aircraft?.icao24 ?? null,
        hex: f.aircraft?.icao24 ?? null,
        altitude: alt,
        altitude_unit: "m",
        heading: live?.direction ?? null,
        speed: speedKmh != null ? speedKmh / 3.6 : null,
        speed_unit: "ms",
        vertical_rate: live?.speed_vertical ?? null,
        delayed: delayed > 15,
        delay_min: delayed > 0 ? delayed : null,
        commercial: true,
        on_ground: live?.is_ground === true,
        flight_status: f.flight_status ?? null,
      },
    });
  }

  return events;
}
