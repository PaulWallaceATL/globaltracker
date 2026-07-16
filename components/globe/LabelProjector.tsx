"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo/coords";
import { intelHeadline, intelSubtitle } from "@/lib/intel/format";
import type { TrackerEvent, ViewportLabel } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const RADIUS = 1.034;
const MAX_LABELS = 5;
const MIN_GAP_PX = 96;
const REPICK_MS = 450;

/** Safe inset so chips stay clear of search / news / layers / hud. */
function insets(w: number, h: number) {
  const narrow = w < 900;
  return {
    left: narrow ? 12 : 170,
    right: narrow ? 12 : 290,
    top: narrow ? 100 : 118,
    bottom: narrow ? 200 : 150,
  };
}

/**
 * Projects track lat/lng → stable screen-pixel HUD labels.
 * Sticky membership (repick ~2×/sec) so chips don't hop between aircraft.
 */
export function LabelProjector() {
  const { camera, size } = useThree();
  const stickyIds = useRef<string[]>([]);
  const lastPickAt = useRef(0);
  const lastZoomBand = useRef(0);
  const scratch = useRef(new THREE.Vector3());
  const lastPayload = useRef("");

  useFrame(() => {
    const state = useTrackerStore.getState();
    const zoom = state.cameraZoom;
    const setViewportLabels = state.setViewportLabels;

    if (zoom < 2.45) {
      if (state.viewportLabels.length > 0) setViewportLabels([]);
      stickyIds.current = [];
      lastPayload.current = "";
      return;
    }

    const layers = state.layers;
    const selectedId = state.selectedEvent?.id ?? null;
    const tracks = state.events.filter((e) => {
      if (e.type === "aircraft") return layers.aircraft;
      if (e.type === "ship") return layers.ship;
      return false;
    });

    const w = size.width;
    const h = size.height;
    const pad = insets(w, h);
    const camDir = camera.position.clone().normalize();
    const v = scratch.current;
    const now = performance.now();
    const zoomBand = zoom >= 3.2 ? 2 : zoom >= 2.7 ? 1 : 0;
    const forceRepick =
      stickyIds.current.length === 0 ||
      zoomBand !== lastZoomBand.current ||
      now - lastPickAt.current > REPICK_MS;

    type Cand = {
      event: TrackerEvent;
      x: number;
      y: number;
      facing: number;
    };

    const projectOne = (e: TrackerEvent): Cand | null => {
      const world = latLngToVector3(e.lat, e.lng, RADIUS);
      v.copy(world).normalize();
      const facing = camDir.dot(v);
      if (facing < 0.55) return null;

      v.copy(world).project(camera);
      if (v.z < -1 || v.z > 1) return null;

      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      if (
        x < pad.left ||
        x > w - pad.right ||
        y < pad.top ||
        y > h - pad.bottom
      ) {
        return null;
      }
      return { event: e, x, y, facing };
    };

    if (forceRepick) {
      lastZoomBand.current = zoomBand;
      lastPickAt.current = now;

      const candidates: Cand[] = [];
      for (const e of tracks) {
        const c = projectOne(e);
        if (c) candidates.push(c);
      }

      candidates.sort((a, b) => {
        const aSel = a.event.id === selectedId ? -2 : 0;
        const bSel = b.event.id === selectedId ? -2 : 0;
        return aSel - bSel || b.facing - a.facing;
      });

      const picked: Cand[] = [];
      for (const c of candidates) {
        if (picked.length >= MAX_LABELS) break;
        const ok = picked.every(
          (p) => Math.hypot(p.x - c.x, p.y - c.y) >= MIN_GAP_PX,
        );
        if (ok) picked.push(c);
      }

      // Prefer keeping previous sticky ids if still valid
      const prev = stickyIds.current;
      if (prev.length > 0) {
        const byId = new Map(candidates.map((c) => [c.event.id, c]));
        const kept: Cand[] = [];
        for (const id of prev) {
          const c = byId.get(id);
          if (!c) continue;
          const ok = kept.every(
            (p) => Math.hypot(p.x - c.x, p.y - c.y) >= MIN_GAP_PX,
          );
          if (ok) kept.push(c);
        }
        if (kept.length >= Math.min(3, picked.length)) {
          for (const c of picked) {
            if (kept.length >= MAX_LABELS) break;
            if (kept.some((k) => k.event.id === c.event.id)) continue;
            const ok = kept.every(
              (p) => Math.hypot(p.x - c.x, p.y - c.y) >= MIN_GAP_PX,
            );
            if (ok) kept.push(c);
          }
          stickyIds.current = kept.map((c) => c.event.id);
        } else {
          stickyIds.current = picked.map((c) => c.event.id);
        }
      } else {
        stickyIds.current = picked.map((c) => c.event.id);
      }
    }

    // Always refresh pixel positions for sticky set (+ selected if on screen)
    const idSet = new Set(stickyIds.current);
    if (selectedId) idSet.add(selectedId);

    const labels: ViewportLabel[] = [];
    for (const e of tracks) {
      if (!idSet.has(e.id)) continue;
      const c = projectOne(e);
      if (!c) continue;
      labels.push({
        eventId: e.id,
        x: Math.round(c.x),
        y: Math.round(c.y),
        kind: e.type === "ship" ? "ship" : "aircraft",
        title: intelHeadline(e),
        subtitle: intelSubtitle(e),
      });
    }

    // Deconflict after position update (selected wins)
    labels.sort((a, b) => {
      if (a.eventId === selectedId) return -1;
      if (b.eventId === selectedId) return 1;
      return 0;
    });
    const placed: ViewportLabel[] = [];
    for (const lab of labels) {
      const ok = placed.every(
        (p) => Math.hypot(p.x - lab.x, p.y - lab.y) >= MIN_GAP_PX,
      );
      if (!ok && lab.eventId !== selectedId) continue;
      placed.push(lab);
      if (placed.length >= MAX_LABELS) break;
    }

    const payload = placed
      .map((l) => `${l.eventId}:${l.x}:${l.y}`)
      .join("|");
    if (payload === lastPayload.current) return;
    lastPayload.current = payload;
    setViewportLabels(placed);
  });

  return null;
}
