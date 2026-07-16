import type { TrackerEvent } from "../types";

interface GdeltDoc {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  // GDELT DOC 2.0 ArtList sometimes includes lat/long via Tone/Location fields
  lat?: number | string;
  lon?: number | string;
  longitude?: number | string;
  latitude?: number | string;
}

function parseCoord(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeGdelt(
  docs: GdeltDoc[],
  fallbackLat?: number,
  fallbackLng?: number,
): TrackerEvent[] {
  const events: TrackerEvent[] = [];

  for (const doc of docs) {
    const lat =
      parseCoord(doc.lat) ??
      parseCoord(doc.latitude) ??
      (fallbackLat ?? null);
    const lng =
      parseCoord(doc.lon) ??
      parseCoord(doc.longitude) ??
      (fallbackLng ?? null);

    if (lat === null || lng === null) continue;

    const url = doc.url ?? "";
    const idBase = url || doc.title || `${lat}-${lng}-${doc.seendate}`;
    const seen = doc.seendate
      ? // GDELT seendate often YYYYMMDDTHHMMSSZ
        doc.seendate.includes("T")
        ? new Date(
            `${doc.seendate.slice(0, 4)}-${doc.seendate.slice(4, 6)}-${doc.seendate.slice(6, 8)}T${doc.seendate.slice(9, 11)}:${doc.seendate.slice(11, 13)}:${doc.seendate.slice(13, 15)}Z`,
          ).toISOString()
        : new Date(doc.seendate).toISOString()
      : new Date().toISOString();

    events.push({
      id: `gdelt-${hashId(idBase)}`,
      lat,
      lng,
      type: "conflict",
      description: doc.title?.trim() || "GDELT document event",
      timestamp: Number.isNaN(Date.parse(seen))
        ? new Date().toISOString()
        : seen,
      source: "gdelt",
      news_links: url ? [url] : [],
      meta: {
        domain: doc.domain ?? null,
        sourcecountry: doc.sourcecountry ?? null,
        language: doc.language ?? null,
      },
    });
  }

  return events;
}

/** Parse GDELT DOC CSV (header row + comma-separated values). */
export function parseGdeltCsv(csv: string): GdeltDoc[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const docs: GdeltDoc[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (!cols.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    docs.push({
      url: row.url || row.documentidentifier,
      title: row.title || row.sharingimage,
      seendate: row.seendate || row.date,
      domain: row.domain,
      language: row.language,
      sourcecountry: row.sourcecountry,
      lat: row.lat || row.latitude,
      lon: row.lon || row.longitude || row.long,
    });
  }

  return docs;
}

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
