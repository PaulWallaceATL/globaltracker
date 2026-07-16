/** Build a crisp equirectangular ops map from country polygons (no soft satellite blur). */

type GeoJSONPosition = [number, number] | [number, number, number];
type GeoJSONPolygon = GeoJSONPosition[][];
type GeoJSONMultiPolygon = GeoJSONPosition[][][];

interface GeoJSONFeature {
  type: string;
  properties?: Record<string, unknown> | null;
  geometry?: {
    type: string;
    coordinates: GeoJSONPolygon | GeoJSONMultiPolygon;
  } | null;
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

const OCEAN = "#0b121c";
const LAND_A = "#1a2433";
const LAND_B = "#1e2a3a";
const LAND_C = "#162030";
const BORDER = "#4a5d73";
const COAST = "#2a3a4d";

function project(
  lng: number,
  lat: number,
  width: number,
  height: number,
): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function landFill(feature: GeoJSONFeature): string {
  const name = String(
    feature.properties?.admin ??
      feature.properties?.name ??
      feature.properties?.sovereignt ??
      "",
  );
  const n = hashName(name) % 3;
  return n === 0 ? LAND_A : n === 1 ? LAND_B : LAND_C;
}

function pathRings(
  ctx: CanvasRenderingContext2D,
  rings: GeoJSONPosition[][],
  width: number,
  height: number,
) {
  for (const ring of rings) {
    if (ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const [x, y] = project(lng, lat, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

function forEachPolygon(
  feature: GeoJSONFeature,
  fn: (rings: GeoJSONPosition[][]) => void,
) {
  const g = feature.geometry;
  if (!g) return;
  if (g.type === "Polygon") {
    fn(g.coordinates as GeoJSONPolygon);
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates as GeoJSONMultiPolygon) fn(poly);
  }
}

/**
 * Rasterize country GeoJSON into a sharp canvas texture for the globe.
 * Hard fills + thin borders stay readable when zoomed; no photographic blur.
 */
export function buildOpsMapCanvas(
  collection: GeoJSONCollection,
  width = 8192,
  height = 4096,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return canvas;

  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, width, height);

  // Subtle equator / tropics reference — very faint, no color noise
  ctx.strokeStyle = "#121a26";
  ctx.lineWidth = 1;
  for (const lat of [-60, -30, 0, 30, 60]) {
    const y = project(0, lat, width, height)[1];
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Land fills
  for (const feature of collection.features) {
    forEachPolygon(feature, (rings) => {
      ctx.beginPath();
      pathRings(ctx, rings, width, height);
      ctx.fillStyle = landFill(feature);
      ctx.fill("evenodd");
    });
  }

  // Coast outline (slightly thicker, darker)
  ctx.strokeStyle = COAST;
  ctx.lineWidth = Math.max(1.25, width / 4096);
  ctx.lineJoin = "round";
  for (const feature of collection.features) {
    forEachPolygon(feature, (rings) => {
      ctx.beginPath();
      pathRings(ctx, rings, width, height);
      ctx.stroke();
    });
  }

  // Country borders
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = Math.max(0.9, width / 5500);
  ctx.globalAlpha = 0.85;
  for (const feature of collection.features) {
    forEachPolygon(feature, (rings) => {
      ctx.beginPath();
      pathRings(ctx, rings, width, height);
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;

  return canvas;
}
