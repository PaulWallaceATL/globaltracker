const warned = new Set<string>();

function warnOnce(key: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `[globaltracker] Missing ${key} — that live source will be skipped.`,
  );
}

type EnvName =
  | "ACLED_API_KEY"
  | "ACLED_EMAIL"
  | "ACLED_PASSWORD"
  | "NASA_FIRMS_MAP_KEY"
  | "AISSTREAM_IO_API_KEY"
  | "NEWSAPI_ORG_API_KEY"
  | "GNEWS_API_KEY"
  | "NEWSDATA_IO_API_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "TOMTOM_API_KEY"
  | "AVIATIONSTACK_API_KEY"
  | "INGEST_SECRET";

export function getEnvKey(name: EnvName): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    warnOnce(name);
    return null;
  }
  return value;
}

export function hasKey(name: EnvName): boolean {
  return Boolean(process.env[name]?.trim());
}

export function hasAcledAuth(): boolean {
  return (
    (hasKey("ACLED_EMAIL") && hasKey("ACLED_PASSWORD")) ||
    hasKey("ACLED_API_KEY")
  );
}
