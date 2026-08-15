/**
 * Safety Vitals™ framework — map dimensions ↔ vital systems for scoring views.
 */

export type VitalId =
  | "leadership"
  | "people"
  | "risk"
  | "learning"
  | "capability";

export type VitalDefinition = {
  id: VitalId;
  title: string;
  /** Canonical dimension names (matched flexibly against survey labels). */
  dimensions: string[];
  color: string;
  barClass: string;
};

export const VITAL_DEFINITIONS: VitalDefinition[] = [
  {
    id: "leadership",
    title: "Leadership",
    dimensions: [
      "Management Commitment",
      "Supervisory Safety Support",
      "Safety Accountability & Recognition",
      "Safety Accountability and Recognition",
    ],
    color: "#5b7c99",
    barClass: "bg-[#5b7c99]/80 dark:bg-slate-500/70",
  },
  {
    id: "people",
    title: "People & Culture",
    dimensions: [
      "Employee Involvement",
      "Psychological Safety",
      "Safety Climate",
    ],
    color: "#8b6faf",
    barClass: "bg-[#8b6faf]/80 dark:bg-violet-500/60",
  },
  {
    id: "risk",
    title: "Risk & Operational Control",
    dimensions: [
      "Risk Awareness",
      "Safety Rules & Compliance",
      "Safety Rules and Compliance",
      "Contractor Safety Alignment",
    ],
    color: "#4a9b8e",
    barClass: "bg-[#4a9b8e]/80 dark:bg-teal-500/60",
  },
  {
    id: "learning",
    title: "Learning & Improvement",
    dimensions: [
      "Safety Communication",
      "Incident Reporting",
      "Organizational Learning",
    ],
    color: "#d4894a",
    barClass: "bg-[#d4894a]/80 dark:bg-orange-500/60",
  },
  {
    id: "capability",
    title: "Capability & Resilience",
    dimensions: [
      "Safety Training",
      "Safety Resources",
      "Work-Life Balance & Stress",
      "Work-Life Balance and Stress",
    ],
    color: "#5f9e6e",
    barClass: "bg-[#5f9e6e]/80 dark:bg-emerald-500/60",
  },
];

function normalizeLabel(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/^\d+[\.)]\s*/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchDimensionToVital(
  dimensionName: string
): VitalDefinition | null {
  const target = normalizeLabel(dimensionName);
  if (!target) return null;

  for (const vital of VITAL_DEFINITIONS) {
    for (const dim of vital.dimensions) {
      const canon = normalizeLabel(dim);
      if (
        target === canon ||
        target.includes(canon) ||
        canon.includes(target)
      ) {
        return vital;
      }
    }
  }
  return null;
}

export type DimensionScoreRow = {
  name?: string;
  scorePercent?: number;
  score?: number;
};

export type VitalScoreRow = {
  id: VitalId | "other";
  name: string;
  value: number;
  dimensionCount: number;
  color: string;
  barClass: string;
};

/** Average dimension % scores into the five vital systems. */
export function aggregateScoresByVital(
  barData: DimensionScoreRow[]
): VitalScoreRow[] {
  const buckets = new Map<
    string,
    { vital: VitalDefinition | null; scores: number[] }
  >();

  for (const def of VITAL_DEFINITIONS) {
    buckets.set(def.id, { vital: def, scores: [] });
  }

  for (const row of barData || []) {
    const pct = Number(row.scorePercent);
    if (!Number.isFinite(pct)) continue;
    const vital = matchDimensionToVital(String(row.name || ""));
    const key = vital?.id || "other";
    if (!buckets.has(key)) {
      buckets.set(key, { vital: null, scores: [] });
    }
    buckets.get(key)!.scores.push(pct);
  }

  const rows: VitalScoreRow[] = [];
  for (const def of VITAL_DEFINITIONS) {
    const scores = buckets.get(def.id)?.scores || [];
    if (!scores.length) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    rows.push({
      id: def.id,
      name: def.title,
      value: Math.round(avg * 10) / 10,
      dimensionCount: scores.length,
      color: def.color,
      barClass: def.barClass,
    });
  }

  const other = buckets.get("other")?.scores || [];
  if (other.length) {
    const avg = other.reduce((a, b) => a + b, 0) / other.length;
    rows.push({
      id: "other",
      name: "Other dimensions",
      value: Math.round(avg * 10) / 10,
      dimensionCount: other.length,
      color: "#64748b",
      barClass: "bg-slate-400/80 dark:bg-slate-600/70",
    });
  }

  return rows;
}

