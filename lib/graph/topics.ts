import type { Topic } from "@/lib/types";

export const TOPIC_CATALOG: Topic[] = [
  {
    id: "topic-shelling",
    slug: "shelling",
    label: "Shelling",
    description: "Artillery, mortar, and rocket fire against populated areas",
    keywords: ["shelling", "artillery", "mortar", "rocket", "bombard"],
  },
  {
    id: "topic-airstrike",
    slug: "airstrike",
    label: "Airstrike",
    description: "Aerial bombardment and close air support",
    keywords: ["airstrike", "air strike", "bombing", "drone strike", "aerial"],
  },
  {
    id: "topic-ceasefire",
    slug: "ceasefire",
    label: "Ceasefire",
    description: "Truce, pause in hostilities, or negotiation signals",
    keywords: ["ceasefire", "truce", "peace talks", "negotiation", "armistice"],
  },
  {
    id: "topic-displacement",
    slug: "displacement",
    label: "Displacement",
    description: "Civilian displacement, refugees, and IDPs",
    keywords: ["displacement", "refugee", "displaced", "evacuat", "idp"],
  },
  {
    id: "topic-port-disruption",
    slug: "port-disruption",
    label: "Port disruption",
    description: "Maritime ports, shipping lanes, and harbor closures",
    keywords: ["port", "harbor", "harbour", "shipping", "red sea", "blockade"],
  },
  {
    id: "topic-airspace",
    slug: "airspace",
    label: "Airspace",
    description: "Airspace closures, NOTAMs, and aviation disruption",
    keywords: ["airspace", "notam", "flight ban", "airport closed", "no-fly"],
  },
  {
    id: "topic-naval",
    slug: "naval",
    label: "Naval activity",
    description: "Warships, escorts, and maritime military presence",
    keywords: ["naval", "warship", "frigate", "destroyer", "carrier", "ais"],
  },
  {
    id: "topic-thermal",
    slug: "thermal",
    label: "Thermal / fire",
    description: "Satellite thermal anomalies and fire detections",
    keywords: ["thermal", "fire", "wildfire", "hotspot", "firms", "blaze"],
  },
  {
    id: "topic-infrastructure",
    slug: "infrastructure",
    label: "Infrastructure",
    description: "Critical infrastructure damage or outages",
    keywords: ["infrastructure", "power grid", "bridge", "pipeline", "rail"],
  },
  {
    id: "topic-traffic",
    slug: "traffic",
    label: "Traffic / roads",
    description: "Road closures, congestion, and ground mobility",
    keywords: ["traffic", "road closed", "highway", "checkpoint", "convoy"],
  },
  {
    id: "topic-humanitarian",
    slug: "humanitarian",
    label: "Humanitarian",
    description: "Aid access, famine risk, medical crisis",
    keywords: ["humanitarian", "aid", "famine", "hospital", "relief"],
  },
  {
    id: "topic-cyber",
    slug: "cyber",
    label: "Cyber / info",
    description: "Cyber incidents and information operations",
    keywords: ["cyber", "hack", "ransomware", "disinformation"],
  },
];

export function matchTopics(text: string): Topic[] {
  const lower = text.toLowerCase();
  return TOPIC_CATALOG.filter((t) =>
    t.keywords.some((kw) => lower.includes(kw.toLowerCase())),
  );
}

export function getTopicBySlug(slug: string): Topic | null {
  const s = slug.toLowerCase().trim();
  return TOPIC_CATALOG.find((t) => t.slug === s || t.id === s) ?? null;
}

export function getTopicById(id: string): Topic | null {
  return TOPIC_CATALOG.find((t) => t.id === id) ?? null;
}
