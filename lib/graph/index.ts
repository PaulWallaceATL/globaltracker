import { buildLensBriefs } from "@/lib/lenses";
import { findPlacesNear, getSeedPlaces } from "@/lib/graph/places";
import { matchTopics, TOPIC_CATALOG } from "@/lib/graph/topics";
import type {
  EntityRef,
  MediaItem,
  NewsArticle,
  Place,
  RelatedGraph,
  SearchHit,
  Situation,
  Topic,
  TrackerEvent,
} from "@/lib/types";

function hashId(prefix: string, parts: string[]): string {
  const raw = parts.join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return `${prefix}-${Math.abs(h).toString(36)}`;
}

export function enrichEvent(
  event: TrackerEvent,
  places: Place[] = getSeedPlaces(),
): TrackerEvent {
  const topics = matchTopics(`${event.description} ${event.source}`);
  const nearby = findPlacesNear(event.lat, event.lng, places, 500).slice(0, 3);
  const severity =
    event.type === "conflict"
      ? 4
      : event.type === "thermal"
        ? 3
        : event.type === "traffic"
          ? 2
          : 2;
  return {
    ...event,
    topicIds: topics.map((t) => t.id),
    placeIds: nearby.map((p) => p.id),
    severity: event.severity ?? severity,
  };
}

export function enrichEvents(events: TrackerEvent[]): TrackerEvent[] {
  return events.map((e) => enrichEvent(e));
}

export function newsToMedia(articles: NewsArticle[]): MediaItem[] {
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    url: a.url,
    source: a.source,
    publishedAt: a.publishedAt,
    imageUrl: a.imageUrl,
  }));
}

/** Cluster enriched events into theater situations by nearest country place. */
export function buildSituations(input: {
  events: TrackerEvent[];
  news?: NewsArticle[];
  places?: Place[];
}): Situation[] {
  const places = input.places ?? getSeedPlaces();
  const enriched = enrichEvents(input.events);
  const byPlace = new Map<string, TrackerEvent[]>();

  for (const event of enriched) {
    const placeId =
      event.placeIds?.[0] ??
      findPlacesNear(event.lat, event.lng, places, 800)[0]?.id ??
      "place-global";
    const list = byPlace.get(placeId) ?? [];
    list.push(event);
    byPlace.set(placeId, list);
  }

  const situations: Situation[] = [];

  for (const [placeId, events] of byPlace) {
    if (events.length === 0) continue;
    const place =
      places.find((p) => p.id === placeId) ??
      ({
        id: placeId,
        kind: "region" as const,
        name: "Global",
        slug: "global",
        lat: events[0].lat,
        lng: events[0].lng,
        population: null,
      } satisfies Place);

    const topicIds = [
      ...new Set(events.flatMap((e) => e.topicIds ?? [])),
    ];
    const topicLabels = topicIds
      .map((id) => TOPIC_CATALOG.find((t) => t.id === id)?.label)
      .filter(Boolean) as string[];

    const conflictCount = events.filter((e) => e.type === "conflict").length;
    const thermalCount = events.filter((e) => e.type === "thermal").length;
    const aircraftCount = events.filter((e) => e.type === "aircraft").length;
    const shipCount = events.filter((e) => e.type === "ship").length;
    const trafficCount = events.filter((e) => e.type === "traffic").length;

    const severity = Math.min(
      5,
      Math.max(
        1,
        Math.round(
          events.reduce((s, e) => s + (e.severity ?? 2), 0) / events.length +
            (conflictCount > 5 ? 1 : 0),
        ),
      ),
    );

    const lat =
      events.reduce((s, e) => s + e.lat, 0) / events.length;
    const lng =
      events.reduce((s, e) => s + e.lng, 0) / events.length;

    const metrics = {
      conflictCount,
      thermalCount,
      aircraftCount,
      shipCount,
      trafficCount,
      populationNear: place.population ?? undefined,
      newsCount: input.news?.length ?? 0,
    };

    const title =
      topicLabels.length > 0
        ? `${place.name}: ${topicLabels.slice(0, 2).join(" · ")}`
        : `Activity in ${place.name}`;

    const summary = `${events.length} mapped signals near ${place.name}${
      topicLabels.length ? ` — ${topicLabels.join(", ")}` : ""
    }.`;

    const id = hashId("sit", [placeId, ...topicIds.slice(0, 3)]);

    situations.push({
      id,
      title,
      summary,
      severity,
      status: severity >= 4 ? "active" : "monitoring",
      centroid: { lat, lng },
      bbox: place.bbox ?? null,
      placeId: place.id,
      placeIds: [place.id],
      topicIds,
      eventIds: events.map((e) => e.id),
      mediaIds: (input.news ?? []).slice(0, 5).map((n) => n.id),
      briefs: buildLensBriefs({
        title,
        placeName: place.name,
        topicLabels,
        metrics,
        severity,
      }),
      metrics,
      updatedAt: new Date().toISOString(),
    });
  }

  return situations.sort((a, b) => b.severity - a.severity || b.eventIds!.length - a.eventIds!.length);
}

