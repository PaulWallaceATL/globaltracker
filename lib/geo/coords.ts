import * as THREE from "three";

const DEG = Math.PI / 180;

/** Convert lat/lng to a point on a sphere of given radius (Y-up, Z toward 0°). */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/** Camera position looking at a lat/lng on the globe. */
export function latLngToCameraPosition(
  lat: number,
  lng: number,
  distance: number,
): THREE.Vector3 {
  return latLngToVector3(lat, lng, distance);
}
