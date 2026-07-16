"use client";

import { useMemo, useState } from "react";
import { Billboard } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import { clusterEvents } from "@/lib/geo/cluster";
import { latLngToVector3 } from "@/lib/geo/coords";
import type { LayerVisibility, TrackerEvent } from "@/lib/types";
import { useTrackerStore } from "@/store/tracker-store";

const RADIUS = 1.034;

const COLORS = {
  conflict: "#e85d4c",
  thermal: "#f0a202",
  aircraft: "#5ec8e8",
  ship: "#7ddea3",
  traffic: "#fb923c",
  population: "#c084fc",
  weather: "#94a3b8",
  mixed: "#c4a35a",
} as const;

const SIZE = {
  single: 0.012,
  stack: 0.016,
  aircraftR: 0.007,
  aircraftH: 0.02,
  shipR: 0.006,
  shipH: 0.016,
} as const;

interface MarkersProps {
  events: TrackerEvent[];
  layers: LayerVisibility;
  selectedId: string | null;
  onSelect: (event: TrackerEvent) => void;
  onHover: (event: TrackerEvent | null) => void;
}

/** 3D pins only — tooltips live in ViewportLabels (screen-space HUD). */
export function Markers({
  events,
  layers,
  selectedId,
  onSelect,
  onHover,
}: MarkersProps) {
  const [hoverClusterId, setHoverClusterId] = useState<string | null>(null);
  const stackPanel = useTrackerStore((s) => s.stackPanel);
  const setStackPanel = useTrackerStore((s) => s.setStackPanel);
  const clusterMergeDeg = useTrackerStore((s) => s.clusterMergeDeg);
  const cameraZoom = useTrackerStore((s) => s.cameraZoom);

  const visible = useMemo(() => {
    return events.filter((e) => {
      if (e.type === "conflict") return layers.conflict;
      if (e.type === "thermal") return layers.thermal;
      if (e.type === "aircraft") return layers.aircraft;
      if (e.type === "ship") return layers.ship;
      if (e.type === "traffic") return layers.traffic;
      if (e.type === "weather") return layers.weather;
      if (e.type === "population") return layers.population;
      return false;
    });
  }, [events, layers]);

  const effectiveMerge = useMemo(() => {
    if (clusterMergeDeg <= 0.55) return clusterMergeDeg;
    const air = visible.filter((e) => e.type === "aircraft").length;
    const bump = air > 40 ? 1.1 : air > 20 ? 0.7 : air > 10 ? 0.35 : 0;
    return clusterMergeDeg + bump;
  }, [visible, clusterMergeDeg]);

  const clusters = useMemo(
    () => clusterEvents(visible, effectiveMerge),
    [visible, effectiveMerge],
  );

  const deep = cameraZoom >= 2.5;
  // Farther cameras need larger pins so they stay readable in prod / orbit view.
  const lod =
    cameraZoom < 1.1 ? 2.4 : cameraZoom < 1.6 ? 1.75 : cameraZoom < 2.2 ? 1.35 : 1;

  return (
    <group>
      {clusters.map((cluster) => {
        const pos = latLngToVector3(cluster.lat, cluster.lng, RADIUS);
        const n = cluster.events.length;
        const isMulti = n > 1;
        const isOpen = stackPanel?.id === cluster.id;
        const isHovered = hoverClusterId === cluster.id;
        const selectedHere = cluster.events.some((e) => e.id === selectedId);
        const mixed = new Set(cluster.events.map((e) => e.type)).size > 1;
        const color = mixed
          ? COLORS.mixed
          : cluster.primaryType in COLORS
            ? COLORS[cluster.primaryType as keyof typeof COLORS]
            : COLORS.mixed;
        const active = selectedHere || isOpen || isHovered;
        const stackR =
          SIZE.stack + Math.min(0.008, Math.log2(n + 1) * 0.0022);
        const scale = lod * (active ? 1.3 : deep && !isMulti ? 1.12 : 1);

        return (
          <Billboard key={cluster.id} position={pos} follow>
            <group
              onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
                // Touch uses tap→detail; hover tooltips are mouse-only.
                const pt = ev.nativeEvent.pointerType;
                if (pt && pt !== "mouse") return;
                document.body.style.cursor = "pointer";
                setHoverClusterId(cluster.id);
                onHover(cluster.events[0] ?? null);
              }}
              onPointerOut={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
                const pt = ev.nativeEvent.pointerType;
                if (pt && pt !== "mouse") return;
                document.body.style.cursor = "auto";
                setHoverClusterId(null);
                onHover(null);
              }}
              onClick={(ev: ThreeEvent<MouseEvent>) => {
                ev.stopPropagation();
                if (isMulti) {
                  setStackPanel(
                    isOpen
                      ? null
                      : {
                          id: cluster.id,
                          lat: cluster.lat,
                          lng: cluster.lng,
                          events: cluster.events,
                        },
                  );
                } else {
                  setStackPanel(null);
                  onSelect(cluster.events[0]);
                }
              }}
              scale={scale}
            >
              {/* Soft halo so pins read against bright land textures */}
              <mesh position={[0, 0, -0.0004]}>
                <circleGeometry
                  args={[isMulti ? stackR * 1.55 : SIZE.single * 1.7, 20]}
                />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={active ? 0.28 : 0.16}
                  depthWrite={false}
                  depthTest={false}
                  side={DoubleSide}
                />
              </mesh>
              {isMulti ? (
                <StackPin
                  radius={stackR}
                  color={color}
                  count={n}
                  active={active}
                />
              ) : cluster.primaryType === "aircraft" ? (
                <mesh rotation={[0, 0, Math.PI]} renderOrder={2}>
                  <coneGeometry
                    args={[SIZE.aircraftR, SIZE.aircraftH, 3]}
                  />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.92}
                    depthTest={false}
                    depthWrite={false}
                  />
                </mesh>
              ) : cluster.primaryType === "ship" ? (
                <mesh renderOrder={2}>
                  <capsuleGeometry
                    args={[SIZE.shipR, SIZE.shipH, 3, 6]}
                  />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.92}
                    depthTest={false}
                    depthWrite={false}
                  />
                </mesh>
              ) : (
                <mesh renderOrder={2}>
                  <circleGeometry args={[SIZE.single, 20]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.9}
                    depthTest={false}
                    depthWrite={false}
                    side={DoubleSide}
                  />
                </mesh>
              )}
            </group>
          </Billboard>
        );
      })}
    </group>
  );
}

function StackPin({
  radius,
  color,
  count,
  active,
}: {
  radius: number;
  color: string;
  count: number;
  active: boolean;
}) {
  const ringOuter = radius;
  const ringInner = radius * 0.72;
  return (
    <group>
      <mesh renderOrder={2}>
        <circleGeometry args={[ringOuter, 24]} />
        <meshBasicMaterial
          color="#070b12"
          transparent
          opacity={0.94}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.0008]} renderOrder={3}>
        <ringGeometry args={[ringInner, ringOuter, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 1 : 0.92}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.0012]} renderOrder={4}>
        <circleGeometry args={[ringInner * 0.45, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4 + Math.min(0.45, count * 0.03)}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
