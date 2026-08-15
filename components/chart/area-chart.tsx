"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface RoleAreaChartProps {
  data: Record<string, string | number | null | undefined>[];
  bare?: boolean;
  showAnalysis?: boolean;
}

const ROLE_HEX = [
  "#3B82F6",
  "#06B6D4",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#84CC16",
  "#D946EF",
  "#6B7280",
];

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 3.5;

const toPercentage = (score: number): number =>
  ((score - 1) / (5 - 1)) * 100;

const valueFormatter = (number: number) =>
  `${Intl.NumberFormat("us", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(number)}%`;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function shortDimension(label: string): string {
  const match = label.match(/^(\d+)\./);
  if (match) return match[1];
  return label.length > 14 ? `${label.slice(0, 12)}…` : label;
}

function getRoles(
  data: Record<string, string | number | null | undefined>[]
): string[] {
  if (!data.length) return [];
  return Array.from(
    new Set(
      data.flatMap((row) => Object.keys(row).filter((k) => k !== "dimension"))
    )
  );
}

function touchDistance(a: React.Touch, b: React.Touch) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

/** Smooth wheel / pinch zoom wrapper (enlarge mode). */
function ZoomableChartFrame({
  enabled,
  className,
  style,
  children,
}: {
  enabled: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const targetZoom = useRef(1);
  const displayZoom = useRef(1);
  const rafRef = useRef<number | null>(null);
  const pinchDist = useRef<number | null>(null);
  const pinchZoom = useRef(1);

  const settleZoom = useCallback((next: number) => {
    targetZoom.current = clamp(next, ZOOM_MIN, ZOOM_MAX);
    const step = () => {
      const current = displayZoom.current;
      const diff = targetZoom.current - current;
      if (Math.abs(diff) < 0.0015) {
        displayZoom.current = targetZoom.current;
        setZoom(targetZoom.current);
        rafRef.current = null;
        return;
      }
      displayZoom.current = current + diff * 0.22;
      setZoom(displayZoom.current);
      rafRef.current = requestAnimationFrame(step);
    };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(step);
    }
  }, []);

  const resetZoom = useCallback(() => {
    settleZoom(1);
  }, [settleZoom]);

  useEffect(() => {
    if (!enabled) return;
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const intensity = e.ctrlKey ? 0.012 : 0.0018;
      const factor = Math.exp(-e.deltaY * intensity);
      settleZoom(targetZoom.current * factor);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, settleZoom]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 2) return;
    pinchDist.current = touchDistance(e.touches[0], e.touches[1]);
    pinchZoom.current = targetZoom.current;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 2 || pinchDist.current == null) return;
    e.preventDefault();
    const dist = touchDistance(e.touches[0], e.touches[1]);
    const ratio = dist / pinchDist.current;
    settleZoom(pinchZoom.current * ratio);
  };

  const onTouchEnd = () => {
    pinchDist.current = null;
  };

  if (!enabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const baseMinHeight = 420;
  const baseHeight =
    typeof style?.height === "number"
      ? style.height
      : typeof style?.minHeight === "number"
        ? style.minHeight
        : baseMinHeight;

  return (
    <div className="relative w-full space-y-1.5">
      <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="rounded-md border border-border/70 px-2 py-0.5 text-[10px] font-medium hover:bg-muted/60 transition-colors disabled:opacity-40"
          onClick={resetZoom}
          disabled={Math.abs(zoom - 1) < 0.02}
        >
          Reset
        </button>
        <span className="hidden sm:inline text-[10px] opacity-70">
          Scroll or pinch to zoom
        </span>
      </div>
      <div
        ref={viewportRef}
        className="relative w-full overflow-auto rounded-lg border border-border/40 bg-muted/10 touch-none overscroll-contain"
        style={{
          height:
            typeof style?.height === "string"
              ? style.height
              : typeof baseHeight === "number"
                ? baseHeight
                : "min(560px, 65vh)",
          minHeight: baseMinHeight,
          minWidth: 0,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={resetZoom}
      >
        <div
          className="w-full"
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            minHeight: baseMinHeight * zoom,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export type RoleScoreSummary = {
  roleCount: number;
  dimensionCount: number;
  overallAvg: number;
  highest: { name: string; avg: number };
  lowest: { name: string; avg: number };
  gap: number;
  widestGapDimension: { name: string; spread: number } | null;
};

export function summarizeRoleScores(
  data: Record<string, string | number | null | undefined>[]
): RoleScoreSummary | null {
  const roles = getRoles(data);
  if (!data.length || !roles.length) return null;

  const roleTotals: Record<string, { sum: number; count: number }> = {};
  roles.forEach((r) => {
    roleTotals[r] = { sum: 0, count: 0 };
  });

  let widestGapDimension: { name: string; spread: number } | null = null;

  data.forEach((row) => {
    const dimScores: number[] = [];
    roles.forEach((role) => {
      const raw = row[role];
      if (typeof raw !== "number" || Number.isNaN(raw)) return;
      const pct = toPercentage(raw);
      roleTotals[role].sum += pct;
      roleTotals[role].count += 1;
      dimScores.push(pct);
    });
    if (dimScores.length >= 2) {
      const spread = Math.max(...dimScores) - Math.min(...dimScores);
      const dimName = String(row.dimension ?? "—");
      if (!widestGapDimension || spread > widestGapDimension.spread) {
        widestGapDimension = { name: dimName, spread };
      }
    }
  });

  const roleAvgs = roles
    .map((name) => {
      const t = roleTotals[name];
      if (!t.count) return null;
      return { name, avg: t.sum / t.count };
    })
    .filter(Boolean) as { name: string; avg: number }[];

  if (!roleAvgs.length) return null;

  const highest = roleAvgs.reduce((a, b) => (b.avg > a.avg ? b : a));
  const lowest = roleAvgs.reduce((a, b) => (b.avg < a.avg ? b : a));
  const overallAvg =
    roleAvgs.reduce((s, r) => s + r.avg, 0) / roleAvgs.length;

  return {
    roleCount: roleAvgs.length,
    dimensionCount: data.length,
    overallAvg,
    highest,
    lowest,
    gap: highest.avg - lowest.avg,
    widestGapDimension:
      widestGapDimension && widestGapDimension.spread > 0
        ? widestGapDimension
        : null,
  };
}

export function RoleAnalysisFooter({
  data,
  className = "",
}: {
  data: Record<string, string | number | null | undefined>[];
  className?: string;
}) {
  const summary = summarizeRoleScores(data);
  if (!summary) return null;

  return (
    <p
      className={`text-xs text-muted-foreground leading-relaxed border-t pt-3 px-0.5 ${className}`}
    >
      Across{" "}
      <span className="font-medium text-foreground">{summary.roleCount}</span>{" "}
      roles and{" "}
      <span className="font-medium text-foreground">
        {summary.dimensionCount}
      </span>{" "}
      dimensions, average is{" "}
      <span className="font-medium text-foreground">
        {summary.overallAvg.toFixed(1)}%
      </span>
      . Highest:{" "}
      <span className="font-medium text-emerald-700 dark:text-emerald-400">
        {summary.highest.name}
      </span>{" "}
      ({summary.highest.avg.toFixed(1)}%). Lowest:{" "}
      <span className="font-medium text-amber-700 dark:text-amber-400">
        {summary.lowest.name}
      </span>{" "}
      ({summary.lowest.avg.toFixed(1)}%). Role gap:{" "}
      <span className="font-medium text-foreground">
        {summary.gap.toFixed(1)} pts
      </span>
      {summary.widestGapDimension ? (
        <>
          . Widest split on{" "}
          <span className="font-medium text-foreground">
            {summary.widestGapDimension.name}
          </span>{" "}
          ({summary.widestGapDimension.spread.toFixed(1)} pts).
        </>
      ) : (
        "."
      )}
    </p>
  );
}

function RoleTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number;
    color?: string;
    name?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            key={String(item.dataKey)}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name || String(item.dataKey)}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {valueFormatter(Number(item.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoleAreaChart({
  data,
  bare,
  showAnalysis = false,
}: RoleAreaChartProps) {
  const roles = getRoles(data);

  if (data.length === 0 || roles.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No role-based data available yet.
      </p>
    );
  }

  const percentData = data.map((row) => {
    const newRow: Record<string, string | number> = {
      dimension: String(row.dimension ?? ""),
    };
    roles.forEach((role) => {
      const score = row[role];
      if (typeof score === "number" && !Number.isNaN(score)) {
        newRow[role] = Math.round(toPercentage(score) * 10) / 10;
      }
    });
    roles.forEach((role) => {
      if (typeof newRow[role] !== "number") {
        newRow[role] = 0;
      }
    });
    return newRow;
  });

  const height = bare ? 560 : 320;
  const chartClass = bare
    ? "w-full min-h-[420px] h-[min(560px,65vh)]"
    : "w-full min-h-[240px]";

  return (
    <div className="w-full space-y-3">
      <ZoomableChartFrame
        enabled={!!bare}
        className={chartClass}
        style={
          bare
            ? { minWidth: 0, height: "min(560px, 65vh)", minHeight: 420 }
            : { height, minWidth: 0 }
        }
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={bare ? 420 : 240}
        >
          <AreaChart
            data={percentData}
            margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="dimension"
              tickFormatter={shortDimension}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              minTickGap={8}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
            />
            <Tooltip content={<RoleTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
            />
            {roles.map((role, i) => {
              const color = ROLE_HEX[i % ROLE_HEX.length];
              return (
                <Area
                  key={role}
                  type="monotone"
                  dataKey={role}
                  name={role}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2.5}
                  connectNulls
                  dot={{ r: 3, strokeWidth: 1, stroke: "#fff", fill: color }}
                  activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff" }}
                  isAnimationActive={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </ZoomableChartFrame>
      {showAnalysis && <RoleAnalysisFooter data={data} />}
    </div>
  );
}
