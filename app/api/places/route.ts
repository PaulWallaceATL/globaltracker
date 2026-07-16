import { NextRequest, NextResponse } from "next/server";
import { getSeedPlaces, resolvePlace } from "@/lib/graph/places";
import { getGraphState } from "@/lib/graph/memory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const supabase = createSupabaseServerClient();
  if (supabase) {
    try {
      if (id) {
        const { data } = await supabase
          .from("places")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          return NextResponse.json({
            place: {
              id: data.id,
              kind: data.kind,
              name: data.name,
              slug: data.slug,
              iso2: data.iso2,
              iso3: data.iso3,
              lat: data.lat,
              lng: data.lng,
              population: data.population,
              bbox:
                data.min_lat != null
                  ? {
                      minLat: data.min_lat,
                      maxLat: data.max_lat,
                      minLng: data.min_lng,
                      maxLng: data.max_lng,
                    }
                  : null,
            },
            meta: { source: "supabase" },
          });
        }
      }
      if (q) {
        const { data } = await supabase
          .from("places")
          .select("*")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .limit(20);
        if (data?.length) {
          return NextResponse.json({
            places: data.map((p) => ({
              id: p.id,
              kind: p.kind,
              name: p.name,
              slug: p.slug,
              iso2: p.iso2,
              lat: p.lat,
              lng: p.lng,
              population: p.population,
            })),
            meta: { source: "supabase" },
          });
        }
      }
    } catch {
      /* seed fallback */
    }
  }

  const state = getGraphState();
  const places = state.places.length ? state.places : getSeedPlaces();

  if (id) {
    const place = places.find((p) => p.id === id) ?? null;
    return NextResponse.json({ place, meta: { source: "seed" } });
  }

  if (q) {
    const exact = resolvePlace(q, places);
    const matches = places.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.slug.includes(q.toLowerCase()),
    );
    return NextResponse.json({
      places: exact ? [exact, ...matches.filter((p) => p.id !== exact.id)] : matches,
      meta: { source: "seed" },
    });
  }

  return NextResponse.json({
    places: places.filter((p) => p.kind === "country").slice(0, 40),
    meta: { source: "seed", count: places.length },
  });
}
