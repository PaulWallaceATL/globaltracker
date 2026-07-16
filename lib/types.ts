export type EventType =
  | "conflict"
  | "aircraft"
  | "ship"
  | "thermal"
  | "news"
  | "traffic"
  | "population"
  | "weather";

export interface TrackerEvent {
  id: string;
  lat: number;
  lng: number;
  type: EventType;
  description: string;
  timestamp: string;
  source: string;
  news_links: string[];
  meta?: Record<string, string | number | boolean | null>;
  placeIds?: string[];
  topicIds?: string[];
  severity?: number;
}

/** Screen-space track chip projected from the globe (pixel coords in the viewport). */
export interface ViewportLabel {
  eventId: string;
  x: number;
  y: number;
  kind: "aircraft" | "ship";
  title: string;
  subtitle: string;
}

/** Screen-space anchor for the hover intel tooltip. */
export interface HoverScreen {
  x: number;
  y: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string | null;
}

export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CountryInfo {
  name: string;
  iso2: string;
  iso3: string;
  lat: number;
  lng: number;
  bbox: BBox;
}

export interface FocusTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

export type TrackLayer =
  | "conflict"
  | "thermal"
  | "aircraft"
  | "ship"
  | "population"
  | "traffic"
  | "weather";

export type LayerVisibility = Record<TrackLayer, boolean>;

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  conflict: true,
  thermal: true,
  aircraft: true,
  ship: true,
  population: false,
  traffic: false,
  weather: false,
};

export type StakeholderLens =
  | "public"
  | "civic"
  | "government"
  | "business";

export type PlaceKind = "country" | "city" | "aoi" | "region";

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  slug: string;
  iso2?: string | null;
  iso3?: string | null;
  lat: number;
  lng: number;
  bbox?: BBox | null;
  population?: number | null;
  meta?: Record<string, unknown>;
}

export interface Topic {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  keywords: string[];
}

export interface MediaItem {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  source?: string | null;
  publishedAt?: string | null;
  imageUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export type SituationStatus = "active" | "monitoring" | "resolved";

export interface LensBrief {
  headline: string;
  body: string;
  bullets: string[];
  callToAction?: string;
}

export interface SituationBriefs {
  public: LensBrief;
  civic: LensBrief;
  government: LensBrief;
  business: LensBrief;
}

export interface SituationMetrics {
  conflictCount?: number;
  thermalCount?: number;
  aircraftCount?: number;
  shipCount?: number;
  trafficCount?: number;
  populationNear?: number;
  newsCount?: number;
  weatherSummary?: string;
}

export interface Situation {
  id: string;
  title: string;
  summary: string;
  severity: number;
  status: SituationStatus;
  centroid: { lat: number; lng: number };
  bbox?: BBox | null;
  placeId?: string | null;
  placeIds?: string[];
  topicIds?: string[];
  eventIds?: string[];
  mediaIds?: string[];
  briefs: SituationBriefs;
  metrics: SituationMetrics;
  updatedAt?: string;
}

export type EntityType = "situation" | "place" | "topic" | "event" | "media";

export interface EntityRef {
  type: EntityType;
  id: string;
  label: string;
  subtitle?: string;
}

export interface RelatedGraph {
  places: EntityRef[];
  topics: EntityRef[];
  events: EntityRef[];
  situations: EntityRef[];
  media: EntityRef[];
}

export interface SearchHit {
  type: EntityType;
  id: string;
  label: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  score: number;
}

export interface WeatherSnapshot {
  lat: number;
  lng: number;
  tempC: number;
  windKmh: number;
  weatherCode: number;
  summary: string;
  fetchedAt: string;
}

export interface PopulationPoint {
  id: string;
  lat: number;
  lng: number;
  population: number;
  label: string;
}

export interface TrafficIncident {
  id: string;
  lat: number;
  lng: number;
  description: string;
  severity: number;
  source: string;
  timestamp: string;
}
