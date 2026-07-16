import type {
  LayerVisibility,
  LensBrief,
  SituationBriefs,
  SituationMetrics,
  StakeholderLens,
  TrackLayer,
} from "@/lib/types";

export interface LensConfig {
  id: StakeholderLens;
  label: string;
  shortLabel: string;
  description: string;
  defaultLayers: LayerVisibility;
  metricEmphasis: (keyof SituationMetrics)[];
}

export const LENS_CONFIGS: Record<StakeholderLens, LensConfig> = {
  public: {
    id: "public",
    label: "Public",
    shortLabel: "Public",
    description: "Plain-language safety and situational awareness",
    defaultLayers: {
      conflict: true,
      thermal: true,
      aircraft: false,
      ship: false,
      population: true,
      traffic: false,
      weather: true,
    },
    metricEmphasis: ["populationNear", "conflictCount", "weatherSummary"],
  },
  civic: {
    id: "civic",
    label: "Civic / Political",
    shortLabel: "Civic",
    description: "Constituent impact and briefing talking points",
    defaultLayers: {
      conflict: true,
      thermal: true,
      aircraft: false,
      ship: false,
      population: true,
      traffic: true,
      weather: false,
    },
    metricEmphasis: ["populationNear", "conflictCount", "newsCount"],
  },
  government: {
    id: "government",
    label: "Government",
    shortLabel: "Gov",
    description: "Multi-sensor common operating picture",
    defaultLayers: {
      conflict: true,
      thermal: true,
      aircraft: true,
      ship: true,
      population: true,
      traffic: true,
      weather: true,
    },
    metricEmphasis: [
      "conflictCount",
      "thermalCount",
      "aircraftCount",
      "shipCount",
      "populationNear",
    ],
  },
  business: {
    id: "business",
    label: "Business",
    shortLabel: "Biz",
    description: "Logistics, continuity, and supply-route risk",
    defaultLayers: {
      conflict: true,
      thermal: false,
      aircraft: true,
      ship: true,
      population: false,
      traffic: true,
      weather: true,
    },
    metricEmphasis: [
      "aircraftCount",
      "shipCount",
      "trafficCount",
      "weatherSummary",
    ],
  },
};

export function buildLensBriefs(input: {
  title: string;
  placeName: string;
  topicLabels: string[];
  metrics: SituationMetrics;
  severity: number;
}): SituationBriefs {
  const topics =
    input.topicLabels.length > 0
      ? input.topicLabels.join(", ")
      : "multi-domain activity";
  const pop = input.metrics.populationNear
    ? `~${formatCompact(input.metrics.populationNear)} people in the theater`
    : "population exposure unknown";
  const conflicts = input.metrics.conflictCount ?? 0;
  const air = input.metrics.aircraftCount ?? 0;
  const sea = input.metrics.shipCount ?? 0;
  const traffic = input.metrics.trafficCount ?? 0;
  const weather = input.metrics.weatherSummary ?? "weather context pending";

  const publicBrief: LensBrief = {
    headline: `What's happening in ${input.placeName}`,
    body: `${input.title} — ${topics}. ${severityWord(input.severity)} concern (${input.severity}/5). ${pop}.`,
    bullets: [
      conflicts > 0
        ? `${conflicts} conflict report${conflicts === 1 ? "" : "s"} on the map`
        : "No major conflict signals in this window yet",
      weather,
      "Open linked news for sources; share the link with people who need it",
    ],
    callToAction:
      "Share this link with family or friends so they see the same picture",
  };

  const civicBrief: LensBrief = {
    headline: `Briefing note · ${input.placeName}`,
    body: `What constituents may feel around ${topics}. ${pop}. ${severityWord(input.severity)} (${input.severity}/5).`,
    bullets: [
      `Focus topics: ${topics}`,
      `${conflicts} conflict observation${conflicts === 1 ? "" : "s"} in the current window`,
      `${input.metrics.newsCount ?? 0} news items ready for talking points`,
    ],
    callToAction: "Copy the share link into your briefing packet or email",
  };

  const governmentBrief: LensBrief = {
    headline: `Operating picture · ${input.placeName}`,
    body: `Multi-sensor view: conflict, thermal, air, and sea. ${severityWord(input.severity)} (${input.severity}/5).`,
    bullets: [
      `Sensors: ${conflicts} conflict · ${input.metrics.thermalCount ?? 0} thermal · ${air} air · ${sea} sea`,
      `People near signals: ${pop}`,
      `Road / mobility: ${traffic} · Weather: ${weather}`,
    ],
    callToAction: "Save this area, arm needed layers, and share the deep link",
  };

  const businessBrief: LensBrief = {
    headline: `Continuity risk · ${input.placeName}`,
    body: `Logistics and market exposure from ${topics}. ${severityWord(input.severity)} (${input.severity}/5).`,
    bullets: [
      `Air activity in theater: ${air}`,
      `Maritime tracks: ${sea}`,
      `Road disruptions: ${traffic} · Weather: ${weather}`,
    ],
    callToAction:
      "Check supply corridors and share this view with ops / logistics",
  };

  return {
    public: publicBrief,
    civic: civicBrief,
    government: governmentBrief,
    business: businessBrief,
  };
}

export function layersForLens(lens: StakeholderLens): LayerVisibility {
  return { ...LENS_CONFIGS[lens].defaultLayers };
}

export function allLayerIds(): TrackLayer[] {
  return [
    "conflict",
    "thermal",
    "aircraft",
    "ship",
    "population",
    "traffic",
    "weather",
  ];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function severityWord(severity: number): string {
  if (severity >= 5) return "Critical";
  if (severity >= 4) return "High";
  if (severity >= 3) return "Elevated";
  if (severity >= 2) return "Watch-level";
  return "Low";
}
