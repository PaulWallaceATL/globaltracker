import { getEnvKey } from "./env";

interface TokenCache {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

let cache: TokenCache | null = null;

/** Fetch a Bearer access token via myACLED OAuth (email + password). */
export async function getAcledAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 60_000) {
    return cache.accessToken;
  }

  if (cache?.refreshToken) {
    const refreshed = await requestToken({
      grant_type: "refresh_token",
      refresh_token: cache.refreshToken,
      client_id: "acled",
    });
    if (refreshed) {
      cache = refreshed;
      return cache.accessToken;
    }
  }

  // Optional: manual Bearer pasted into ACLED_API_KEY (no email/password)
  const email = process.env.ACLED_EMAIL?.trim() || null;
  const password = process.env.ACLED_PASSWORD?.trim() || null;
  const manual = process.env.ACLED_API_KEY?.trim() || null;
  if (manual && !email) {
    return manual;
  }

  if (!email || !password) {
    getEnvKey("ACLED_EMAIL");
    getEnvKey("ACLED_PASSWORD");
    return null;
  }

  const token = await requestToken({
    grant_type: "password",
    username: email,
    password,
    client_id: "acled",
    scope: "authenticated",
  });

  if (!token) return null;
  cache = token;
  return cache.accessToken;
}

async function requestToken(
  body: Record<string, string>,
): Promise<TokenCache | null> {
  try {
    const res = await fetch("https://acleddata.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(
        `[globaltracker] ACLED OAuth failed: ${res.status} ${await res.text()}`,
      );
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
    };
  } catch (err) {
    console.warn("[globaltracker] ACLED OAuth error", err);
    return null;
  }
}
