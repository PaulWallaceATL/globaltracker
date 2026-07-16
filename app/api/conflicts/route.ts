import { getAcledAccessToken } from "@/lib/acled-auth";
import { hasAcledAuth } from "@/lib/env";
import { resolveCountry } from "@/lib/geo/countries";
import { normalizeAcled } from "@/lib/normalize/acled";
import { normalizeGdelt } from "@/lib/normalize/gdelt";
import {
  dedupeEvents,
  fetchJsonSafe,
  filterEventsByQuery,
  jsonOk,
} from "@/lib/api-utils";
import type { TrackerEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const countryParam = searchParams.get("country");
  const limit = Math.min(Number(searchParams.get("limit") ?? 200) || 200, 500);

  const country =
    resolveCountry(countryParam ?? "") ??
    resolveCountry(q ?? "");

  const queryText = q?.trim() || country?.name || "conflict";

  const acledP = hasAcledAuth()
    ? getAcledAccessToken().then((token) =>
        token
          ? fetchAcled(token, country?.name, queryText, limit)
          : Promise.resolve([] as TrackerEvent[]),
      )
    : Promise.resolve([] as TrackerEvent[]);

  const gdeltP = fetchGdelt(
    queryText,
    country?.lat,
    country?.lng,
    limit,
  );

  const [acledEvents, gdeltEvents] = await Promise.all([acledP, gdeltP]);
  const events = [...acledEvents, ...gdeltEvents];

  let merged = dedupeEvents(events, limit);
  merged = filterEventsByQuery(merged, q && !country ? q : null);

  const hasAcled = merged.some((e) => e.source === "acled");
  return jsonOk({
    events: merged,
    meta: {
      country: country?.iso2 ?? null,
      count: merged.length,
      acled: hasAcled,
      sources: ["acled", "gdelt"].filter((s) =>
        s === "acled" ? hasAcled : gdeltEvents.length > 0,
      ),
    },
  });
}

async function fetchAcled(
  accessToken: string,
  countryName: string | undefined,
  queryText: string,
  limit: number,
): Promise<TrackerEvent[]> {
  const params = new URLSearchParams({
    _format: "json",
    limit: String(Math.min(limit, 100)),
    fields:
      "event_id_cnty|latitude|longitude|notes|event_type|sub_event_type|event_date|country|source",
  });

  if (countryName) {
    params.set("country", countryName);
  } else {
    params.set("notes", queryText);
  }

  const end = new Date();
  const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  params.set("event_date", `${formatDate(start)}|${formatDate(end)}`);
  params.set("event_date_where", "BETWEEN");

  try {
    const res = await fetch(
      `https://acleddata.com/api/acled/read?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      console.warn(
        `[globaltracker] ACLED read failed: ${res.status} ${await res.text()}`,
      );
      return [];
    }

    const data = (await res.json()) as { data?: unknown[]; status?: number };
    if (!data?.data || !Array.isArray(data.data)) return [];
    return normalizeAcled(data.data as Parameters<typeof normalizeAcled>[0]);
  } catch (err) {
    console.warn("[globaltracker] ACLED fetch error", err);
    return [];
  }
}

async function fetchGdelt(
  queryText: string,
  fallbackLat?: number,
  fallbackLng?: number,
  limit = 100,
): Promise<TrackerEvent[]> {
  const query = encodeURIComponent(queryText);
  const jsonUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=${Math.min(limit, 75)}&format=json&sort=DateDesc`;

  try {
    const json = await fetchJsonSafe<{
      articles?: Parameters<typeof normalizeGdelt>[0];
    }>(jsonUrl, undefined, 5000);

    if (json?.articles?.length) {
      return normalizeGdelt(json.articles, fallbackLat, fallbackLng);
    }
  } catch {
    /* fall through — skip slow CSV retry */
  }

  return [];
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
