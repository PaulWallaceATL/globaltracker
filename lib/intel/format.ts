import type { TrackerEvent } from "@/lib/types";

export interface IntelField {
  label: string;
  value: string;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function fmtAlt(metersOrFeet: number | null, unit: "m" | "ft" = "m"): string {
  if (metersOrFeet == null) return "—";
  if (unit === "ft") {
    return `${Math.round(metersOrFeet).toLocaleString()} ft`;
  }
  const ft = metersOrFeet * 3.28084;
  return `${Math.round(metersOrFeet).toLocaleString()} m · ${Math.round(ft).toLocaleString()} ft`;
}

function fmtSpeed(msOrKts: number | null, unit: "ms" | "kts" | "kmh"): string {
  if (msOrKts == null) return "—";
  if (unit === "kts") return `${msOrKts.toFixed(1)} kn`;
  if (unit === "kmh") return `${Math.round(msOrKts)} km/h`;
  const kts = msOrKts * 1.94384;
  return `${msOrKts.toFixed(1)} m/s · ${kts.toFixed(0)} kn`;
}

function fmtHeading(deg: number | null): string {
  if (deg == null || deg < 0 || deg > 360) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round(deg / 45) % 8;
  return `${Math.round(deg)}° ${dirs[i]}`;
}

const AIS_SHIP_TYPES: Record<number, string> = {
  0: "Unknown",
  30: "Fishing",
  31: "Towing",
  35: "Military",
  36: "Sailing",
  37: "Pleasure craft",
  40: "HSC",
  50: "Pilot",
  51: "SAR",
  52: "Tug",
  53: "Port tender",
  55: "Law enforcement",
  60: "Passenger",
  70: "Cargo",
  80: "Tanker",
  90: "Other",
};

function aisTypeLabel(code: number | null): string {
  if (code == null) return "—";
  if (AIS_SHIP_TYPES[code]) return `${AIS_SHIP_TYPES[code]} (${code})`;
  const band = Math.floor(code / 10) * 10;
  if (AIS_SHIP_TYPES[band]) return `${AIS_SHIP_TYPES[band]} class (${code})`;
  return `Type ${code}`;
}

/** Build rich intel rows for aircraft / ship detail + hover. */
export function buildIntelFields(event: TrackerEvent): IntelField[] {
  const m = event.meta ?? {};
  if (event.type === "aircraft") {
    const fields: IntelField[] = [
      { label: "Callsign", value: str(m.callsign) ?? "—" },
      { label: "Source", value: event.source },
    ];
    if (str(m.hex) || str(m.icao24)) {
      fields.push({
        label: "ICAO / Hex",
        value: (str(m.hex) ?? str(m.icao24) ?? "—").toUpperCase(),
      });
    }
    if (str(m.registration)) {
      fields.push({ label: "Reg", value: str(m.registration)! });
    }
    if (str(m.aircraft_type) || str(m.type)) {
      fields.push({
        label: "Type",
        value: str(m.aircraft_type) ?? str(m.type) ?? "—",
      });
    }
    if (str(m.airline)) {
      fields.push({ label: "Airline", value: str(m.airline)! });
    }
    if (str(m.route)) {
      fields.push({ label: "Route", value: str(m.route)! });
    }
    if (str(m.origin_country)) {
      fields.push({ label: "Origin", value: str(m.origin_country)! });
    }
    if (str(m.category)) {
      fields.push({ label: "Category", value: str(m.category)! });
    }
    fields.push({
      label: "Altitude",
      value: fmtAlt(
        num(m.altitude),
        m.altitude_unit === "ft" ? "ft" : "m",
      ),
    });
    fields.push({
      label: "Speed",
      value: fmtSpeed(
        num(m.speed),
        m.speed_unit === "kts"
          ? "kts"
          : m.speed_unit === "kmh"
            ? "kmh"
            : "ms",
      ),
    });
    fields.push({ label: "Heading", value: fmtHeading(num(m.heading)) });
    if (m.military === true) {
      fields.push({ label: "Flag", value: "Military" });
    }
    if (m.commercial === true) {
      fields.push({ label: "Flag", value: "Commercial" });
    }
    if (m.on_ground === true) {
      fields.push({ label: "Status", value: "On ground" });
    }
    if (m.delayed === true) {
      fields.push({
        label: "Delay",
        value: num(m.delay_min) != null ? `${num(m.delay_min)} min` : "Yes",
      });
    }
    if (str(m.squawk)) {
      fields.push({ label: "Squawk", value: str(m.squawk)! });
    }
    if (num(m.vertical_rate) != null) {
      fields.push({
        label: "V/S",
        value: `${num(m.vertical_rate)!.toFixed(1)} m/s`,
      });
    }
    fields.push({
      label: "Position",
      value: `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`,
    });
    return fields;
  }

  if (event.type === "ship") {
    const fields: IntelField[] = [
      { label: "Name", value: str(m.name) ?? "—" },
      { label: "Source", value: event.source },
    ];
    if (num(m.mmsi) != null || str(m.mmsi)) {
      fields.push({ label: "MMSI", value: String(m.mmsi) });
    }
    if (str(m.imo)) fields.push({ label: "IMO", value: str(m.imo)! });
    if (str(m.callsign)) {
      fields.push({ label: "Callsign", value: str(m.callsign)! });
    }
    fields.push({
      label: "Ship type",
      value: aisTypeLabel(num(m.ship_type)),
    });
    fields.push({
      label: "SOG",
      value: num(m.sog) != null ? `${num(m.sog)!.toFixed(1)} kn` : "—",
    });
    fields.push({
      label: "COG",
      value: fmtHeading(num(m.cog)),
    });
    fields.push({
      label: "Heading",
      value: fmtHeading(num(m.heading)),
    });
    if (str(m.nav_status)) {
      fields.push({ label: "Nav status", value: str(m.nav_status)! });
    }
    if (num(m.draught) != null) {
      fields.push({ label: "Draught", value: `${num(m.draught)} m` });
    }
    if (str(m.destination)) {
      fields.push({ label: "Destination", value: str(m.destination)! });
    }
    if (str(m.eta)) {
      fields.push({ label: "ETA", value: str(m.eta)! });
    }
    if (m.military === true || num(m.ship_type) === 35) {
      fields.push({ label: "Flag", value: "Military / government" });
    }
    fields.push({
      label: "Position",
      value: `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`,
    });
    return fields;
  }

  if (
    event.type === "conflict" ||
    event.type === "thermal" ||
    event.type === "traffic"
  ) {
    return buildSignalFields(event);
  }

  return [
    { label: "Source", value: event.source },
    {
      label: "Position",
      value: `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`,
    },
  ];
}

function relativeAge(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Rich fields for conflict / thermal / traffic (non-track signals). */
export function buildSignalFields(event: TrackerEvent): IntelField[] {
  const m = event.meta ?? {};
  const fields: IntelField[] = [
    { label: "Source", value: event.source },
    { label: "When", value: relativeAge(event.timestamp) },
  ];

  const severity = event.severity ?? num(m.severity) ?? num(m.fatalities);
  if (severity != null) {
    fields.push({
      label: "Severity",
      value:
        event.severity != null
          ? `${event.severity}/5`
          : String(severity),
    });
  }

  if (str(m.event_type) || str(m.sub_event_type)) {
    fields.push({
      label: "Type",
      value: str(m.sub_event_type) ?? str(m.event_type) ?? "—",
    });
  }
  if (str(m.actor1) || str(m.actor)) {
    fields.push({
      label: "Actor",
      value: str(m.actor1) ?? str(m.actor) ?? "—",
    });
  }
  if (str(m.location) || str(m.admin1) || str(m.country)) {
    const placeLabel =
      str(m.location) ??
      [str(m.admin1), str(m.country)].filter(Boolean).join(", ");
    fields.push({
      label: "Place",
      value: placeLabel || "—",
    });
  }
  if (event.type === "thermal") {
    if (num(m.brightness) != null) {
      fields.push({
        label: "Brightness",
        value: String(num(m.brightness)),
      });
    }
    if (num(m.frp) != null) {
      fields.push({ label: "FRP", value: `${num(m.frp)} MW` });
    }
    if (str(m.satellite)) {
      fields.push({ label: "Satellite", value: str(m.satellite)! });
    }
  }
  if (event.type === "traffic") {
    if (str(m.road) || str(m.highway)) {
      fields.push({
        label: "Road",
        value: str(m.road) ?? str(m.highway) ?? "—",
      });
    }
    if (num(m.delay) != null || num(m.delay_min) != null) {
      fields.push({
        label: "Delay",
        value: `${num(m.delay) ?? num(m.delay_min)} min`,
      });
    }
  }

  const newsCount = event.news_links?.length ?? 0;
  if (newsCount > 0) {
    fields.push({
      label: "Linked news",
      value: String(newsCount),
    });
  }

  fields.push({
    label: "Position",
    value: `${event.lat.toFixed(3)}, ${event.lng.toFixed(3)}`,
  });

  return fields;
}

export function intelHeadline(event: TrackerEvent): string {
  const m = event.meta ?? {};
  if (event.type === "aircraft") {
    const cs = str(m.callsign) ?? "Aircraft";
    const mil = m.military === true ? "MIL " : "";
    const route = str(m.route);
    return route ? `${mil}${cs} · ${route}` : `${mil}${cs}`;
  }
  if (event.type === "ship") {
    return str(m.name) ?? `MMSI ${m.mmsi ?? "—"}`;
  }
  if (event.type === "conflict") {
    return (
      str(m.sub_event_type) ??
      str(m.event_type) ??
      truncate(event.description, 48) ??
      event.source
    );
  }
  if (event.type === "thermal") {
    return str(m.satellite)
      ? `Thermal · ${str(m.satellite)}`
      : "Thermal hotspot";
  }
  if (event.type === "traffic") {
    return str(m.road) ?? truncate(event.description, 48) ?? "Traffic incident";
  }
  return event.source;
}

export function intelSubtitle(event: TrackerEvent): string {
  const m = event.meta ?? {};
  if (event.type === "aircraft") {
    const bits = [
      str(m.airline),
      str(m.aircraft_type) ?? str(m.type),
      m.military === true ? "military" : null,
      m.commercial === true ? "commercial" : null,
    ].filter(Boolean);
    return bits.length ? bits.join(" · ") : event.source;
  }
  if (event.type === "ship") {
    return aisTypeLabel(num(m.ship_type));
  }
  if (
    event.type === "conflict" ||
    event.type === "thermal" ||
    event.type === "traffic"
  ) {
    const bits = [
      event.source,
      str(m.location) ?? str(m.country),
      event.severity != null ? `sev ${event.severity}/5` : null,
    ].filter(Boolean);
    return bits.join(" · ");
  }
  return event.type;
}

function truncate(s: string, n: number): string | null {
  const t = s.trim();
  if (!t) return null;
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