export function relatedForEntity(input: {
  type: "situation" | "place" | "topic" | "event" | "media";
  id: string;
  situations: Situation[];
  events: TrackerEvent[];
  places: Place[];
  topics: Topic[];
  media: MediaItem[];
}): RelatedGraph {
  const { situations, events, places, topics, media } = input;
  const empty: RelatedGraph = {
    places: [],
    topics: [],
    events: [],
    situations: [],
    media: [],
  };

  if (input.type === "situation") {
    const sit = situations.find((s) => s.id === input.id);
    if (!sit) return empty;
    return {
      places: places
        .filter((p) => sit.placeIds?.includes(p.id) || p.id === sit.placeId)
        .map(placeRef),
      topics: topics
        .filter((t) => sit.topicIds?.includes(t.id))
        .map(topicRef),
      events: events
        .filter((e) => sit.eventIds?.includes(e.id))
        .slice(0, 12)
        .map(eventRef),
      situations: situations
        .filter(
          (s) =>
            s.id !== sit.id &&
            (s.placeId === sit.placeId ||
              s.topicIds?.some((t) => sit.topicIds?.includes(t))),
        )
        .slice(0, 6)
        .map(situationRef),
      media: media
        .filter((m) => sit.mediaIds?.includes(m.id))
        .slice(0, 8)
        .map(mediaRef),
    };
  }

  if (input.type === "place") {
    const place = places.find((p) => p.id === input.id);
    if (!place) return empty;
    const nearEvents = events.filter((e) => e.placeIds?.includes(place.id));
    const sits = situations.filter(
      (s) => s.placeId === place.id || s.placeIds?.includes(place.id),
    );
    const topicIds = new Set(nearEvents.flatMap((e) => e.topicIds ?? []));
    return {
      places: places
        .filter((p) => p.id !== place.id && p.iso2 && p.iso2 === place.iso2)
        .slice(0, 4)
        .map(placeRef),
      topics: topics.filter((t) => topicIds.has(t.id)).map(topicRef),
      events: nearEvents.slice(0, 12).map(eventRef),
      situations: sits.slice(0, 8).map(situationRef),
      media: media.slice(0, 6).map(mediaRef),
    };
  }

  if (input.type === "topic") {
    const topic = topics.find((t) => t.id === input.id || t.slug === input.id);
    if (!topic) return empty;
    const topicEvents = events.filter((e) => e.topicIds?.includes(topic.id));
    const sits = situations.filter((s) => s.topicIds?.includes(topic.id));
    const placeIds = new Set(topicEvents.flatMap((e) => e.placeIds ?? []));
    return {
      places: places.filter((p) => placeIds.has(p.id)).slice(0, 8).map(placeRef),
      topics: topics.filter((t) => t.id !== topic.id).slice(0, 4).map(topicRef),
      events: topicEvents.slice(0, 12).map(eventRef),
      situations: sits.slice(0, 8).map(situationRef),
      media: media.slice(0, 6).map(mediaRef),
    };
  }

  if (input.type === "event") {
    const event = events.find((e) => e.id === input.id);
    if (!event) return empty;
    const sits = situations.filter((s) => s.eventIds?.includes(event.id));
    return {
      places: places
        .filter((p) => event.placeIds?.includes(p.id))
        .map(placeRef),
      topics: topics
        .filter((t) => event.topicIds?.includes(t.id))
        .map(topicRef),
      events: events
        .filter(
          (e) =>
            e.id !== event.id &&
            e.placeIds?.some((p) => event.placeIds?.includes(p)),
        )
        .slice(0, 8)
        .map(eventRef),
      situations: sits.slice(0, 6).map(situationRef),
      media: media
        .filter((m) =>
          event.news_links.some((u) => u === m.url),
        )
        .slice(0, 6)
        .map(mediaRef),
    };
  }

  // media
  const item = media.find((m) => m.id === input.id);
  if (!item) return empty;
  const linkedEvents = events.filter((e) => e.news_links.includes(item.url));
  return {
    places: places
      .filter((p) => linkedEvents.some((e) => e.placeIds?.includes(p.id)))
      .slice(0, 4)
      .map(placeRef),
    topics: topics
      .filter((t) => linkedEvents.some((e) => e.topicIds?.includes(t.id)))
      .slice(0, 4)
      .map(topicRef),
    events: linkedEvents.slice(0, 8).map(eventRef),
    situations: situations
      .filter((s) => s.mediaIds?.includes(item.id))
      .slice(0, 4)
      .map(situationRef),
    media: media.filter((m) => m.id !== item.id).slice(0, 4).map(mediaRef),
  };
}

