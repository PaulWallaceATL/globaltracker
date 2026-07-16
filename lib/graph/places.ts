import { getAllCountries } from "@/lib/geo/countries";
import type { Place } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Seed places from the static country catalog (+ a few high-signal cities). */
export function getSeedPlaces(): Place[] {
  const countries: Place[] = getAllCountries().map((c) => ({
    id: `place-${c.iso2.toLowerCase()}`,
    kind: "country" as const,
    name: c.name,
    slug: slugify(c.name),
    iso2: c.iso2,
    iso3: c.iso3,
    lat: c.lat,
    lng: c.lng,
    bbox: c.bbox,
    population: estimateCountryPopulation(c.iso2),
  }));

  const cities: Place[] = [
    {
      id: "place-khartoum",
      kind: "city",
      name: "Khartoum",
      slug: "khartoum",
      iso2: "SD",
      lat: 15.5,
      lng: 32.56,
      population: 5800000,
      bbox: { minLat: 15.3, maxLat: 15.7, minLng: 32.3, maxLng: 32.8 },
    },
    {
      id: "place-kyiv",
      kind: "city",
      name: "Kyiv",
      slug: "kyiv",
      iso2: "UA",
      lat: 50.45,
      lng: 30.52,
      population: 2950000,
      bbox: { minLat: 50.2, maxLat: 50.6, minLng: 30.2, maxLng: 30.8 },
    },
    {
      id: "place-gaza-city",
      kind: "city",
      name: "Gaza City",
      slug: "gaza-city",
      iso2: "PS",
      lat: 31.5,
      lng: 34.47,
      population: 590000,
      bbox: { minLat: 31.45, maxLat: 31.55, minLng: 34.4, maxLng: 34.55 },
    },
    {
      id: "place-taipei",
      kind: "city",
      name: "Taipei",
      slug: "taipei",
      iso2: "TW",
      lat: 25.03,
      lng: 121.57,
      population: 2600000,
      bbox: { minLat: 24.9, maxLat: 25.2, minLng: 121.4, maxLng: 121.7 },
    },
    {
      id: "place-sanaa",
      kind: "city",
      name: "Sanaa",
      slug: "sanaa",
      iso2: "YE",
      lat: 15.37,
      lng: 44.19,
      population: 3000000,
      bbox: { minLat: 15.2, maxLat: 15.5, minLng: 44.0, maxLng: 44.4 },
    },
  ];

  return [...countries, ...cities];
}

const POP: Record<string, number> = {
  SD: 48000000,
  UA: 37000000,
  RU: 144000000,
  IL: 9700000,
  PS: 5400000,
  SY: 23000000,
  YE: 34000000,
  IR: 89000000,
  IQ: 44000000,
  LB: 5500000,
  MM: 54000000,
  SO: 18000000,
  ET: 126000000,
  LY: 7000000,
  US: 333000000,
  CN: 1412000000,
  TW: 23000000,
  SS: 11000000,
  EG: 110000000,
};

function estimateCountryPopulation(iso2: string): number | null {
  return POP[iso2] ?? null;
}

export function findPlacesNear(
  lat: number,
  lng: number,
  places: Place[] = getSeedPlaces(),
  maxKm = 400,
): Place[] {
  return places
    .map((p) => ({ place: p, d: haversineKm(lat, lng, p.lat, p.lng) }))
    .filter((x) => x.d <= maxKm)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.place);
}

export function resolvePlace(
  query: string,
  places: Place[] = getSeedPlaces(),
): Place | null {
  const lower = query.trim().toLowerCase();
  if (!lower) return null;
  return (
    places.find(
      (p) =>
        p.slug === lower ||
        p.name.toLowerCase() === lower ||
        p.iso2?.toLowerCase() === lower ||
        p.name.toLowerCase().startsWith(lower),
    ) ?? null
  );
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
