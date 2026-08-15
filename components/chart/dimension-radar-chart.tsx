"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "../../lib/utils";
import {
  ROLE_SCORE_FILTERS,
  ROLE_SUNBURST_META,
  type RoleFilterId,
} from "../../lib/vitals-framework";
import { toPercentage } from "../../lib/survey-utils";

export type RoleRadarSeries = {
  key: string;
  label: string;
  color: string;
};

export type DimensionRoleRadarRow = {
  subject: string;
  label: string;
  [roleKey: string]: string | number;
};

type DimensionRadarChartProps = {
  /** One row per dimension; each role is a numeric % field */
  data: DimensionRoleRadarRow[];
  /** One radar polygon per role */
  series: RoleRadarSeries[];
  className?: string;
  bare?: boolean;
};

const ROLE_COLORS: Record<string, string> = {
  executive: "#7C3AED",
  manager: "#3B82F6",
  superintendent: "#06B6D4",
  supervisor: "#F97316",
  rank_file: "#10B981",
};

const FALLBACK_COLORS = [
  "#7C3AED",
  "#3B82F6",
  "#06B6D4",
  "#F97316",
  "#10B981",
  "#EC4899",
  "#84CC16",
];

function shortDimLabel(name: string) {
  const numbered = name.match(/^(\d+)[\.)]\s*(.*)$/);
  if (numbered) {
    const rest = numbered[2].trim();
    if (rest.length <= 10) return `${numbered[1]}. ${rest}`;
    return `${numbered[1]}. ${rest.slice(0, 8)}…`;
  }
  return name.length <= 12 ? name : `${name.slice(0, 10)}…`;
}

function safeKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function matchRoleFilterId(roleKey: string): RoleFilterId | null {
  const norm = roleKey.toLowerCase();
  for (const f of ROLE_SCORE_FILTERS) {
    if (f.match.some((token) => norm === token || norm.includes(token))) {
      return f.id;
    }
  }
  return null;
}

/** Build radar rows + one series per role from dashboard roleData. */
export function buildRoleDimensionRadar(
  roleData: Record<string, unknown>[],
  selectedRoleIds: RoleFilterId[] = []
): { data: DimensionRoleRadarRow[]; series: RoleRadarSeries[] } {
  if (!roleData?.length) return { data: [], series: [] };

  const rawKeys = Array.from(
    new Set(
      roleData.flatMap((row) =>
        Object.keys(row || {}).filter((k) => k !== "dimension")
      )
    )
  );

  const roles = rawKeys
    .map((key, index) => {
      const filterId = matchRoleFilterId(key);
      if (selectedRoleIds.length && filterId && !selectedRoleIds.includes(filterId)) {
        return null;
      }
      if (selectedRoleIds.length && !filterId) return null;

      const meta = filterId
        ? ROLE_SUNBURST_META.find((m) => m.id === filterId)
        : null;
      const seriesKey = filterId || safeKey(key) || `role_${index}`;
      return {
        rawKey: key,
        key: seriesKey,
        label: meta?.label || key,
        color:
          (filterId && ROLE_COLORS[filterId]) ||
          FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        filterId,
      };
    })
    .filter(Boolean) as {
    rawKey: string;
    key: string;
    label: string;
    color: string;
    filterId: RoleFilterId | null;
  }[];

  // Prefer canonical role order
  roles.sort((a, b) => {
    const ia = ROLE_SCORE_FILTERS.findIndex((f) => f.id === a.filterId);
    const ib = ROLE_SCORE_FILTERS.findIndex((f) => f.id === b.filterId);
    const oa = ia === -1 ? 99 : ia;
    const ob = ib === -1 ? 99 : ib;
    return oa - ob || a.label.localeCompare(b.label);
  });

  if (!roles.length) return { data: [], series: [] };

  const data: DimensionRoleRadarRow[] = roleData.map((row) => {
    const subject = String(row.dimension || "Dimension");
    const out: DimensionRoleRadarRow = {
      subject,
      label: shortDimLabel(subject),
    };
    for (const role of roles) {
      const raw = row[role.rawKey];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        out[role.key] = Math.min(Math.max(toPercentage(raw), 0), 100);
      }
    }
    return out;
  });

  return {
    data,
    series: roles.map(({ key, label, color }) => ({ key, label, color })),
  };
}

function RoleRadarTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  series: RoleRadarSeries[];
}) {
  if (!active || !payload?.length) return null;
  const subject = (payload[0] as { payload?: DimensionRoleRadarRow })?.payload
    ?.subject;
  const byKey = new Map(series.map((s) => [s.key, s]));

  return (
    <div className="rounded-xl border border-white/60 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-card/95">
      <p className="mb-1.5 max-w-[240px] text-xs font-semibold text-slate-800 dark:text-foreground">
        {subject}
      </p>
      <div className="space-y-1 text-[11px]">
        {payload.map((entry) => {
          const key = String(entry.dataKey || "");
          const meta = byKey.get(key);
          const value = Number(entry.value);
          if (!Number.isFinite(value)) return null;
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta?.color || entry.color }}
                />
                {meta?.label || key}
              </span>
              <span
                className="font-bold tabular-nums"
                style={{ color: meta?.color || entry.color }}
              >
                {value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DimensionRadarChart({
  data,
  series,
  className,
  bare = false,
}: DimensionRadarChartProps) {
  const chartData = useMemo(() => data || [], [data]);
  const roleSeries = useMemo(() => series || [], [series]);

  const summary = useMemo(() => {
    if (!chartData.length || !roleSeries.length) return null;
    const avgs = roleSeries.map((s) => {
      const vals = chartData
        .map((row) => Number(row[s.key]))
        .filter((n) => Number.isFinite(n));
      const avg =
        vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : null;
      return { ...s, avg };
    });
    const known = avgs.filter((a) => a.avg != null) as Array<
      RoleRadarSeries & { avg: number }
    >;
    const overall =
      known.length > 0
        ? known.reduce((s, a) => s + a.avg, 0) / known.length
        : null;
    const ranked = [...known].sort((a, b) => b.avg - a.avg);
    return {
      overall,
      count: chartData.length,
      roleCount: roleSeries.length,
      highest: ranked[0] || null,
      lowest: ranked[ranked.length - 1] || null,
      avgs: known,
    };
  }, [chartData, roleSeries]);

  if (!chartData.length || !roleSeries.length) {
    return (
      <div
        className={cn(
          "flex h-[320px] items-center justify-center text-sm text-muted-foreground",
          className
        )}
      >
        No role scores available for radar comparison.
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {summary && (
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">
              Scores by role · {summary.roleCount} polygon
              {summary.roleCount === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-foreground">
              {summary.overall != null ? summary.overall.toFixed(1) : "—"}
              <span className="ml-0.5 text-sm font-semibold text-slate-400">
                %
              </span>
            </p>
          </div>
          {summary.highest && summary.lowest && summary.roleCount > 1 && (
            <div className="mb-1 max-w-[55%] text-right text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">
              <span className="font-semibold" style={{ color: summary.highest.color }}>
                {summary.highest.label}
              </span>{" "}
              highest ·{" "}
              <span className="font-semibold" style={{ color: summary.lowest.color }}>
                {summary.lowest.label}
              </span>{" "}
              lowest
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_8px_30px_rgba(124,58,237,0.08)] dark:border-white/10 dark:from-card dark:to-card",
          bare ? "min-h-[420px]" : "min-h-[340px]"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[42%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)",
          }}
        />

        <div className={cn("relative w-full", bare ? "h-[400px]" : "h-[300px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={chartData}
              cx="50%"
              cy="52%"
              outerRadius={bare ? "72%" : "68%"}
              margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
            >
              <PolarGrid
                gridType="polygon"
                stroke="#E2E8F0"
                strokeOpacity={0.9}
              />
              <PolarAngleAxis
                dataKey="label"
                tick={{
                  fill: "#64748B",
                  fontSize: bare ? 11 : 9,
                  fontWeight: 600,
                }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              {roleSeries.map((s) => (
                <Radar
                  key={s.key}
                  name={s.label}
                  dataKey={s.key}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.12}
                  strokeWidth={2.25}
                  dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                  isAnimationActive
                />
              ))}
              <Tooltip
                content={<RoleRadarTooltip series={roleSeries} />}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-slate-100 px-3 py-2.5 dark:border-white/10">
          {roleSeries.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-muted-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
          <span className="text-[10px] text-slate-400 dark:text-muted-foreground">
            {summary?.count} dimensions
          </span>
        </div>
      </div>
    </div>
  );
}
