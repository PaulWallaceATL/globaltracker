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
  single: 0.0065,
  stack: 0.009,
  aircraftR: 0.004,
  aircraftH: 0.011,
  shipR: 0.0035,
  shipH: 0.009,
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
          SIZE.stack + Math.min(0.006, Math.log2(n + 1) * 0.0018);

        return (
          <Billboard key={cluster.id} position={pos} follow>
            <group
              onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
                document.body.style.cursor = "pointer";
                setHoverClusterId(cluster.id);
                onHover(cluster.events[0] ?? null);
              }}
              onPointerOut={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
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
              scale={active ? 1.25 : deep && !isMulti ? 1.12 : 1}
            >
              {isMulti ? (
                <StackPin
                  radius={stackR}
                  color={color}
                  count={n}
                  active={active}
                />
              ) : cluster.primaryType === "aircraft" ? (
                <mesh rotation={[0, 0, Math.PI]}>
                  <coneGeometry
                    args={[SIZE.aircraftR, SIZE.aircraftH, 3]}
                  />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.88}
                  />
                </mesh>
              ) : cluster.primaryType === "ship" ? (
                <mesh>
                  <capsuleGeometry
                    args={[SIZE.shipR, SIZE.shipH, 3, 6]}
                  />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.88}
                  />
                </mesh>
              ) : (
                <mesh>
                  <circleGeometry args={[SIZE.single, 16]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? 1 : 0.85}
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
      <mesh>
        <circleGeometry args={[ringOuter, 24]} />
        <meshBasicMaterial
          color="#070b12"
          transparent
          opacity={0.92}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.0008]}>
        <ringGeometry args={[ringInner, ringOuter, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 1 : 0.9}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.0012]}>
        <circleGeometry args={[ringInner * 0.45, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35 + Math.min(0.45, count * 0.03)}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