/** Canonical role filters shown on the dashboard score card. */
export const ROLE_SCORE_FILTERS = [
  {
    id: "executive",
    label: "Executive",
    match: ["executive"],
  },
  {
    id: "manager",
    label: "Manager",
    match: ["manager"],
  },
  {
    id: "superintendent",
    label: "Superintendent",
    match: ["superintendent"],
  },
  {
    id: "supervisor",
    label: "Supervisor",
    match: ["supervisor"],
  },
  {
    id: "rank_file",
    label: "Rank & File",
    match: ["rank", "rank and file", "employees", "employee"],
  },
] as const;

export type RoleFilterId = (typeof ROLE_SCORE_FILTERS)[number]["id"];

function roleKeyMatchesFilter(roleKey: string, filterId: RoleFilterId): boolean {
  const norm = normalizeLabel(roleKey);
  const filter = ROLE_SCORE_FILTERS.find((f) => f.id === filterId);
  if (!filter) return false;
  return filter.match.some(
    (token) => norm === token || norm.includes(token)
  );
}

/**
 * Build dimension % rows from roleData, averaging only the selected roles.
 * Falls back to overall barData when no roles selected or no role matches.
 */
export function barDataForSelectedRoles(
  roleData: Record<string, unknown>[],
  selectedRoleIds: RoleFilterId[],
  fallbackBarData: DimensionScoreRow[]
): DimensionScoreRow[] {
  if (!selectedRoleIds.length || !roleData?.length) {
    return fallbackBarData || [];
  }

  const rows: DimensionScoreRow[] = [];
  for (const row of roleData) {
    const name = String(row.dimension || "");
    if (!name) continue;

    const scores: number[] = [];
    for (const [key, value] of Object.entries(row)) {
      if (key === "dimension") continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      if (selectedRoleIds.some((id) => roleKeyMatchesFilter(key, id))) {
        // roleData stores 1–5 scale
        scores.push(value);
      }
    }

    if (!scores.length) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    rows.push({
      name,
      score: avg,
      scorePercent: (avg / 5) * 100,
    });
  }

  return rows.length ? rows : fallbackBarData || [];
}

export type SunburstVitalNode = {
  id: string;
  name: string;
  score: number;
  color: string;
  weight: number;
  children: {
    id: string;
    name: string;
    score: number;
    color: string;
    weight: number;
  }[];
};

/** Hierarchy for sunburst: vitals (inner) → dimensions (outer). */
export function buildVitalsSunburstData(
  barData: DimensionScoreRow[]
): SunburstVitalNode[] {
  const byVital = new Map<
    string,
    { def: VitalDefinition | null; dims: { name: string; score: number }[] }
  >();

  for (const def of VITAL_DEFINITIONS) {
    byVital.set(def.id, { def, dims: [] });
  }

  for (const row of barData || []) {
    const pct = Number(row.scorePercent);
    if (!Number.isFinite(pct)) continue;
    const name = String(row.name || "Dimension");
    const vital = matchDimensionToVital(name);
    const key = vital?.id || "other";
    if (!byVital.has(key)) {
      byVital.set(key, { def: null, dims: [] });
    }
    byVital.get(key)!.dims.push({ name, score: pct });
  }

  const nodes: SunburstVitalNode[] = [];
  for (const def of VITAL_DEFINITIONS) {
    const bucket = byVital.get(def.id);
    const dims = bucket?.dims || [];
    if (!dims.length) continue;
    const avg = dims.reduce((s, d) => s + d.score, 0) / dims.length;
    nodes.push({
      id: def.id,
      name: def.title,
      score: Math.round(avg * 10) / 10,
      color: def.color,
      weight: dims.length,
      children: dims.map((d, i) => ({
        id: `${def.id}-${i}`,
        name: d.name.replace(/^\d+[\.)]\s*/, ""),
        score: Math.round(d.score * 10) / 10,
        color: def.color,
        weight: 1,
      })),
    });
  }

  const other = byVital.get("other")?.dims || [];
  if (other.length) {
    const avg = other.reduce((s, d) => s + d.score, 0) / other.length;
    nodes.push({
      id: "other",
      name: "Other",
      score: Math.round(avg * 10) / 10,
      color: "#64748b",
      weight: other.length,
      children: other.map((d, i) => ({
        id: `other-${i}`,
        name: d.name.replace(/^\d+[\.)]\s*/, ""),
        score: Math.round(d.score * 10) / 10,
        color: "#64748b",
        weight: 1,
      })),
    });
  }

  return nodes;
}

