import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getGraphState, ingestIntoGraph } from "@/lib/graph/memory";
import type { NewsArticle, TrackerEvent } from "@/lib/types";

/** Persist graph to Supabase when configured; always update memory cache. */
export async function persistIngest(input: {
  events: TrackerEvent[];
  news?: NewsArticle[];
}) {
  const state = ingestIntoGraph(input);
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { persisted: false as const, state };
  }

  try {
    if (state.places.length) {
      await admin.from("places").upsert(
        state.places.map((p) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          slug: p.slug,
          iso2: p.iso2 ?? null,
          iso3: p.iso3 ?? null,
          lat: p.lat,
          lng: p.lng,
          min_lat: p.bbox?.minLat ?? null,
          max_lat: p.bbox?.maxLat ?? null,
          min_lng: p.bbox?.minLng ?? null,
          max_lng: p.bbox?.maxLng ?? null,
          population: p.population ?? null,
          meta: p.meta ?? {},
        })),
        { onConflict: "id" },
      );
    }

    if (state.topics.length) {
      await admin.from("topics").upsert(
        state.topics.map((t) => ({
          id: t.id,
          slug: t.slug,
          label: t.label,
          description: t.description ?? null,
          keywords: t.keywords,
        })),
        { onConflict: "id" },
      );
    }

    const eventRows = input.events.slice(0, 400).map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      timestamp: e.timestamp,
      source: e.source,
      lat: e.lat,
      lng: e.lng,
      news_links: e.news_links,
      meta: e.meta ?? {},
      severity: e.severity ?? 2,
      updated_at: new Date().toISOString(),
    }));
    if (eventRows.length) {
      await admin.from("events").upsert(eventRows, { onConflict: "id" });
    }

    for (const e of state.events.slice(0, 400)) {
      if (e.placeIds?.length) {
        await admin.from("event_places").upsert(
          e.placeIds.map((place_id) => ({ event_id: e.id, place_id })),
          { onConflict: "event_id,place_id" },
        );
      }
      if (e.topicIds?.length) {
        await admin.from("event_topics").upsert(
          e.topicIds.map((topic_id) => ({ event_id: e.id, topic_id })),
          { onConflict: "event_id,topic_id" },
        );
      }
    }

    if (input.news?.length) {
      await admin.from("media_items").upsert(
        input.news.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source,
          published_at: a.publishedAt,
          image_url: a.imageUrl ?? null,
        })),
        { onConflict: "id" },
      );
    }

    if (state.situations.length) {
      await admin.from("situations").upsert(
        state.situations.map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary,
          severity: s.severity,
          status: s.status,
          centroid_lat: s.centroid.lat,
          centroid_lng: s.centroid.lng,
          min_lat: s.bbox?.minLat ?? null,
          max_lat: s.bbox?.maxLat ?? null,
          min_lng: s.bbox?.minLng ?? null,
          max_lng: s.bbox?.maxLng ?? null,
          place_id: s.placeId ?? null,
          briefs: s.briefs,
          metrics: s.metrics,
          published: true,
          updated_at: s.updatedAt ?? new Date().toISOString(),
        })),
        { onConflict: "id" },
      );

      for (const s of state.situations) {
        if (s.eventIds?.length) {
          await admin.from("situation_events").upsert(
            s.eventIds.map((event_id) => ({
              situation_id: s.id,
              event_id,
            })),
            { onConflict: "situation_id,event_id" },
          );
        }
        if (s.topicIds?.length) {
          await admin.from("situation_topics").upsert(
            s.topicIds.map((topic_id) => ({
              situation_id: s.id,
              topic_id,
            })),
            { onConflict: "situation_id,topic_id" },
          );
        }
      }
    }

    return { persisted: true as const, state };
  } catch (err) {
    console.error("[ingest] supabase persist failed", err);
    return { persisted: false as const, state, error: String(err) };
  }
}

export function readGraphSnapshot() {
  return getGraphState();
}
