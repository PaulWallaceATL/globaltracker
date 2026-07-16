import type { TrackerEvent } from "../types";

interface AdsbAircraft {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  desc?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  alt_geom?: number | string;
  track?: number;
  gs?: number;
  baro_rate?: number;
  geom_rate?: number;
  squawk?: string;
  category?: string;
  military?: boolean;
  dbFlags?: number;
  nac_p?: number;
  sil?: number;
}

interface AdsbResponse {
  ac?: AdsbAircraft[];
  aircraft?: AdsbAircraft[];
}

export function normalizeAdsb(payload: AdsbResponse | AdsbAircraft[]): TrackerEvent[] {
  const list = Array.isArray(payload)
    ? payload
    : (payload.ac ?? payload.aircraft ?? []);

  const events: TrackerEvent[] = [];

  for (const ac of list) {
    const lat = Number(ac.lat);
    const lng = Number(ac.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const callsign = (ac.flight ?? ac.r ?? ac.hex ?? "UNKNOWN").trim();
    const isMil =
      ac.military === true ||
      (typeof ac.dbFlags === "number" && (ac.dbFlags & 1) === 1);
    const alt =
      typeof ac.alt_baro === "number"
        ? ac.alt_baro
        : typeof ac.alt_geom === "number"
          ? ac.alt_geom
          : null;
    // ADS-B.lol altitudes are typically feet
    const altM = alt != null ? alt / 3.28084 : null;

    events.push({
      id: `adsb-${ac.hex ?? callsign}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      type: "aircraft",
      description: `${isMil ? "Military" : "Aircraft"} ${callsign}${
        ac.t ? ` (${ac.t})` : ""
      }${ac.desc ? ` · ${ac.desc}` : ""}`,
      timestamp: new Date().toISOString(),
      source: "adsb.lol",
      news_links: [],
      meta: {
        callsign,
        hex: ac.hex ?? null,
        icao24: ac.hex ?? null,
        registration: ac.r ?? null,
        aircraft_type: ac.t ?? null,
        type: ac.desc ?? ac.t ?? null,
        altitude: altM,
        altitude_unit: "m",
        heading: ac.track ?? null,
        speed: typeof ac.gs === "number" ? ac.gs / 1.94384 : null,
        speed_unit: "ms",
        vertical_rate: ac.baro_rate ?? ac.geom_rate ?? null,
        squawk: ac.squawk ?? null,
        category: ac.category ?? null,
        military: isMil,
      },
    });
  }

  return events;
}
