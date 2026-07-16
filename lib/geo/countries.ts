import type { BBox, CountryInfo } from "../types";

const COUNTRIES: CountryInfo[] = [
  {
    name: "Sudan",
    iso2: "SD",
    iso3: "SDN",
    lat: 15.5,
    lng: 32.5,
    bbox: { minLat: 8.7, maxLat: 22.2, minLng: 21.8, maxLng: 38.6 },
  },
  {
    name: "Ukraine",
    iso2: "UA",
    iso3: "UKR",
    lat: 48.4,
    lng: 31.2,
    bbox: { minLat: 44.4, maxLat: 52.4, minLng: 22.1, maxLng: 40.2 },
  },
  {
    name: "Russia",
    iso2: "RU",
    iso3: "RUS",
    lat: 61.5,
    lng: 105.3,
    bbox: { minLat: 41.2, maxLat: 81.9, minLng: 19.6, maxLng: 180 },
  },
  {
    name: "Israel",
    iso2: "IL",
    iso3: "ISR",
    lat: 31.5,
    lng: 34.8,
    bbox: { minLat: 29.5, maxLat: 33.3, minLng: 34.3, maxLng: 35.9 },
  },
  {
    name: "Palestine",
    iso2: "PS",
    iso3: "PSE",
    lat: 31.95,
    lng: 35.23,
    bbox: { minLat: 31.2, maxLat: 32.55, minLng: 34.2, maxLng: 35.6 },
  },
  {
    name: "Gaza",
    iso2: "PS",
    iso3: "PSE",
    lat: 31.4,
    lng: 34.4,
    bbox: { minLat: 31.22, maxLat: 31.59, minLng: 34.22, maxLng: 34.57 },
  },
  {
    name: "Syria",
    iso2: "SY",
    iso3: "SYR",
    lat: 34.8,
    lng: 38.0,
    bbox: { minLat: 32.3, maxLat: 37.3, minLng: 35.7, maxLng: 42.4 },
  },
  {
    name: "Yemen",
    iso2: "YE",
    iso3: "YEM",
    lat: 15.55,
    lng: 48.5,
    bbox: { minLat: 12.1, maxLat: 19.0, minLng: 42.6, maxLng: 54.5 },
  },
  {
    name: "Iran",
    iso2: "IR",
    iso3: "IRN",
    lat: 32.4,
    lng: 53.7,
    bbox: { minLat: 25.1, maxLat: 39.8, minLng: 44.0, maxLng: 63.3 },
  },
  {
    name: "Iraq",
    iso2: "IQ",
    iso3: "IRQ",
    lat: 33.2,
    lng: 43.7,
    bbox: { minLat: 29.1, maxLat: 37.4, minLng: 38.8, maxLng: 48.6 },
  },
  {
    name: "Lebanon",
    iso2: "LB",
    iso3: "LBN",
    lat: 33.85,
    lng: 35.86,
    bbox: { minLat: 33.05, maxLat: 34.69, minLng: 35.1, maxLng: 36.6 },
  },
  {
    name: "Myanmar",
    iso2: "MM",
    iso3: "MMR",
    lat: 21.9,
    lng: 95.96,
    bbox: { minLat: 9.9, maxLat: 28.5, minLng: 92.2, maxLng: 101.2 },
  },
  {
    name: "Somalia",
    iso2: "SO",
    iso3: "SOM",
    lat: 5.15,
    lng: 46.2,
    bbox: { minLat: -1.7, maxLat: 12.0, minLng: 41.0, maxLng: 51.4 },
  },
  {
    name: "Ethiopia",
    iso2: "ET",
    iso3: "ETH",
    lat: 9.15,
    lng: 40.5,
    bbox: { minLat: 3.4, maxLat: 14.9, minLng: 33.0, maxLng: 48.0 },
  },
  {
    name: "Libya",
    iso2: "LY",
    iso3: "LBY",
    lat: 26.3,
    lng: 17.2,
    bbox: { minLat: 19.5, maxLat: 33.2, minLng: 9.4, maxLng: 25.2 },
  },
  {
    name: "United States",
    iso2: "US",
    iso3: "USA",
    lat: 39.8,
    lng: -98.5,
    bbox: { minLat: 24.5, maxLat: 49.4, minLng: -125.0, maxLng: -66.9 },
  },
  {
    name: "China",
    iso2: "CN",
    iso3: "CHN",
    lat: 35.86,
    lng: 104.2,
    bbox: { minLat: 18.2, maxLat: 53.6, minLng: 73.5, maxLng: 135.1 },
  },
  {
    name: "Taiwan",
    iso2: "TW",
    iso3: "TWN",
    lat: 23.7,
    lng: 121.0,
    bbox: { minLat: 21.9, maxLat: 25.3, minLng: 119.3, maxLng: 122.0 },
  },
  {
    name: "South Sudan",
    iso2: "SS",
    iso3: "SSD",
    lat: 6.88,
    lng: 31.3,
    bbox: { minLat: 3.5, maxLat: 12.2, minLng: 24.1, maxLng: 35.9 },
  },
  {
    name: "Egypt",
    iso2: "EG",
    iso3: "EGY",
    lat: 26.8,
    lng: 30.8,
    bbox: { minLat: 22.0, maxLat: 31.7, minLng: 24.7, maxLng: 36.9 },
  },
];

const ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  britain: "GB",
  "great britain": "GB",
  "united kingdom": "GB",
  burma: "MM",
  "gaza strip": "PS",
  palestine: "PS",
  "west bank": "PS",
};

export function resolveCountry(input: string): CountryInfo | null {
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const aliasIso = ALIASES[lower];
  if (aliasIso) {
    return COUNTRIES.find((c) => c.iso2 === aliasIso) ?? null;
  }

  const upper = raw.toUpperCase();
  const byCode = COUNTRIES.find(
    (c) => c.iso2 === upper || c.iso3 === upper,
  );
  if (byCode) return byCode;

  const byName = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().startsWith(lower) ||
      lower.includes(c.name.toLowerCase()),
  );
  return byName ?? null;
}

export function pointInBBox(lat: number, lng: number, bbox: BBox): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lng >= bbox.minLng &&
    lng <= bbox.maxLng
  );
}

export function bboxToLaminLomin(
  bbox: BBox,
): { lamin: number; lomin: number; lamax: number; lomax: number } {
  return {
    lamin: bbox.minLat,
    lomin: bbox.minLng,
    lamax: bbox.maxLat,
    lomax: bbox.maxLng,
  };
}

export function getAllCountries(): CountryInfo[] {
  return COUNTRIES;
}
