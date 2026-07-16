"use client";

import { create } from "zustand";
import { resolveCountry } from "@/lib/geo/countries";
import { relatedForEntity } from "@/lib/graph";
import { getSeedPlaces } from "@/lib/graph/places";
import { TOPIC_CATALOG } from "@/lib/graph/topics";
import { layersForLens } from "@/lib/lenses";
import { attachNewsLinks } from "@/lib/normalize/news";
import { getDeviceId } from "@/lib/device-id";
import type {
  EntityType,
  FocusTarget,
  LayerVisibility,
  MediaItem,
  NewsArticle,
  Place,
  PopulationPoint,
  HoverScreen,
  RelatedGraph,
  SearchHit,
  Situation,
  StakeholderLens,
  Topic,
  TrackLayer,
  TrackerEvent,
  ViewportLabel,
  WeatherSnapshot,
} from "@/lib/types";
import { DEFAULT_LAYER_VISIBILITY } from "@/lib/types";

interface Selection {
  type: EntityType | null;
  id: string | null;
}

interface TrackerState {
  query: string;
  countryCode: string | null;
  focusTarget: FocusTarget | null;
  events: TrackerEvent[];
  news: NewsArticle[];
  situations: Situation[];
  places: Place[];
  topics: Topic[];
  media: MediaItem[];
  populationPoints: PopulationPoint[];
  weather: WeatherSnapshot | null;
  selectedEvent: TrackerEvent | null;
  selectedSituation: Situation | null;
  selectedPlace: Place | null;
  selectedTopic: Topic | null;
  selection: Selection;
  related: RelatedGraph | null;
  searchHits: SearchHit[];
  hoveredEvent: TrackerEvent | null;
  /** Pixel position of hovered pin (kept in sync by LabelProjector). */
  hoverScreen: HoverScreen | null;
  previewArticle: NewsArticle | null;
  stackPanel: {
    id: string;
    lat: number;
    lng: number;
    events: TrackerEvent[];
  } | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  flyToken: number;
  layers: LayerVisibility;
  hasSearched: boolean;
  lastUpdated: string | null;
  globeLocked: boolean;
  lens: StakeholderLens;
  showGraphNav: boolean;
  bookmarks: Array<{
    entity_type: string;
    entity_id: string;
    label: string | null;
  }>;
  history: Array<{
    entity_type: string;
    entity_id: string;
    viewed_at: string;
  }>;
  clusterMergeDeg: number;
  /** Camera zoom proxy: ~0.5 far / ~1 theater / ~3–4 street-close */
  cameraZoom: number;
  /** Screen-space track chips (stable HUD overlay, not 3D Html). */
  viewportLabels: ViewportLabel[];

