import { NextRequest, NextResponse } from "next/server";
import { relatedForEntity, searchGraph } from "@/lib/graph";
import { getGraphState } from "@/lib/graph/memory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    40,
    Number(req.nextUrl.searchParams.get("limit") ?? "20") || 20,
  );

  if (!q) {
    return NextResponse.json({ hits: [], meta: { q: "", source: "empty" } });
  }

  const supabase = createSupabaseServerClient();
  if (supabase) {
    try {
      const [situationsRes, placesRes, topicsRes, eventsRes] =
        await Promise.all([
          supabase
            .from("situations")
            .select("id,title,summary,centroid_lat,centroid_lng,severity")
            .eq("published", true)
            .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
            .limit(limit),
          supabase
            .from("places")
            .select("id,name,kind,lat,lng,slug")
            .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
            .limit(limit),
          supabase
            .from("topics")
            .select("id,label,slug,description")
            .or(`label.ilike.%${q}%,slug.ilike.%${q}%`)
            .limit(limit),
          supabase
            .from("events")
            .select("id,description,type,source,lat,lng")
            .ilike("description", `%${q}%`)
            .limit(limit),
        ]);

      const hits = [
        ...(situationsRes.data ?? []).map((s) => ({
          type: "situation" as const,
          id: s.id,
          label: s.title,
          subtitle: s.summary?.slice(0, 80),
          lat: s.centroid_lat,
          lng: s.centroid_lng,
          score: 8 + (s.severity ?? 0),
        })),
        ...(placesRes.data ?? []).map((p) => ({
          type: "place" as const,
          id: p.id,
          label: p.name,
          subtitle: p.kind,
          lat: p.lat,
          lng: p.lng,
          score: 9,
        })),
        ...(topicsRes.data ?? []).map((t) => ({
          type: "topic" as const,
          id: t.id,
          label: t.label,
          subtitle: t.description ?? undefined,
          score: 8,
        })),
        ...(eventsRes.data ?? []).map((e) => ({
          type: "event" as const,
          id: e.id,
          label: e.description.slice(0, 72),
          subtitle: `${e.type} · ${e.source}`,
          lat: e.lat,
          lng: e.lng,
          score: 4,
        })),
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (hits.length > 0) {
        return NextResponse.json({
          hits,
          meta: { q, source: "supabase", count: hits.length },
        });
      }
    } catch {
      /* fall through to memory */
    }
  }

  const state = getGraphState();
  const hits = searchGraph({
    q,
    situations: state.situations,
    events: state.events,
    places: state.places,
    topics: state.topics,
    media: state.media,
    limit,
  });

  return NextResponse.json({
    hits,
    meta: { q, source: "memory", count: hits.length },
  });
}

/** Related graph for circular navigation */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    type: "situation" | "place" | "topic" | "event" | "media";
    id: string;
  };
  if (!body?.type || !body?.id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }
  const state = getGraphState();
  const related = relatedForEntity({
    type: body.type,
    id: body.id,
    situations: state.situations,
    events: state.events,
    places: state.places,
    topics: state.topics,
    media: state.media,
  });
  return NextResponse.json({ related });
}
