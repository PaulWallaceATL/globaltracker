import { NextRequest, NextResponse } from "next/server";
import { getGraphState } from "@/lib/graph/memory";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Situation } from "@/lib/types";

export const dynamic = "force-dynamic";

function rowToSituation(row: Record<string, unknown>): Situation {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    severity: Number(row.severity) || 2,
    status: (row.status as Situation["status"]) ?? "monitoring",
    centroid: {
      lat: Number(row.centroid_lat),
      lng: Number(row.centroid_lng),
    },
    bbox:
      row.min_lat != null
        ? {
            minLat: Number(row.min_lat),
            maxLat: Number(row.max_lat),
            minLng: Number(row.min_lng),
            maxLng: Number(row.max_lng),
          }
        : null,
    placeId: (row.place_id as string) ?? null,
    briefs: (row.briefs as Situation["briefs"]) ?? {
      public: { headline: "", body: "", bullets: [] },
      civic: { headline: "", body: "", bullets: [] },
      government: { headline: "", body: "", bullets: [] },
      business: { headline: "", body: "", bullets: [] },
    },
    metrics: (row.metrics as Situation["metrics"]) ?? {},
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const limit = Math.min(
    50,
    Number(req.nextUrl.searchParams.get("limit") ?? "20") || 20,
  );

  const supabase = createSupabaseServerClient();
  if (supabase) {
    try {
      if (id) {
        const { data } = await supabase
          .from("situations")
          .select("*")
          .eq("id", id)
          .eq("published", true)
          .maybeSingle();
        if (data) {
          return NextResponse.json({
            situation: rowToSituation(data),
            meta: { source: "supabase" },
          });
        }
      } else {
        const { data } = await supabase
          .from("situations")
          .select("*")
          .eq("published", true)
          .order("severity", { ascending: false })
          .limit(limit);
        if (data?.length) {
          return NextResponse.json({
            situations: data.map(rowToSituation),
            meta: { source: "supabase", count: data.length },
          });
        }
      }
    } catch {
      /* memory fallback */
    }
  }

  const state = getGraphState();
  if (id) {
    const situation = state.situations.find((s) => s.id === id) ?? null;
    return NextResponse.json({
      situation,
      meta: { source: "memory" },
    });
  }

  return NextResponse.json({
    situations: state.situations.slice(0, limit),
    meta: { source: "memory", count: state.situations.length },
  });
}
