import WebSocket from "ws";
import { getEnvKey } from "@/lib/env";
import { resolveCountry } from "@/lib/geo/countries";
import { normalizeAisMessage } from "@/lib/normalize/ais";
import type { BBox } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE proxy for aisstream.io WebSocket.
 * Client: EventSource(`/api/deployments/ais?country=SD`)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const countryParam = searchParams.get("country");
  const country =
    resolveCountry(countryParam ?? "") ?? resolveCountry(q ?? "");

  const bbox: BBox =
    country?.bbox ??
    parseBBox(searchParams) ?? {
      minLat: -60,
      maxLat: 75,
      minLng: -180,
      maxLng: 180,
    };

  const apiKey = getEnvKey("AISSTREAM_IO_API_KEY");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // stream closed
        }
      };

      send({ type: "ready", bbox, live: Boolean(apiKey) });

      if (!apiKey) {
        send({ type: "error", message: "AISSTREAM_IO_API_KEY not configured" });
        send({ type: "heartbeat", t: Date.now() });
        const interval = setInterval(() => {
          send({ type: "heartbeat", t: Date.now() });
        }, 15000);

        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        });
        return;
      }

      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      ws.on("open", () => {
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [
            [
              [bbox.minLat, bbox.minLng],
              [bbox.maxLat, bbox.maxLng],
            ],
          ],
          FilterMessageTypes: ["PositionReport"],
        };
        ws.send(JSON.stringify(subscription));
        heartbeat = setInterval(() => {
          send({ type: "heartbeat", t: Date.now() });
        }, 15000);
      });

      ws.on("message", (data) => {
        try {
          const raw = JSON.parse(data.toString());
          const event = normalizeAisMessage(raw);
          if (event) send({ type: "ship", event });
        } catch {
          /* ignore malformed */
        }
      });

      ws.on("error", (err) => {
        send({ type: "error", message: String(err) });
        cleanup();
      });

      ws.on("close", () => cleanup());

      request.signal.addEventListener("abort", () => cleanup());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function parseBBox(params: URLSearchParams): BBox | null {
  if (
    !params.has("minLat") ||
    !params.has("maxLat") ||
    !params.has("minLng") ||
    !params.has("maxLng")
  ) {
    return null;
  }
  const minLat = Number(params.get("minLat"));
  const maxLat = Number(params.get("maxLat"));
  const minLng = Number(params.get("minLng"));
  const maxLng = Number(params.get("maxLng"));
  if (![minLat, maxLat, minLng, maxLng].every((n) => Number.isFinite(n))) {
    return null;
  }
  if (minLat >= maxLat || minLng >= maxLng) return null;
  return { minLat, maxLat, minLng, maxLng };
}
