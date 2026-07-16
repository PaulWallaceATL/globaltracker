/**
 * In-memory graph cache used when Supabase is not configured,
 * and as a hot cache after ingest.
 */
import {
  buildSituations,
  enrichEvents,
  newsToMedia,
} from "@/lib/graph";
import { getSeedPlaces } from "@/lib/graph/places";
import { TOPIC_CATALOG } from "@/lib/graph/topics";
import type {
  MediaItem,
  NewsArticle,
  Place,
  Situation,
  Topic,
  TrackerEvent,
} from "@/lib/types";

interface GraphState {
  places: Place[];
  topics: Topic[];
  events: TrackerEvent[];
  media: MediaItem[];
  situations: Situation[];
  updatedAt: string | null;
}

const globalForGraph = globalThis as unknown as {
  __gtGraph?: GraphState;
};

function emptyState(): GraphState {
  return {
    places: getSeedPlaces(),
    topics: TOPIC_CATALOG,
    events: [],
    media: [],
    situations: [],
    updatedAt: null,
  };
}

export function getGraphState(): GraphState {
  if (!globalForGraph.__gtGraph) {
    globalForGraph.__gtGraph = emptyState();
  }
  return globalForGraph.__gtGraph;
}

export function resetGraphState() {
  globalForGraph.__gtGraph = emptyState();
}

export function ingestIntoGraph(input: {
  events: TrackerEvent[];
  news?: NewsArticle[];
}): GraphState {
  const state = getGraphState();
  const enriched = enrichEvents(input.events);
  const byId = new Map(state.events.map((e) => [e.id, e]));
  for (const e of enriched) byId.set(e.id, e);
  state.events = [...byId.values()];

  if (input.news?.length) {
    const media = newsToMedia(input.news);
    const mediaById = new Map(state.media.map((m) => [m.id, m]));
    for (const m of media) mediaById.set(m.id, m);
    state.media = [...mediaById.values()];
  }

  state.situations = buildSituations({
    events: state.events,
    news: input.news,
    places: state.places,
  });
  state.updatedAt = new Date().toISOString();
  return state;
}

export function mergePulseEvents(events: TrackerEvent[]): GraphState {
  return ingestIntoGraph({ events });
}
