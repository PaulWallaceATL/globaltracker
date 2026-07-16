import { NextRequest, NextResponse } from "next/server";
import { getSeedPlaces } from "@/lib/graph/places";
import type { PopulationPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Population layer from seeded place populations (WorldPop-style proxy). */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const radiusKm = Number(req.nextUrl.searchParams.get("radiusKm") ?? "800");

  const places = getSeedPlaces().filter((p) => p.population);

  let points: PopulationPoint[] = places.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    population: p.population!,
    label: p.name,
  }));

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    points = points
      .map((p) => ({
        ...p,
        d: haversineKm(lat, lng, p.lat, p.lng),
      }))
      .filter((p) => p.d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .map(({ d: _d, ...rest }) => rest);
  }

  const near = Number.isFinite(lat)
    ? points.reduce((s, p) => s + p.population, 0)
    : null;

  return NextResponse.json({
    points,
    nearPopulation: near,
    meta: { source: "place-catalog", note: "UN/World Bank style country-city estimates" },
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