  setQuery: (query: string) => void;
  selectEvent: (event: TrackerEvent | null) => void;
  setHoveredEvent: (event: TrackerEvent | null) => void;
  setHoverScreen: (pos: HoverScreen | null) => void;
  setStackPanel: (
    panel: {
      id: string;
      lat: number;
      lng: number;
      events: TrackerEvent[];
    } | null,
  ) => void;
  previewNews: (article: NewsArticle | null) => void;
  toggleLayer: (layer: TrackLayer) => void;
  setAllLayers: (on: boolean) => void;
  setGlobeLocked: (locked: boolean) => void;
  flyTo: (target: FocusTarget) => void;
  setLens: (lens: StakeholderLens) => void;
  setShowGraphNav: (on: boolean) => void;
  toggleGraphNav: () => void;
  setClusterMergeDeg: (deg: number) => void;
  setCameraZoom: (zoom: number) => void;
  setViewportLabels: (labels: ViewportLabel[]) => void;
  runSearch: (rawQuery: string) => Promise<void>;
  previewSearch: (rawQuery: string) => Promise<void>;
  loadGlobalPulse: () => Promise<void>;
  focusEntity: (type: EntityType, id: string) => Promise<void>;
  clearSelection: () => void;
  syncFromUrl: () => void;
  pushUrlState: () => void;
  upsertShip: (event: TrackerEvent) => void;
  clearShips: () => void;
  toggleBookmark: (type: EntityType, id: string, label: string) => Promise<void>;
  loadBookmarks: () => Promise<void>;
  recordHistory: (type: EntityType, id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
}

let aisController: AbortController | null = null;

function publishCaps(
  events: TrackerEvent[],
  newsArticles: NewsArticle[],
): TrackerEvent[] {
  const linked = attachNewsLinks(events, newsArticles);
  const conflicts = linked.filter((e) => e.type === "conflict").slice(0, 200);
  const aircraft = linked.filter((e) => e.type === "aircraft").slice(0, 160);
  const thermal = linked.filter((e) => e.type === "thermal").slice(0, 100);
  const ships = linked.filter((e) => e.type === "ship").slice(0, 140);
  const traffic = linked.filter((e) => e.type === "traffic").slice(0, 80);
  const weather = linked.filter((e) => e.type === "weather").slice(0, 20);
  const population = linked
    .filter((e) => e.type === "population")
    .slice(0, 40);
  return [
    ...conflicts,
    ...aircraft,
    ...thermal,
    ...ships,
    ...traffic,
    ...weather,
    ...population,
  ];
}

function computeRelated(state: {
  selection: Selection;
  situations: Situation[];
  events: TrackerEvent[];
  places: Place[];
  topics: Topic[];
  media: MediaItem[];
}): RelatedGraph | null {
  if (!state.selection.type || !state.selection.id) return null;
  return relatedForEntity({
    type: state.selection.type,
    id: state.selection.id,
    situations: state.situations,
    events: state.events,
    places: state.places,
    topics: state.topics,
    media: state.media,
  });
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  query: "",
  countryCode: null,
  focusTarget: null,
  events: [],
  news: [],
  situations: [],
  places: getSeedPlaces(),
  topics: TOPIC_CATALOG,
  media: [],
  populationPoints: [],
  weather: null,
  selectedEvent: null,
  selectedSituation: null,
  selectedPlace: null,
  selectedTopic: null,
  selection: { type: null, id: null },
  related: null,
  searchHits: [],
  hoveredEvent: null,
  hoverScreen: null,
  previewArticle: null,
  stackPanel: null,
  loading: false,
  error: null,
  demoMode: false,
  flyToken: 0,
  layers: { ...DEFAULT_LAYER_VISIBILITY },
  hasSearched: false,
  lastUpdated: null,
  globeLocked: false,
  lens: "public",
  showGraphNav: false,
  bookmarks: [],
  history: [],
  clusterMergeDeg: 1.4,
  cameraZoom: 1,
  viewportLabels: [],

  setQuery: (query) => set({ query }),

  selectEvent: (event) => {
    if (!event) {
      set({
        selectedEvent: null,
        selection: { type: null, id: null },
        related: null,
        stackPanel: null,
      });
      get().pushUrlState();
      return;
    }
    set((state) => {
      const selection = { type: "event" as const, id: event.id };
      const next = {
        ...state,
        selectedEvent: event,
        selectedSituation: null,
        selectedPlace: null,
        selectedTopic: null,
        hoveredEvent: null,
        hoverScreen: null,
        stackPanel: null,
        selection,
      };
      return {
        ...next,
        related: computeRelated(next),
      };
    });
    void get().recordHistory("event", event.id);
    get().pushUrlState();
  },

  setHoveredEvent: (event) =>
    set(
      event
        ? { hoveredEvent: event }
        : { hoveredEvent: null, hoverScreen: null },
    ),

  setHoverScreen: (pos) => set({ hoverScreen: pos }),

  setStackPanel: (panel) =>
    set({
      stackPanel: panel,
      selectedEvent: panel ? null : get().selectedEvent,
    }),

  previewNews: (article) => set({ previewArticle: article }),

  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  setAllLayers: (on) =>
    set({
      layers: {
        conflict: on,
        thermal: on,
        aircraft: on,
        ship: on,
        population: on,
        traffic: on,
        weather: on,
      },
    }),

  setGlobeLocked: (locked) => set({ globeLocked: locked }),

  flyTo: (target) =>
    set((state) => ({
      focusTarget: target,
      flyToken: state.flyToken + 1,
      globeLocked: true,
    })),

  setLens: (lens) => {
    set({ lens, layers: layersForLens(lens) });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gt_lens", lens);
    }
    get().pushUrlState();
  },

