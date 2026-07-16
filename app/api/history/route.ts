import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const memoryHistory = new Map<
  string,
  Array<{
    id: string;
    device_id: string;
    entity_type: string;
    entity_id: string;
    viewed_at: string;
  }>
>();

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId")?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (admin) {
    try {
      const { data } = await admin
        .from("view_history")
        .select("*")
        .eq("device_id", deviceId)
        .order("viewed_at", { ascending: false })
        .limit(40);
      if (data) {
        return NextResponse.json({ history: data, meta: { source: "supabase" } });
      }
    } catch {
      /* memory */
    }
  }

  return NextResponse.json({
    history: memoryHistory.get(deviceId) ?? [],
    meta: { source: "memory" },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    deviceId: string;
    entityType: string;
    entityId: string;
  };
  if (!body.deviceId || !body.entityType || !body.entityId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const row = {
    id: crypto.randomUUID(),
    device_id: body.deviceId,
    entity_type: body.entityType,
    entity_id: body.entityId,
    viewed_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdmin();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("view_history")
        .insert({
          device_id: row.device_id,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
        })
        .select()
        .maybeSingle();
      if (!error) {
        return NextResponse.json({
          entry: data ?? row,
          meta: { source: "supabase" },
        });
      }
    } catch {
      /* memory */
    }
  }

  const list = memoryHistory.get(body.deviceId) ?? [];
  list.unshift(row);
  memoryHistory.set(body.deviceId, list.slice(0, 40));
  return NextResponse.json({ entry: row, meta: { source: "memory" } });
}
