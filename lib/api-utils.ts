import type { TrackerEvent } from "./types";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      ...init?.headers,
    },
  });
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

export function dedupeEvents(events: TrackerEvent[], limit?: number): TrackerEvent[] {
  const seen = new Set<string>();
  const out: TrackerEvent[] = [];

  for (const event of events) {
    const key = `${event.type}:${event.lat.toFixed(3)}:${event.lng.toFixed(3)}:${event.description.slice(0, 40)}`;
    if (seen.has(key) || seen.has(event.id)) continue;
    seen.add(key);
    seen.add(event.id);
    out.push(event);
    if (limit && out.length >= limit) break;
  }

  return out;
}

export function filterEventsByQuery(
  events: TrackerEvent[],
  q?: string | null,
): TrackerEvent[] {
  if (!q?.trim()) return events;
  const needle = q.trim().toLowerCase();
  return events.filter(
    (e) =>
      e.description.toLowerCase().includes(needle) ||
      e.source.toLowerCase().includes(needle) ||
      String(e.meta?.country ?? "")
        .toLowerCase()
        .includes(needle) ||
      String(e.meta?.callsign ?? "")
        .toLowerCase()
        .includes(needle),
  );
}

export async function fetchJsonSafe<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.warn(`[globaltracker] Fetch failed ${res.status}: ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[globaltracker] Fetch error: ${url}`, err);
    return null;
  }
}

export async function fetchTextSafe(
  url: string,
  init?: RequestInit,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(8000),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.warn(`[globaltracker] Fetch failed ${res.status}: ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[globaltracker] Fetch error: ${url}`, err);
    return null;
  }
}
