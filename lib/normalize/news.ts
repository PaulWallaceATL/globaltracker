import type { NewsArticle, TrackerEvent } from "../types";

function shortId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

interface NewsApiArticle {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  urlToImage?: string;
  source?: { name?: string };
}

interface GNewsArticle {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  image?: string;
  source?: { name?: string };
}

interface NewsDataArticle {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  image_url?: string;
  source_id?: string;
  source_name?: string;
  article_id?: string;
}

export function normalizeNewsApi(articles: NewsApiArticle[]): NewsArticle[] {
  return articles
    .filter((a) => a.title && a.url)
    .map((a, i) => ({
      id: `newsapi-${shortId(a.url!)}-${i}`,
      title: a.title!.trim(),
      description: (a.description ?? "").trim(),
      url: a.url!,
      source: a.source?.name ?? "NewsAPI",
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      imageUrl: a.urlToImage ?? null,
    }));
}

export function normalizeGNews(articles: GNewsArticle[]): NewsArticle[] {
  return articles
    .filter((a) => a.title && a.url)
    .map((a, i) => ({
      id: `gnews-${shortId(a.url!)}-${i}`,
      title: a.title!.trim(),
      description: (a.description ?? "").trim(),
      url: a.url!,
      source: a.source?.name ?? "GNews",
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      imageUrl: a.image ?? null,
    }));
}

export function normalizeNewsData(articles: NewsDataArticle[]): NewsArticle[] {
  return articles
    .filter((a) => a.title && a.link)
    .map((a, i) => ({
      id: `newsdata-${a.article_id ?? shortId(a.link!)}-${i}`,
      title: a.title!.trim(),
      description: (a.description ?? "").trim(),
      url: a.link!,
      source: a.source_name ?? a.source_id ?? "NewsData",
      publishedAt: a.pubDate
        ? new Date(a.pubDate).toISOString()
        : new Date().toISOString(),
      imageUrl: a.image_url ?? null,
    }));
}

export function mergeNewsArticles(
  groups: NewsArticle[][],
  limit = 10,
  preferSource?: string,
): NewsArticle[] {
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];

  const flat = groups.flat();
  flat.sort((a, b) => {
    if (preferSource) {
      const ap = a.source.toLowerCase().includes(preferSource.toLowerCase())
        ? 0
        : 1;
      const bp = b.source.toLowerCase().includes(preferSource.toLowerCase())
        ? 0
        : 1;
      if (ap !== bp) return ap - bp;
    }
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });

  for (const article of flat) {
    const key = article.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
    if (merged.length >= limit) break;
  }

  return merged;
}

/** Attach news URLs to events by simple keyword overlap. */
export function attachNewsLinks(
  events: TrackerEvent[],
  news: NewsArticle[],
  maxLinks = 3,
): TrackerEvent[] {
  return events.map((event) => {
    const tokens = event.description
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 4)
      .slice(0, 8);

    const links = news
      .filter((n) => {
        const hay = `${n.title} ${n.description}`.toLowerCase();
        return tokens.some((t) => hay.includes(t));
      })
      .slice(0, maxLinks)
      .map((n) => n.url);

    return {
      ...event,
      news_links: [...new Set([...(event.news_links ?? []), ...links])],
    };
  });
}
