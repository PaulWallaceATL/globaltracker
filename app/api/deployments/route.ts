import { getEnvKey } from "@/lib/env";
import {
  bboxToLaminLomin,
  pointInBBox,
  resolveCountry,
} from "@/lib/geo/countries";
import { normalizeAdsb } from "@/lib/normalize/adsb";
import { normalizeAviationStack } from "@/lib/normalize/aviationstack";
import { normalizeFirmsCsv } from "@/lib/normalize/firms";
import { normalizeOpenSky } from "@/lib/normalize/opensky";
import {
  dedupeEvents,
  fetchJsonSafe,
  fetchTextSafe,
  jsonOk,
} from "@/lib/api-utils";
import type { BBox, TrackerEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const countryParam = searchParams.get("country");
  const limit = Math.min(Number(searchParams.get("limit") ?? 150) || 150, 300);

  const country =
    resolveCountry(countryParam ?? "") ??
    resolveCountry(q ?? "");

  const bbox: BBox =
    country?.bbox ??
    parseBBox(searchParams) ?? {
      minLat: -60,
      maxLat: 75,
      minLng: -180,
      maxLng: 180,
    };

  const [adsb, opensky, firms, aviation] = await Promise.all([
    fetchAdsb(bbox, limit),
    fetchOpenSky(bbox),
    fetchFirms(bbox),
    fetchAviationStack(bbox, limit),
  ]);

  const events = [...adsb, ...opensky, ...firms, ...aviation];

  let merged = dedupeEvents(events, limit);
  if (country) {
    merged = merged.filter((e) => pointInBBox(e.lat, e.lng, country.bbox));
  }

  return jsonOk({
    events: merged,
    meta: {
      country: country?.iso2 ?? null,
      count: merged.length,
      bbox,
      sources: {
        adsb: adsb.length,
        opensky: opensky.length,
        firms: firms.length,
        aviationstack: aviation.length,
      },
    },
  });
}

function parseBBox(params: URLSearchParams): BBox | null {
  if (
    !params.has("minLat") ||
    !params.has("maxLat") ||
    !params.has("minLng") ||
    !params.has("maxLng")
  ) {
    return null;
  }
  const minLat = Number(params.get("minLat"));
  const maxLat = Number(params.get("maxLat"));
  const minLng = Number(params.get("minLng"));
  const maxLng = Number(params.get("maxLng"));
  if (![minLat, maxLat, minLng, maxLng].every((n) => Number.isFinite(n))) {
    return null;
  }
  if (minLat >= maxLat || minLng >= maxLng) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/** Busy air corridors — used when the request bbox is planet-scale. */
const ADSB_HUBS: { lat: number; lng: number; distNm: number }[] = [
  { lat: 51.47, lng: -0.46, distNm: 180 }, // London
  { lat: 40.64, lng: -73.78, distNm: 180 }, // NYC
  { lat: 25.25, lng: 55.36, distNm: 200 }, // Dubai
  { lat: 35.55, lng: 139.78, distNm: 180 }, // Tokyo
  { lat: 50.03, lng: 8.57, distNm: 160 }, // Frankfurt
  { lat: 33.94, lng: -118.41, distNm: 180 }, // LAX
];

function isPlanetBBox(bbox: BBox): boolean {
  return (
    bbox.maxLat - bbox.minLat > 80 || bbox.maxLng - bbox.minLng > 160
  );
}

async function fetchAdsb(bbox: BBox, limit: number): Promise<TrackerEvent[]> {
  // World-scale bbox centers in empty ocean — sample busy hubs instead.
  if (isPlanetBBox(bbox)) {
    const batches = await Promise.all(
      ADSB_HUBS.map(async (hub) => {
        const url = `https://api.adsb.lol/v2/lat/${hub.lat}/lon/${hub.lng}/dist/${hub.distNm}`;
        const data = await fetchJsonSafe<{ ac?: unknown[] }>(
          url,
          undefined,
          10000,
        );
        if (!data) return [] as TrackerEvent[];
        return normalizeAdsb(data as Parameters<typeof normalizeAdsb>[0]);
      }),
    );
    return dedupeEvents(batches.flat(), Math.min(limit, 160));
  }

  const lat = (bbox.minLat + bbox.maxLat) / 2;
  const lng = (bbox.minLng + bbox.maxLng) / 2;
  const latSpan = Math.max(bbox.maxLat - bbox.minLat, 2);
  const distNm = Math.min(Math.max(latSpan * 60, 50), 250);

  const url = `https://api.adsb.lol/v2/lat/${lat.toFixed(4)}/lon/${lng.toFixed(4)}/dist/${Math.round(distNm)}`;
  const data = await fetchJsonSafe<{ ac?: unknown[] }>(url, undefined, 10000);
  if (!data) return [];

  return normalizeAdsb(data as Parameters<typeof normalizeAdsb>[0])
    .filter((e) => pointInBBox(e.lat, e.lng, bbox))
    .slice(0, Math.min(limit, 100));
}

async function fetchOpenSky(bbox: BBox): Promise<TrackerEvent[]> {
  // OpenSky often rate-limits / times out — skip planet queries; keep country short.
  if (isPlanetBBox(bbox)) return [];

  const { lamin, lomin, lamax, lomax } = bboxToLaminLomin(bbox);
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  const data = await fetchJsonSafe<{
    time?: number;
    states?: (string | number | boolean | null)[][] | null;
  }>(url, undefined, 4000);
  if (!data) return [];
  return normalizeOpenSky(data).slice(0, 100);
}

async function fetchFirms(bbox: BBox): Promise<TrackerEvent[]> {
  const mapKey = getEnvKey("NASA_FIRMS_MAP_KEY");
  if (!mapKey) return [];

  // VIIRS SNPP 24h world CSV, then filter by bbox
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}/1`;
  const csv = await fetchTextSafe(url);
  if (!csv || csv.startsWith("{") || csv.toLowerCase().includes("invalid")) {
    return [];
  }
  return normalizeFirmsCsv(csv).slice(0, 100);
}

/** Commercial flight enrichment when AVIATIONSTACK_API_KEY is set. */
async function fetchAviationStack(
  bbox: BBox,
  limit: number,
): Promise<TrackerEvent[]> {
  const key = getEnvKey("AVIATIONSTACK_API_KEY");
  if (!key) return [];

  // Free tier: active flights; many rows lack live coords — we filter those out
  const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(key)}&flight_status=active&limit=${Math.min(limit, 100)}`;
  const data = await fetchJsonSafe<{ data?: unknown[] }>(url, undefined, 8000);
  if (!data) return [];

  return normalizeAviationStack(
    data as Parameters<typeof normalizeAviationStack>[0],
  )
    .filter((e) => pointInBBox(e.lat, e.lng, bbox))
    .slice(0, Math.min(limit, 50));
}
