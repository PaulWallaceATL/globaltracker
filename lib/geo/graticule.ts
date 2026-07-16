import * as THREE from "three";
import { latLngToVector3 } from "./coords";

/** Build a lat/lng graticule as a BufferGeometry on a sphere. */
export function buildGraticuleGeometry(
  radius = 1.012,
  step = 15,
): THREE.BufferGeometry {
  const positions: number[] = [];

  const pushSegment = (
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number,
  ) => {
    const a = latLngToVector3(aLat, aLng, radius);
    const b = latLngToVector3(bLat, bLng, radius);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  // Meridians
  for (let lng = -180; lng < 180; lng += step) {
    for (let lat = -90; lat < 90; lat += 2) {
      pushSegment(lat, lng, Math.min(lat + 2, 90), lng);
    }
  }

  // Parallels
  for (let lat = -75; lat <= 75; lat += step) {
    for (let lng = -180; lng < 180; lng += 2) {
      pushSegment(lat, lng, lat, Math.min(lng + 2, 180));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

type GeoJSONPosition = [number, number] | [number, number, number];
type GeoJSONPolygon = GeoJSONPosition[][];
type GeoJSONMultiPolygon = GeoJSONPosition[][][];

interface GeoJSONFeature {
  type: string;
  geometry?: {
    type: string;
    coordinates: GeoJSONPolygon | GeoJSONMultiPolygon;
  } | null;
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

/** Project country border rings onto the sphere as line segments. */
export function buildCountryBordersGeometry(
  collection: GeoJSONCollection,
  radius = 1.014,
  sampleEvery = 2,
): THREE.BufferGeometry {
  const positions: number[] = [];

  const addRing = (ring: GeoJSONPosition[]) => {
    if (ring.length < 2) return;
    for (let i = 0; i < ring.length - 1; i += sampleEvery) {
      const a = ring[i];
      const b = ring[Math.min(i + sampleEvery, ring.length - 1)];
      const av = latLngToVector3(a[1], a[0], radius);
      const bv = latLngToVector3(b[1], b[0], radius);
      positions.push(av.x, av.y, av.z, bv.x, bv.y, bv.z);
    }
  };

  for (const feature of collection.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      const polys = geom.coordinates as GeoJSONPolygon;
      for (const ring of polys) addRing(ring);
    } else if (geom.type === "MultiPolygon") {
      const multis = geom.coordinates as GeoJSONMultiPolygon;
      for (const poly of multis) {
        for (const ring of poly) addRing(ring);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}
