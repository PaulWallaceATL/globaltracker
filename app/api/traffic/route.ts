import { NextRequest, NextResponse } from "next/server";
import { getEnvKey } from "@/lib/env";
import { resolveCountry } from "@/lib/geo/countries";
import type { TrackerEvent, TrafficIncident } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = resolveCountry(q);
  const lat = Number(
    req.nextUrl.searchParams.get("lat") ?? country?.lat ?? NaN,
  );
  const lng = Number(
    req.nextUrl.searchParams.get("lng") ?? country?.lng ?? NaN,
  );

  const tomtom = getEnvKey("TOMTOM_API_KEY");
  if (!tomtom) {
    return NextResponse.json({
      incidents: [],
      events: [] as TrackerEvent[],
      meta: { source: "tomtom", error: "TOMTOM_API_KEY not configured" },
    });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({
      incidents: [],
      events: [] as TrackerEvent[],
      meta: { source: "tomtom", error: "lat/lng required" },
    });
  }

  try {
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${tomtom}&bbox=${lng - 2},${lat - 2},${lng + 2},${lat + 2}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},from,to}}}&language=en-GB&timeValidityFilter=present`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({
        incidents: [],
        events: [] as TrackerEvent[],
        meta: { source: "tomtom", error: `HTTP ${res.status}` },
      });
    }

    const data = (await res.json()) as {
      incidents?: Array<{
        geometry?: { type?: string; coordinates?: unknown };
        properties?: {
          magnitudeOfDelay?: number;
          events?: Array<{ description?: string }>;
        };
      }>;
    };

    const incidents: TrafficIncident[] = (data.incidents ?? [])
      .slice(0, 40)
      .map((inc, i) => {
        const point = extractLonLat(inc.geometry?.coordinates, lng, lat);
        return {
          id: `tomtom-${i}-${point.lat.toFixed(3)}-${point.lng.toFixed(3)}`,
          lat: point.lat,
          lng: point.lng,
          description:
            inc.properties?.events?.[0]?.description ?? "Traffic incident",
          severity: Math.min(5, (inc.properties?.magnitudeOfDelay ?? 1) + 1),
          source: "TomTom",
          timestamp: new Date().toISOString(),
        };
      });

    return NextResponse.json({
      incidents,
      events: incidents.map(toEvent),
      meta: { source: "tomtom", count: incidents.length },
    });
  } catch (err) {
    return NextResponse.json({
      incidents: [],
      events: [] as TrackerEvent[],
      meta: {
        source: "tomtom",
        error: err instanceof Error ? err.message : "fetch failed",
      },
    });
  }
}

function extractLonLat(
  coords: unknown,
  fallbackLng: number,
  fallbackLat: number,
): { lng: number; lat: number } {
  if (!Array.isArray(coords)) {
    return { lng: fallbackLng, lat: fallbackLat };
  }
  // Point: [lon, lat]
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    return { lng: coords[0], lat: coords[1] };
  }
  // LineString / Multi*: dig for first numeric pair
  const flat = coords.flat(4) as unknown[];
  for (let i = 0; i < flat.length - 1; i++) {
    if (typeof flat[i] === "number" && typeof flat[i + 1] === "number") {
      return { lng: flat[i] as number, lat: flat[i + 1] as number };
    }
  }
  return { lng: fallbackLng, lat: fallbackLat };
}

function toEvent(inc: TrafficIncident): TrackerEvent {
  return {
    id: inc.id,
    lat: inc.lat,
    lng: inc.lng,
    type: "traffic",
    description: inc.description,
    timestamp: inc.timestamp,
    source: inc.source,
    news_links: [],
    severity: inc.severity,
    meta: { layer: "traffic" },
  };
}