export function searchGraph(input: {
  q: string;
  situations: Situation[];
  events: TrackerEvent[];
  places: Place[];
  topics: Topic[];
  media: MediaItem[];
  limit?: number;
}): SearchHit[] {
  const q = input.q.trim().toLowerCase();
  if (!q) return [];
  const limit = input.limit ?? 20;
  const hits: SearchHit[] = [];

  for (const s of input.situations) {
    const hay = `${s.title} ${s.summary}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "situation",
        id: s.id,
        label: s.title,
        subtitle: s.summary.slice(0, 80),
        lat: s.centroid.lat,
        lng: s.centroid.lng,
        score: hay.startsWith(q) ? 10 : 6 + s.severity,
      });
    }
  }

  for (const p of input.places) {
    const hay = `${p.name} ${p.slug} ${p.iso2 ?? ""}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "place",
        id: p.id,
        label: p.name,
        subtitle: p.kind,
        lat: p.lat,
        lng: p.lng,
        score: p.name.toLowerCase() === q ? 12 : 8,
      });
    }
  }

  for (const t of input.topics) {
    const hay = `${t.label} ${t.slug} ${t.keywords.join(" ")}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "topic",
        id: t.id,
        label: t.label,
        subtitle: t.description ?? undefined,
        score: t.slug === q ? 11 : 7,
      });
    }
  }

  for (const e of input.events) {
    const hay = `${e.description} ${e.source} ${e.type}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "event",
        id: e.id,
        label: e.description.slice(0, 72),
        subtitle: `${e.type} · ${e.source}`,
        lat: e.lat,
        lng: e.lng,
        score: 4,
      });
    }
  }

  for (const m of input.media) {
    const hay = `${m.title} ${m.description ?? ""}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "media",
        id: m.id,
        label: m.title.slice(0, 72),
        subtitle: m.source ?? undefined,
        score: 3,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function placeRef(p: Place): EntityRef {
  return { type: "place", id: p.id, label: p.name, subtitle: p.kind };
}
function topicRef(t: Topic): EntityRef {
  return { type: "topic", id: t.id, label: t.label };
}
function eventRef(e: TrackerEvent): EntityRef {
  return {
    type: "event",
    id: e.id,
    label: e.description.slice(0, 64),
    subtitle: e.type,
  };
}
function situationRef(s: Situation): EntityRef {
  return {
    type: "situation",
    id: s.id,
    label: s.title,
    subtitle: `Severity ${s.severity}`,
  };
}
function mediaRef(m: MediaItem): EntityRef {
  return {
    type: "media",
    id: m.id,
    label: m.title.slice(0, 64),
    subtitle: m.source ?? undefined,
  };
}
