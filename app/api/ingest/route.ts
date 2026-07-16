import { persistIngest, readGraphSnapshot } from "@/lib/graph/persist";
import { getEnvKey } from "@/lib/env";
import type { NewsArticle, TrackerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Persist client-supplied live events only — never invent demo rows. */
export async function POST(req: Request) {
  const secret = getEnvKey("INGEST_SECRET");
  const header = req.headers.get("x-ingest-secret");
  if (secret && header !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    events?: TrackerEvent[];
    news?: NewsArticle[];
  };

  const events = (body.events ?? []).filter(
    (e) => e.source !== "demo" && e.source !== "pulse",
  );
  const news = (body.news ?? []).filter((a) => a.source !== "demo");

  if (events.length === 0 && news.length === 0) {
    const state = readGraphSnapshot();
    return Response.json({
      ok: true,
      persisted: false,
      counts: {
        events: state.events.length,
        situations: state.situations.length,
        media: state.media.length,
        places: state.places.length,
      },
      situations: state.situations.slice(0, 20),
      meta: { empty: true },
    });
  }

  const result = await persistIngest({ events, news });

  return Response.json({
    ok: true,
    persisted: result.persisted,
    counts: {
      events: result.state.events.length,
      situations: result.state.situations.length,
      media: result.state.media.length,
      places: result.state.places.length,
    },
    situations: result.state.situations.slice(0, 20),
    meta: {},
  });
}

/** Return current graph snapshot (from prior live ingest) — no synthetic pulse. */
export async function GET() {
  const state = readGraphSnapshot();
  return Response.json({
    events: state.events.slice(0, 120),
    situations: state.situations.slice(0, 20),
    news: state.media.slice(0, 10).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      url: m.url,
      source: m.source ?? "",
      publishedAt: m.publishedAt ?? "",
      imageUrl: m.imageUrl,
    })),
    meta: {
      source: "graph",
      updatedAt: state.updatedAt,
      count: state.events.length,
    },
  });
}