  setShowGraphNav: (on) => {
    set({ showGraphNav: on });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gt_graph_nav", on ? "1" : "0");
    }
  },

  toggleGraphNav: () => {
    get().setShowGraphNav(!get().showGraphNav);
  },

  setClusterMergeDeg: (deg) => set({ clusterMergeDeg: deg }),
  setCameraZoom: (zoom) => set({ cameraZoom: zoom }),
  setViewportLabels: (labels) => set({ viewportLabels: labels }),

  clearSelection: () => {
    set({
      selectedEvent: null,
      selectedSituation: null,
      selectedPlace: null,
      selectedTopic: null,
      selection: { type: null, id: null },
      related: null,
      stackPanel: null,
      previewArticle: null,
    });
    get().pushUrlState();
  },

  pushUrlState: () => {
    if (typeof window === "undefined") return;
    const { selection, lens, query } = get();
    const params = new URLSearchParams(window.location.search);
    for (const key of ["situation", "place", "topic", "event", "media", "q", "lens"]) {
      params.delete(key);
    }
    if (selection.type && selection.id) {
      params.set(selection.type, selection.id);
    }
    if (query) params.set("q", query);
    if (lens && lens !== "public") params.set("lens", lens);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  },

  syncFromUrl: () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const lensParam = params.get("lens") as StakeholderLens | null;
    const stored =
      (window.localStorage.getItem("gt_lens") as StakeholderLens | null) ??
      "public";
    const lens = lensParam ?? stored;
    if (lens && lens !== get().lens) {
      get().setLens(lens);
    }
    const graphPref = window.localStorage.getItem("gt_graph_nav");
    if (graphPref === "1") get().setShowGraphNav(true);
    const q = params.get("q");
    if (q) set({ query: q });

    const situation = params.get("situation");
    const place = params.get("place");
    const topic = params.get("topic");
    const event = params.get("event");
    if (situation) void get().focusEntity("situation", situation);
    else if (place) void get().focusEntity("place", place);
    else if (topic) void get().focusEntity("topic", topic);
    else if (event) void get().focusEntity("event", event);
  },

  focusEntity: async (type, id) => {
    const state = get();
    if (type === "situation") {
      let sit = state.situations.find((s) => s.id === id) ?? null;
      if (!sit) {
        try {
          const res = await fetch(`/api/situations?id=${encodeURIComponent(id)}`);
          const json = (await res.json()) as { situation: Situation | null };
          sit = json.situation;
          if (sit) {
            set({ situations: [sit, ...state.situations.filter((s) => s.id !== sit!.id)] });
          }
        } catch {
          /* ignore */
        }
      }
      if (!sit) return;
      set((s) => {
        const selection = { type: "situation" as const, id: sit!.id };
        const next = {
          ...s,
          selectedSituation: sit,
          selectedEvent: null,
          selectedPlace: null,
          selectedTopic: null,
          selection,
          stackPanel: null,
        };
        return { ...next, related: computeRelated(next) };
      });
      get().flyTo({
        lat: sit.centroid.lat,
        lng: sit.centroid.lng,
        zoom: 1.0,
      });
      void get().recordHistory("situation", sit.id);
      get().pushUrlState();
      return;
    }

    if (type === "place") {
      const place =
        state.places.find((p) => p.id === id) ??
        getSeedPlaces().find((p) => p.id === id) ??
        null;
      if (!place) return;
      set((s) => {
        const selection = { type: "place" as const, id: place.id };
        const next = {
          ...s,
          selectedPlace: place,
          selectedSituation: null,
          selectedEvent: null,
          selectedTopic: null,
          selection,
        };
        return { ...next, related: computeRelated(next) };
      });
      get().flyTo({ lat: place.lat, lng: place.lng, zoom: 1.0 });
      void get().runSearch(place.name);
      void get().recordHistory("place", place.id);
      get().pushUrlState();
      return;
    }

    if (type === "topic") {
      const topic =
        state.topics.find((t) => t.id === id || t.slug === id) ?? null;
      if (!topic) return;
      set((s) => {
        const selection = { type: "topic" as const, id: topic.id };
        const next = {
          ...s,
          selectedTopic: topic,
          selectedSituation: null,
          selectedEvent: null,
          selectedPlace: null,
          selection,
        };
        return { ...next, related: computeRelated(next) };
      });
      void get().runSearch(topic.slug);
      void get().recordHistory("topic", topic.id);
      get().pushUrlState();
      return;
    }

    if (type === "event") {
      const event = state.events.find((e) => e.id === id) ?? null;
      if (event) get().selectEvent(event);
      return;
    }

    if (type === "media") {
      const article =
        state.news.find((n) => n.id === id) ??
        state.media.find((m) => m.id === id);
      if (article && "url" in article) {
        const newsArticle: NewsArticle =
          "publishedAt" in article && "title" in article
            ? (article as NewsArticle)
            : {
                id: article.id,
                title: (article as MediaItem).title,
                description: (article as MediaItem).description ?? "",
                url: (article as MediaItem).url,
                source: (article as MediaItem).source ?? "",
                publishedAt: (article as MediaItem).publishedAt ?? "",
                imageUrl: (article as MediaItem).imageUrl,
              };
        set({ previewArticle: newsArticle });
        void get().recordHistory("media", id);
      }
    }
  },

  loadGlobalPulse: async () => {
    // Soft pulse from live feeds only — never demo corpora
    try {
      const fetchJson = async <T,>(url: string, ms = 14000): Promise<T | null> => {
        const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
        if (!res.ok) return null;
        return (await res.json()) as T;
      };

      type EventsPayload = { events?: TrackerEvent[] };
      type NewsPayload = { articles?: NewsArticle[] };

      const [conflicts, deployments, newsJson] = await Promise.all([
        fetchJson<EventsPayload>("/api/conflicts?q=conflict&limit=60", 22000),
        // Prefer hub-sampled global ADSB (no country filter) so pulse always has pins
        fetchJson<EventsPayload>("/api/deployments?limit=80", 22000),
        fetchJson<NewsPayload>(
          "/api/news?q=conflict%20OR%20war%20OR%20airstrike&limit=10",
          12000,
        ),
      ]);

      const events = [
        ...(conflicts?.events ?? []),
        ...(deployments?.events ?? []),
      ].filter((e) => e.source !== "demo" && e.source !== "pulse");
      const newsArticles = (newsJson?.articles ?? []).filter(
        (a) => a.source !== "demo",
      );

      set({
        events: publishCaps(events, newsArticles),
        news: newsArticles.slice(0, 10),
        media: newsArticles.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source,
          publishedAt: a.publishedAt,
          imageUrl: a.imageUrl,
        })),
        demoMode: false,
        lastUpdated: new Date().toISOString(),
        hasSearched: events.length > 0 || newsArticles.length > 0,
      });

      if (events.length > 0) {
        const { buildSituations } = await import("@/lib/graph");
        const sits = buildSituations({
          events,
          news: newsArticles,
          places: get().places,
        });
        set({ situations: sits });

        void fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events, news: newsArticles }),
        }).catch(() => undefined);
      }

      void fetch("/api/population")
        .then((r) => r.json())
        .then((p: { points?: PopulationPoint[] }) => {
          if (p.points) set({ populationPoints: p.points });
        })
        .catch(() => undefined);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Pulse failed",
      });
    }
  },

  upsertShip: (event) =>
    set((state) => {
      const others = state.events.filter(
        (e) => !(e.type === "ship" && e.id === event.id),
      );
      return { events: [...others, event] };
    }),

  clearShips: () =>
    set((state) => ({
      events: state.events.filter((e) => e.type !== "ship"),
    })),

  loadBookmarks: async () => {
    try {
      const deviceId = getDeviceId();
      const res = await fetch(`/api/bookmarks?deviceId=${deviceId}`);
      const json = (await res.json()) as {
        bookmarks: TrackerState["bookmarks"];
      };
      set({ bookmarks: json.bookmarks ?? [] });
    } catch {
      /* ignore */
    }
  },

  loadHistory: async () => {
    try {
      const deviceId = getDeviceId();
      const res = await fetch(`/api/history?deviceId=${deviceId}`);
      const json = (await res.json()) as { history: TrackerState["history"] };
      set({ history: json.history ?? [] });
    } catch {
      /* ignore */
    }
  },

  recordHistory: async (type, id) => {
    try {
      const deviceId = getDeviceId();
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          entityType: type,
          entityId: id,
        }),
      });
      void get().loadHistory();
    } catch {
      /* ignore */
    }
  },

  toggleBookmark: async (type, id, label) => {
    const deviceId = getDeviceId();
    const existing = get().bookmarks.find(
      (b) => b.entity_type === type && b.entity_id === id,
    );
    try {
      if (existing) {
        await fetch(
          `/api/bookmarks?deviceId=${deviceId}&entityType=${type}&entityId=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            entityType: type,
            entityId: id,
            label,
          }),
        });
      }
      void get().loadBookmarks();
    } catch {
      /* ignore */
    }
  },

  previewSearch: async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query) {
      set({ searchHits: [] });
      return;
    }
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=12`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { hits?: SearchHit[] };
      // Only apply if query still matches current input intent
      if (get().query.trim() === query || rawQuery.trim() === query) {
        set({ searchHits: json.hits ?? [] });
      }
    } catch {
      /* ignore */
    }
  },

  runSearch: async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query) return;

    const country = resolveCountry(query);
    const countryCode = country?.iso2 ?? null;

    set({
      query,
      countryCode,
      loading: true,
      error: null,
      selectedEvent: null,
      stackPanel: null,
      hasSearched: true,
      previewArticle: null,
    });
    get().pushUrlState();

    if (country) {
      get().flyTo({ lat: country.lat, lng: country.lng, zoom: 1.0 });
    }

    // Parallel unified search hits
    void fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12`)
      .then((r) => r.json())
      .then((json: { hits?: SearchHit[] }) => {
        set({ searchHits: json.hits ?? [] });
      })
      .catch(() => undefined);

    const params = new URLSearchParams({ q: query, limit: "200" });
    if (countryCode) params.set("country", countryCode);

    const newsParams = new URLSearchParams({ q: query, limit: "10" });
    if (countryCode) newsParams.set("country", countryCode);

    const focusLat = country?.lat;
    const focusLng = country?.lng;

    try {
      const fetchJson = async <T,>(url: string, ms = 12000): Promise<T | null> => {
        const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
        if (!res.ok) return null;
        return (await res.json()) as T;
      };

      type EventsPayload = { events: TrackerEvent[]; meta?: { demo?: boolean } };
      type NewsPayload = { articles: NewsArticle[]; meta?: { demo?: boolean } };

      let conflictEvents: TrackerEvent[] = [];
      let deployEvents: TrackerEvent[] = [];
      let trafficEvents: TrackerEvent[] = [];
      let newsArticles: NewsArticle[] = [];

      const publishEvents = () => {
        const events = publishCaps(
          [...conflictEvents, ...deployEvents, ...trafficEvents].filter(
            (e) => e.source !== "demo" && e.source !== "pulse",
          ),
          newsArticles.filter((a) => a.source !== "demo"),
        );
        set({
          events,
          news: newsArticles.filter((a) => a.source !== "demo").slice(0, 10),
          media: newsArticles
            .filter((a) => a.source !== "demo")
            .map((a) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              url: a.url,
              source: a.source,
              publishedAt: a.publishedAt,
              imageUrl: a.imageUrl,
            })),
          demoMode: false,
          lastUpdated: new Date().toISOString(),
        });
      };

      const newsP = fetchJson<NewsPayload>(
        `/api/news?${newsParams.toString()}`,
        14000,
      ).then((newsJson) => {
        newsArticles = (newsJson?.articles ?? []).filter(
          (a) => a.source !== "demo",
        );
        set({ news: newsArticles.slice(0, 10), demoMode: false });
      });

      const deploymentsP = fetchJson<EventsPayload>(
        `/api/deployments?${params.toString()}`,
        22000,
      ).then((deploymentsJson) => {
        deployEvents = (deploymentsJson?.events ?? []).filter(
          (e) => e.source !== "demo",
        );
        publishEvents();
      });

      const conflictsP = fetchJson<EventsPayload>(
        `/api/conflicts?${params.toString()}`,
        22000,
      ).then((conflictsJson) => {
        conflictEvents = (conflictsJson?.events ?? []).filter(
          (e) => e.source !== "demo",
        );
        publishEvents();
      });

      const trafficParams = new URLSearchParams({ q: query });
      if (focusLat != null) trafficParams.set("lat", String(focusLat));
      if (focusLng != null) trafficParams.set("lng", String(focusLng));

      const trafficP = fetchJson<EventsPayload>(
        `/api/traffic?${trafficParams.toString()}`,
        8000,
      ).then((trafficJson) => {
        trafficEvents = (trafficJson?.events ?? []).filter(
          (e) => e.source !== "demo" && e.source !== "OSM-heuristic",
        );
        publishEvents();
      });

      const weatherP =
        focusLat != null && focusLng != null
          ? fetchJson<{ weather: WeatherSnapshot | null }>(
              `/api/weather?lat=${focusLat}&lng=${focusLng}`,
              8000,
            ).then((w) => {
              if (w?.weather) set({ weather: w.weather });
            })
          : Promise.resolve();

      const popP =
        focusLat != null && focusLng != null
          ? fetchJson<{
              points: PopulationPoint[];
              nearPopulation?: number;
            }>(
              `/api/population?lat=${focusLat}&lng=${focusLng}&radiusKm=900`,
              6000,
            ).then((p) => {
              if (p?.points) set({ populationPoints: p.points });
            })
          : Promise.resolve();

      await Promise.allSettled([
        newsP,
        deploymentsP,
        conflictsP,
        trafficP,
        weatherP,
        popP,
      ]);
      publishEvents();

      // Persist graph from collected events (no self-HTTP refetch)
      void fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query,
          country: countryCode ?? undefined,
          events: get().events,
          news: get().news,
        }),
      })
        .then((r) => r.json())
        .then((json: { situations?: Situation[] }) => {
          if (json.situations?.length) set({ situations: json.situations });
        })
        .catch(() => undefined);

      // Rebuild situations client-side if API empty
      if (get().situations.length === 0) {
        const { buildSituations } = await import("@/lib/graph");
        const sits = buildSituations({
          events: get().events,
          news: newsArticles,
          places: get().places,
        });
        set({ situations: sits });
      }

      // Enrich situation metrics with weather / population
      const weather = get().weather;
      const nearPop = get().populationPoints.reduce(
        (s, p) => s + p.population,
        0,
      );
      if (weather || nearPop) {
        set((s) => ({
          situations: s.situations.map((sit) => ({
            ...sit,
            metrics: {
              ...sit.metrics,
              weatherSummary: weather?.summary ?? sit.metrics.weatherSummary,
              populationNear:
                nearPop || sit.metrics.populationNear,
              trafficCount:
                sit.metrics.trafficCount ??
                get().events.filter((e) => e.type === "traffic").length,
            },
          })),
        }));
      }

      const events = get().events;
      if (!country && events.length > 0) {
        const sample = events.slice(0, 40);
        const lat = sample.reduce((s, e) => s + e.lat, 0) / sample.length;
        const lng = sample.reduce((s, e) => s + e.lng, 0) / sample.length;
        get().flyTo({ lat, lng, zoom: 0.85 });
      }

      connectAis(query, countryCode, get().upsertShip, get().clearShips);
      set({ loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Search failed",
      });
    }
  },
}));

function connectAis(
  query: string,
  countryCode: string | null,
  upsertShip: (event: TrackerEvent) => void,
  clearShips: () => void,
) {
  if (aisController) {
    aisController.abort();
    aisController = null;
  }
  clearShips();

  const params = new URLSearchParams({ q: query });
  if (countryCode) params.set("country", countryCode);

  const controller = new AbortController();
  aisController = controller;

  void (async () => {
    try {
      const res = await fetch(`/api/deployments/ais?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "text/event-stream" },
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              type: string;
              event?: TrackerEvent;
            };
            if (payload.type === "ship" && payload.event) {
              upsertShip(payload.event);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* aborted or network */
    }
  })();
}
