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
    color: "#3B82F6",
    barClass: "bg-[#3B82F6]/80 dark:bg-blue-500/70",
  },
  {
    id: "people",
    title: "People & Culture",
    dimensions: [
      "Employee Involvement",
      "Psychological Safety",
      "Safety Climate",
    ],
    color: "#8B5CF6",
    barClass: "bg-[#8B5CF6]/80 dark:bg-violet-500/60",
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
    color: "#22C55E",
    barClass: "bg-[#22C55E]/80 dark:bg-green-500/60",
  },
  {
    id: "learning",
    title: "Learning & Improvement",
    dimensions: [
      "Safety Communication",
      "Incident Reporting",
      "Organizational Learning",
    ],
    color: "#F97316",
    barClass: "bg-[#F97316]/80 dark:bg-orange-500/60",
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
    color: "#14B8A6",
    barClass: "bg-[#14B8A6]/80 dark:bg-teal-500/60",
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

/** Sunburst shade ladder: inner vital → mid dimension → outer role */
export function vitalShade(
  base: string,
  ring: "vital" | "dimension" | "role"
): string {
  const mix = ring === "vital" ? 0 : ring === "dimension" ? 0.38 : 0.68;
  return mixHexWithWhite(base, mix);
}

function mixHexWithWhite(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const to = (c: number) => c.toString(16).padStart(2, "0");
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
}

export const ROLE_SUNBURST_META: {
  id: RoleFilterId;
  label: string;
  abbr: string;
}[] = [
  { id: "executive", label: "Executive", abbr: "Exec" },
  { id: "manager", label: "Manager", abbr: "Mgr" },
  { id: "superintendent", label: "Superintendent", abbr: "Super" },
  { id: "supervisor", label: "Supervisor", abbr: "Supv" },
  { id: "rank_file", label: "Rank & File", abbr: "R&F" },
];

function scoreToPercent(score: number): number {
  return Math.round((score / 5) * 1000) / 10;
}

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

export type SunburstRoleNode = {
  id: string;
  name: string;
  shortName: string;
  score: number;
  color: string;
  weight: number;
};

export type SunburstDimensionNode = {
  id: string;
  name: string;
  score: number;
  color: string;
  weight: number;
  children?: SunburstRoleNode[];
};

export type SunburstVitalNode = {
  id: string;
  name: string;
  score: number;
  color: string;
  weight: number;
  children: SunburstDimensionNode[];
};

function findRoleRow(
  roleData: Record<string, unknown>[],
  dimensionName: string
): Record<string, unknown> | null {
  const target = normalizeLabel(dimensionName);
  for (const row of roleData || []) {
    const name = normalizeLabel(String(row.dimension || ""));
    if (
      name === target ||
      name.includes(target) ||
      target.includes(name)
    ) {
      return row;
    }
  }
  return null;
}

function rolesForDimension(
  dimensionName: string,
  baseColor: string,
  roleData: Record<string, unknown>[],
  roleFilterIds?: RoleFilterId[]
): SunburstRoleNode[] {
  const row = findRoleRow(roleData, dimensionName);
  if (!row) return [];

  const roles: SunburstRoleNode[] = [];
  const allow =
    roleFilterIds && roleFilterIds.length > 0
      ? ROLE_SUNBURST_META.filter((m) => roleFilterIds.includes(m.id))
      : ROLE_SUNBURST_META;

  for (const meta of allow) {
    for (const [key, value] of Object.entries(row)) {
      if (key === "dimension") continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      if (!roleKeyMatchesFilter(key, meta.id)) continue;
      roles.push({
        id: `${normalizeLabel(dimensionName)}-${meta.id}`,
        name: meta.label,
        shortName: meta.abbr,
        score: scoreToPercent(value),
        color: vitalShade(baseColor, "role"),
        weight: 1,
      });
      break;
    }
  }
  return roles;
}

/** Average score per role across all dimensions (for summary table). */
export function computeRoleOverallScores(
  roleData: Record<string, unknown>[]
): { id: RoleFilterId; label: string; abbr: string; score: number }[] {
  const buckets = new Map<RoleFilterId, number[]>();
  for (const meta of ROLE_SUNBURST_META) buckets.set(meta.id, []);

  for (const row of roleData || []) {
    for (const [key, value] of Object.entries(row)) {
      if (key === "dimension") continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      for (const meta of ROLE_SUNBURST_META) {
        if (roleKeyMatchesFilter(key, meta.id)) {
          buckets.get(meta.id)!.push(scoreToPercent(value));
          break;
        }
      }
    }
  }

  return ROLE_SUNBURST_META.map((meta) => {
    const scores = buckets.get(meta.id) || [];
    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    return {
      id: meta.id,
      label: meta.label,
      abbr: meta.abbr,
      score: Math.round(avg * 10) / 10,
    };
  }).filter((r) => r.score > 0);
}

/**
 * Hierarchy for sunburst: vitals (inner) → dimensions (middle) → roles (outer).
 */
export function buildVitalsSunburstData(
  barData: DimensionScoreRow[],
  roleData: Record<string, unknown>[] = [],
  roleFilterIds?: RoleFilterId[]
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
    const vitalColor = vitalShade(def.color, "vital");
    const dimColor = vitalShade(def.color, "dimension");
    nodes.push({
      id: def.id,
      name: def.title,
      score: Math.round(avg * 10) / 10,
      color: vitalColor,
      weight: dims.length,
      children: dims.map((d, i) => {
        const roleChildren = rolesForDimension(
          d.name,
          def.color,
          roleData,
          roleFilterIds
        );
        return {
          id: `${def.id}-${i}`,
          name: d.name.replace(/^\d+[\.)]\s*/, ""),
          score: Math.round(d.score * 10) / 10,
          color: dimColor,
          weight: 1,
          children: roleChildren.length ? roleChildren : undefined,
        };
      }),
    });
  }

  const other = byVital.get("other")?.dims || [];
  if (other.length) {
    const avg = other.reduce((s, d) => s + d.score, 0) / other.length;
    const base = "#64748b";
    nodes.push({
      id: "other",
      name: "Other",
      score: Math.round(avg * 10) / 10,
      color: vitalShade(base, "vital"),
      weight: other.length,
      children: other.map((d, i) => ({
        id: `other-${i}`,
        name: d.name.replace(/^\d+[\.)]\s*/, ""),
        score: Math.round(d.score * 10) / 10,
        color: vitalShade(base, "dimension"),
        weight: 1,
        children: rolesForDimension(d.name, base, roleData, roleFilterIds),
      })),
    });
  }

  return nodes;
}

