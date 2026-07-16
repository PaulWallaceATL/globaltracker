"use client";

import { useMemo } from "react";
import { Billboard } from "@react-three/drei";
import { DoubleSide } from "three";
import { latLngToVector3 } from "@/lib/geo/coords";
import { useTrackerStore } from "@/store/tracker-store";

const RADIUS = 1.036;

/** Soft population heat discs — not thousands of pins. */
export function PopulationHeat() {
  const layers = useTrackerStore((s) => s.layers);
  const points = useTrackerStore((s) => s.populationPoints);

  const discs = useMemo(() => {
    if (!layers.population || points.length === 0) return [];
    const max = Math.max(...points.map((p) => p.population), 1);
    return points.map((p) => {
      const t = Math.sqrt(p.population / max);
      return {
        id: p.id,
        pos: latLngToVector3(p.lat, p.lng, RADIUS),
        size: 0.012 + t * 0.035,
        opacity: 0.08 + t * 0.18,
      };
    });
  }, [layers.population, points]);

  if (!discs.length) return null;

  return (
    <group>
      {discs.map((d) => (
        <Billboard key={d.id} position={d.pos} follow>
          <mesh>
            <circleGeometry args={[d.size, 32]} />
            <meshBasicMaterial
              color="#c084fc"
              transparent
              opacity={d.opacity}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      ))}
    </group>
  );
}
