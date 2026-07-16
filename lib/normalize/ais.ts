import type { TrackerEvent } from "../types";

interface AisPositionMessage {
  MessageType?: string;
  MetaData?: {
    MMSI?: number;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: {
      Latitude?: number;
      Longitude?: number;
      Cog?: number;
      Sog?: number;
      TrueHeading?: number;
      NavigationalStatus?: number;
    };
    ShipStaticData?: {
      Name?: string;
      Type?: number;
      CallSign?: string;
      ImoNumber?: number;
      Dimension?: { A?: number; B?: number; C?: number; D?: number };
      MaximumStaticDraught?: number;
      Destination?: string;
      Eta?: { Month?: number; Day?: number; Hour?: number; Minute?: number };
    };
  };
}

const NAV_STATUS: Record<number, string> = {
  0: "Under way using engine",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Engaged in fishing",
  8: "Under way sailing",
  15: "Not defined",
};

export function normalizeAisMessage(raw: unknown): TrackerEvent | null {
  const msg = raw as AisPositionMessage;
  const meta = msg.MetaData;
  const report = msg.Message?.PositionReport;
  const staticData = msg.Message?.ShipStaticData;

  const lat = Number(report?.Latitude ?? meta?.latitude);
  const lng = Number(report?.Longitude ?? meta?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const mmsi = meta?.MMSI ?? "unknown";
  const name = (
    meta?.ShipName ||
    staticData?.Name ||
    `MMSI ${mmsi}`
  ).trim();
  const shipType = staticData?.Type ?? null;
  const navCode = report?.NavigationalStatus;
  const eta = staticData?.Eta;
  const etaStr =
    eta?.Month && eta?.Day
      ? `${eta.Month}/${eta.Day} ${String(eta.Hour ?? 0).padStart(2, "0")}:${String(eta.Minute ?? 0).padStart(2, "0")} UTC`
      : null;

  return {
    id: `ais-${mmsi}`,
    lat,
    lng,
    type: "ship",
    description: `Vessel ${name}${shipType === 35 ? " · military" : ""}`,
    timestamp: meta?.time_utc
      ? new Date(meta.time_utc).toISOString()
      : new Date().toISOString(),
    source: "aisstream.io",
    news_links: [],
    meta: {
      mmsi: typeof mmsi === "number" ? mmsi : null,
      name,
      callsign: staticData?.CallSign?.trim() || null,
      imo: staticData?.ImoNumber ?? null,
      ship_type: shipType,
      sog: report?.Sog ?? null,
      cog: report?.Cog ?? null,
      heading: report?.TrueHeading ?? null,
      nav_status:
        navCode != null ? NAV_STATUS[navCode] ?? `Status ${navCode}` : null,
      draught: staticData?.MaximumStaticDraught ?? null,
      destination: staticData?.Destination?.trim() || null,
      eta: etaStr,
      military: shipType === 35,
    },
  };
}
