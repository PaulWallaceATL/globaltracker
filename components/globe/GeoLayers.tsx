"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  buildCountryBordersGeometry,
  buildGraticuleGeometry,
} from "@/lib/geo/graticule";

export function GeoLayers() {
  const graticule = useMemo(() => buildGraticuleGeometry(1.011, 15), []);
  const [borders, setBorders] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/geo/countries.geojson")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setBorders(buildCountryBordersGeometry(data, 1.013, 3));
      })
      .catch((err) => {
        console.warn("[globaltracker] Country borders failed to load", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      graticule.dispose();
      borders?.dispose();
    };
  }, [graticule, borders]);

  return (
    <group>
      <lineSegments geometry={graticule}>
        <lineBasicMaterial
          color="#6b7c90"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </lineSegments>
      {borders && (
        <lineSegments geometry={borders}>
          <lineBasicMaterial
            color="#8fa3b8"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
}
