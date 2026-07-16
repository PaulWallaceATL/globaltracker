import type { EventType, TrackerEvent } from "../types";

export interface EventCluster {
  id: string;
  lat: number;
  lng: number;
  events: TrackerEvent[];
  primaryType: EventType;
}

/**
 * Cluster events that sit too close to separate on the globe.
 * mergeDeg scales with zoom: wider when zoomed out, tighter when focused.
 */
export function clusterEvents(
  events: TrackerEvent[],
  mergeDeg = 1.4,
): EventCluster[] {
  if (events.length === 0) return [];

  type Bucket = { lat: number; lng: number; events: TrackerEvent[] };
  const buckets: Bucket[] = [];

  for (const event of events) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < buckets.length; i++) {
      const d = angularDistanceDeg(
        event.lat,
        event.lng,
        buckets[i].lat,
        buckets[i].lng,
      );
      if (d <= mergeDeg && d < bestDist) {
        bestIdx = i;
        bestDist = d;
      }
    }

    if (bestIdx >= 0) {
      const bucket = buckets[bestIdx];
      bucket.events.push(event);
      const n = bucket.events.length;
      bucket.lat += (event.lat - bucket.lat) / n;
      bucket.lng += (event.lng - bucket.lng) / n;
    } else {
      buckets.push({ lat: event.lat, lng: event.lng, events: [event] });
    }
  }

  // Second pass: merge bucket centroids that still sit within range
  let merged = true;
  while (merged && buckets.length > 1) {
    merged = false;
    for (let i = 0; i < buckets.length; i++) {
      for (let j = i + 1; j < buckets.length; j++) {
        const d = angularDistanceDeg(
          buckets[i].lat,
          buckets[i].lng,
          buckets[j].lat,
          buckets[j].lng,
        );
        if (d > mergeDeg) continue;

        const a = buckets[i];
        const b = buckets[j];
        const combined = [...a.events, ...b.events];
        const lat =
          combined.reduce((s, e) => s + e.lat, 0) / combined.length;
        const lng =
          combined.reduce((s, e) => s + e.lng, 0) / combined.length;
        buckets[i] = { lat, lng, events: combined };
        buckets.splice(j, 1);
        merged = true;
        break;
      }
      if (merged) break;
    }
  }

  return buckets.map((bucket, index) => ({
    id: `cluster-${index}-${bucket.events[0]?.id ?? "x"}`,
    lat: bucket.lat,
    lng: bucket.lng,
    events: [...bucket.events].sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    ),
    primaryType: majorityType(bucket.events),
  }));
}

/** Approximate great-circle distance in degrees (good enough for clustering). */
function angularDistanceDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos(midLat);
  return Math.hypot(dLat, dLng);
}

function majorityType(events: TrackerEvent[]): EventType {
  const counts: Partial<Record<EventType, number>> = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  let best: EventType = events[0]?.type ?? "conflict";
  let bestN = 0;
  for (const [type, n] of Object.entries(counts) as [EventType, number][]) {
    if (n > bestN) {
      best = type;
      bestN = n;
    }
  }
  return best;
}

/** Map camera zoom (approx 0.5–4.5) to cluster merge degrees.
 * Higher merge = more stacking. Deep zoom → near-zero so pins separate. */
export function mergeDegForZoom(zoom: number): number {
  if (zoom >= 3.6) return 0.05;
  if (zoom >= 3.1) return 0.12;
  if (zoom >= 2.6) return 0.28;
  if (zoom >= 2.2) return 0.55;
  if (zoom >= 1.8) return 0.9;
  if (zoom >= 1.4) return 1.5;
  if (zoom >= 1.1) return 2.2;
  return 3.2;
}
