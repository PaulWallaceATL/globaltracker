import { NextRequest, NextResponse } from "next/server";
import type { WeatherSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  61: "Rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    url.searchParams.set("wind_speed_unit", "kmh");

    const res = await fetch(url.toString(), {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { weather: null, meta: { source: "open-meteo", error: `HTTP ${res.status}` } },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const code = data.current?.weather_code ?? 0;
    const snapshot: WeatherSnapshot = {
      lat,
      lng,
      tempC: data.current?.temperature_2m ?? 0,
      windKmh: data.current?.wind_speed_10m ?? 0,
      weatherCode: code,
      summary: `${WMO[code] ?? "Weather"} · ${Math.round(data.current?.temperature_2m ?? 0)}°C · wind ${Math.round(data.current?.wind_speed_10m ?? 0)} km/h`,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json({
      weather: snapshot,
      meta: { source: "open-meteo" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        weather: null,
        meta: {
          source: "open-meteo",
          error: err instanceof Error ? err.message : "fetch failed",
        },
      },
      { status: 502 },
    );
  }
}
