import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const memoryBookmarks = new Map<
  string,
  Array<{
    id: string;
    device_id: string;
    entity_type: string;
    entity_id: string;
    label: string | null;
    created_at: string;
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
        .from("bookmarks")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        return NextResponse.json({ bookmarks: data, meta: { source: "supabase" } });
      }
    } catch {
      /* memory */
    }
  }

  return NextResponse.json({
    bookmarks: memoryBookmarks.get(deviceId) ?? [],
    meta: { source: "memory" },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    deviceId: string;
    entityType: string;
    entityId: string;
    label?: string;
  };
  if (!body.deviceId || !body.entityType || !body.entityId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const row = {
    id: crypto.randomUUID(),
    device_id: body.deviceId,
    entity_type: body.entityType,
    entity_id: body.entityId,
    label: body.label ?? null,
    created_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdmin();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("bookmarks")
        .upsert(
          {
            device_id: row.device_id,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            label: row.label,
          },
          { onConflict: "device_id,entity_type,entity_id" },
        )
        .select()
        .maybeSingle();
      if (!error) {
        return NextResponse.json({
          bookmark: data ?? row,
          meta: { source: "supabase" },
        });
      }
    } catch {
      /* memory */
    }
  }

  const list = memoryBookmarks.get(body.deviceId) ?? [];
  const filtered = list.filter(
    (b) =>
      !(
        b.entity_type === body.entityType && b.entity_id === body.entityId
      ),
  );
  filtered.unshift(row);
  memoryBookmarks.set(body.deviceId, filtered.slice(0, 50));
  return NextResponse.json({ bookmark: row, meta: { source: "memory" } });
}

export async function DELETE(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!deviceId || !entityType || !entityId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (admin) {
    try {
      await admin
        .from("bookmarks")
        .delete()
        .eq("device_id", deviceId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
    } catch {
      /* memory */
    }
  }

  const list = memoryBookmarks.get(deviceId) ?? [];
  memoryBookmarks.set(
    deviceId,
    list.filter(
      (b) => !(b.entity_type === entityType && b.entity_id === entityId),
    ),
  );
  return NextResponse.json({ ok: true });
}
