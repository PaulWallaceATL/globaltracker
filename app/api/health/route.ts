import { hasAcledAuth, hasKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports which secrets are present (booleans only — never values).
 * Use this to verify Vercel env after Sensitive fields look "blank".
 */
export async function GET() {
  const keys = {
    ACLED_EMAIL: hasKey("ACLED_EMAIL"),
    ACLED_PASSWORD: hasKey("ACLED_PASSWORD"),
    ACLED_API_KEY: hasKey("ACLED_API_KEY"),
    acledAuthReady: hasAcledAuth(),
    NASA_FIRMS_MAP_KEY: hasKey("NASA_FIRMS_MAP_KEY"),
    AISSTREAM_IO_API_KEY: hasKey("AISSTREAM_IO_API_KEY"),
    AVIATIONSTACK_API_KEY: hasKey("AVIATIONSTACK_API_KEY"),
    TOMTOM_API_KEY: hasKey("TOMTOM_API_KEY"),
    NEWSAPI_ORG_API_KEY: hasKey("NEWSAPI_ORG_API_KEY"),
    GNEWS_API_KEY: hasKey("GNEWS_API_KEY"),
    NEWSDATA_IO_API_KEY: hasKey("NEWSDATA_IO_API_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: hasKey("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasKey("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: hasKey("SUPABASE_SERVICE_ROLE_KEY"),
    INGEST_SECRET: hasKey("INGEST_SECRET"),
  };

  const pinSources = {
    aircraft: "ADS-B.lol (no key) + optional AVIATIONSTACK / OpenSky",
    conflict: keys.acledAuthReady
      ? "ACLED + GDELT"
      : "GDELT only (ACLED email/password missing on this deployment)",
    thermal: keys.NASA_FIRMS_MAP_KEY
      ? "NASA FIRMS"
      : "unavailable — NASA_FIRMS_MAP_KEY missing",
    ships: keys.AISSTREAM_IO_API_KEY
      ? "AISStream"
      : "unavailable — AISSTREAM_IO_API_KEY missing",
  };

  return Response.json({
    ok: true,
    deployment: process.env.VERCEL_URL ?? "local",
    env: process.env.VERCEL_ENV ?? "development",
    keys,
    pinSources,
    tip: "Sensitive values stay blank in the Vercel UI after save — that is normal. true/false above is what the app actually sees.",
  });
}
