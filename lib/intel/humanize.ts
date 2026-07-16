"use client";

/** Human-readable severity and "why care" copy for non-ops users. */

export function severityLabel(severity: number): string {
  if (severity >= 5) return "Critical";
  if (severity >= 4) return "High";
  if (severity >= 3) return "Elevated";
  if (severity >= 2) return "Watch";
  return "Low";
}

export function severityPlain(severity: number): string {
  if (severity >= 5) return "Critical — widespread or severe impact likely";
  if (severity >= 4) return "High concern — significant disruption or violence";
  if (severity >= 3) return "Elevated — activity worth monitoring closely";
  if (severity >= 2) return "Watch — limited signals, stay informed";
  return "Low — sparse activity in this window";
}

export function whyItMatters(input: {
  severity: number;
  conflictCount?: number;
  populationNear?: number;
  placeName?: string;
}): string {
  const place = input.placeName ? ` near ${input.placeName}` : "";
  const conflicts = input.conflictCount ?? 0;
  const pop = input.populationNear;

  if (conflicts > 0 && pop && pop > 50_000) {
    return `${conflicts} conflict signal${conflicts === 1 ? "" : "s"}${place} with ~${formatPop(pop)} people nearby.`;
  }
  if (conflicts > 0) {
    return `${conflicts} conflict signal${conflicts === 1 ? "" : "s"} mapped${place}. ${severityPlain(input.severity)}.`;
  }
  if (pop && pop > 100_000) {
    return `Dense population (~${formatPop(pop)})${place} — disruption here affects many people.`;
  }
  return severityPlain(input.severity);
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}
