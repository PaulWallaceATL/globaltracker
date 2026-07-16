import { getEnvKey, hasKey } from "@/lib/env";
import { resolveCountry } from "@/lib/geo/countries";
import {
  mergeNewsArticles,
  normalizeGNews,
  normalizeNewsApi,
  normalizeNewsData,
} from "@/lib/normalize/news";
import { fetchJsonSafe, jsonOk } from "@/lib/api-utils";
import type { NewsArticle } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const countryParam = searchParams.get("country");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10) || 10, 50);

  const country =
    resolveCountry(countryParam ?? "") ??
    resolveCountry(q ?? "");

  const query = (q?.trim() || country?.name || "global conflict").trim();

  const groups = await Promise.all([
    fetchGNews(query, country?.iso2, limit),
    fetchNewsApi(query, country?.iso2, limit),
    fetchNewsData(query, country?.iso2, limit),
  ]);

  const preferGNews = hasKey("GNEWS_API_KEY");
  const merged = mergeNewsArticles(
    groups,
    limit,
    preferGNews ? "GNews" : undefined,
  );

  const ranked = preferGNews
    ? [
        ...merged.filter((a) => a.id.startsWith("gnews-")),
        ...merged.filter((a) => !a.id.startsWith("gnews-")),
      ].slice(0, limit)
    : merged;

  return jsonOk({
    articles: ranked,
    meta: {
      query,
      country: country?.iso2 ?? null,
      count: ranked.length,
    },
  });
}

async function fetchGNews(
  query: string,
  countryIso?: string,
  limit = 10,
): Promise<NewsArticle[]> {
  const key = getEnvKey("GNEWS_API_KEY");
  if (!key) return [];

  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: String(Math.min(limit, 10)),
    apikey: key,
  });
  if (countryIso) params.set("country", countryIso.toLowerCase());

  const data = await fetchJsonSafe<{ articles?: unknown[] }>(
    `https://gnews.io/api/v4/search?${params.toString()}`,
  );
  if (!data?.articles) return [];
  return normalizeGNews(data.articles as Parameters<typeof normalizeGNews>[0]);
}

async function fetchNewsApi(
  query: string,
  countryIso?: string,
  limit = 10,
): Promise<NewsArticle[]> {
  const key = getEnvKey("NEWSAPI_ORG_API_KEY");
  if (!key) return [];

  // Everything endpoint supports q; top-headlines supports country
  const params = new URLSearchParams({
    q: query,
    language: "en",
    pageSize: String(Math.min(limit, 20)),
    sortBy: "publishedAt",
    apiKey: key,
  });

  const data = await fetchJsonSafe<{ articles?: unknown[] }>(
    `https://newsapi.org/v2/everything?${params.toString()}`,
  );

  if (!data?.articles?.length && countryIso) {
    const hl = new URLSearchParams({
      country: countryIso.toLowerCase(),
      pageSize: String(Math.min(limit, 20)),
      apiKey: key,
    });
    const headlines = await fetchJsonSafe<{ articles?: unknown[] }>(
      `https://newsapi.org/v2/top-headlines?${hl.toString()}`,
    );
    if (!headlines?.articles) return [];
    return normalizeNewsApi(
      headlines.articles as Parameters<typeof normalizeNewsApi>[0],
    );
  }

  if (!data?.articles) return [];
  return normalizeNewsApi(data.articles as Parameters<typeof normalizeNewsApi>[0]);
}

async function fetchNewsData(
  query: string,
  countryIso?: string,
  limit = 10,
): Promise<NewsArticle[]> {
  const key = getEnvKey("NEWSDATA_IO_API_KEY");
  if (!key) return [];

  const params = new URLSearchParams({
    apikey: key,
    q: query,
    language: "en",
  });
  if (countryIso) params.set("country", countryIso.toLowerCase());

  const data = await fetchJsonSafe<{ results?: unknown[] }>(
    `https://newsdata.io/api/1/news?${params.toString()}`,
  );
  if (!data?.results) return [];
  return normalizeNewsData(
    data.results as Parameters<typeof normalizeNewsData>[0],
  ).slice(0, limit);
}
