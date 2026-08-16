"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { cn } from "../../lib/utils";
import { getLevelLabel } from "../../lib/survey-utils";
import {
  computeRoleOverallScores,
  ROLE_SUNBURST_META,
  type DimensionScoreRow,
} from "../../lib/vitals-framework";
import { VitalComplianceCard } from "./safety-vitals-architecture";

export type SunburstNode = {
  id: string;
  name: string;
  /** Short label for tight outer-ring slices (e.g. Mgr). */
  shortName?: string;
  /** Display score (e.g. percent). Also used for color intensity. */
  score: number;
  /** Arc weight within parent (defaults to 1 for equal slices). */
  weight?: number;
  color: string;
  children?: SunburstNode[];
};

type LaidOutArc = {
  id: string;
  name: string;
  shortName?: string;
  score: number;
  color: string;
  depth: number;
  parentId: string | null;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  path: string;
  labelX: number;
  labelY: number;
  span: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = Math.max(endAngle - startAngle, 0.01);
  const end = startAngle + sweep;
  const largeArc = sweep > 180 ? 1 : 0;

  const p1 = polarToCartesian(cx, cy, outerR, end);
  const p2 = polarToCartesian(cx, cy, outerR, startAngle);
  const p3 = polarToCartesian(cx, cy, innerR, startAngle);
  const p4 = polarToCartesian(cx, cy, innerR, end);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function shortLabel(name: string, maxChars: number) {
  const clean = name.replace(/^\d+[\.)]\s*/, "").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(maxChars - 1, 1))}…`;
}

function layoutSunburst(
  roots: SunburstNode[],
  size: number,
  innerHole: number
): LaidOutArc[] {
  const cx = size / 2;
  const cy = size / 2;
  const hasRoles = roots.some((r) =>
    (r.children || []).some((d) => (d.children || []).length > 0)
  );
  const maxDepth = hasRoles ? 3 : 2;
  const usable = size / 2 - innerHole - 6;
  // Outer role ring is thinner than vital/dimension rings (matches sample)
  const ringWidths =
    maxDepth === 3
      ? [usable * 0.34, usable * 0.34, usable * 0.32]
      : [usable * 0.5, usable * 0.5];
  const arcs: LaidOutArc[] = [];

  const rootWeight = roots.reduce((s, n) => s + (n.weight ?? 1), 0) || 1;
  let angle = 0;

  const pushArc = (
    node: {
      id: string;
      name: string;
      shortName?: string;
      score: number;
      color: string;
      depth: number;
      parentId: string | null;
    },
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number
  ) => {
    const span = endAngle - startAngle;
    const midAngle = startAngle + span / 2;
    const midRadius = (innerRadius + outerRadius) / 2;
    const { x: labelX, y: labelY } = polarToCartesian(
      cx,
      cy,
      midRadius,
      midAngle
    );
    arcs.push({
      id: node.id,
      name: node.name,
      shortName: node.shortName,
      score: node.score,
      color: node.color,
      depth: node.depth,
      parentId: node.parentId,
      startAngle,
      endAngle,
      innerRadius,
      outerRadius,
      path: describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle),
      labelX,
      labelY,
      span,
    });
  };

  const layoutChildren = (
    children: SunburstNode[],
    parentId: string,
    parentStart: number,
    parentSpan: number,
    depth: number,
    innerR: number
  ) => {
    if (!children.length || depth > maxDepth) return;
    const childWeight =
      children.reduce((s, n) => s + (n.weight ?? 1), 0) || children.length || 1;
    let childAngle = parentStart;
    const ringW = ringWidths[depth - 1] || usable / maxDepth;
    const gap = 1.5;
    const outerR = innerR + ringW;

    for (const child of children) {
      const childSpan = ((child.weight ?? 1) / childWeight) * parentSpan;
      const childStart = childAngle;
      const childEnd = childAngle + childSpan;
      pushArc(
        {
          id: child.id,
          name: child.name,
          shortName: child.shortName,
          score: child.score,
          color: child.color,
          depth,
          parentId,
        },
        childStart,
        childEnd,
        innerR + gap,
        outerR
      );
      if (child.children?.length) {
        layoutChildren(
          child.children,
          child.id,
          childStart,
          childSpan,
          depth + 1,
          outerR
        );
      }
      childAngle = childEnd;
    }
  };

  for (const root of roots) {
    const rootSpan = ((root.weight ?? 1) / rootWeight) * 360;
    const rootStart = angle;
    const rootEnd = angle + rootSpan;
    const ringW = ringWidths[0];
    const rootOuter = innerHole + ringW;
    pushArc(
      {
        id: root.id,
        name: root.name,
        shortName: root.shortName,
        score: root.score,
        color: root.color,
        depth: 1,
        parentId: null,
      },
      rootStart,
      rootEnd,
      innerHole,
      rootOuter
    );
    if (root.children?.length) {
      layoutChildren(
        root.children,
        root.id,
        rootStart,
        rootSpan,
        2,
        rootOuter
      );
    }
    angle = rootEnd;
  }

  return arcs;
}

function scoreToOpacity(score: number) {
  const t = Math.min(Math.max(score / 100, 0), 1);
  return 0.45 + t * 0.55;
}

type VitalsSunburstProps = {
  data: SunburstNode[];
  className?: string;
  size?: number;
  /** Overall performance score (1–5) — centers the hub color on culture level */
  avgScore?: number;
  /** Role × dimension scores for outer ring + summary table */
  roleData?: Record<string, unknown>[];
  /** Dimension scores for vital compliance card (hover panel) */
  barData?: DimensionScoreRow[];
  /** Expanded modal layout: chart left, panels right */
  variant?: "compact" | "expanded";
};

function buildRoleVitalBreakdown(data: SunburstNode[]) {
  return ROLE_SUNBURST_META.map((role) => {
    const byVital = data.map((vital) => {
      const scores: number[] = [];
      for (const dim of vital.children || []) {
        for (const r of dim.children || []) {
          const key = (r.shortName || r.name || "").toLowerCase();
          if (
            key === role.abbr.toLowerCase() ||
            (r.name || "").toLowerCase() === role.label.toLowerCase()
          ) {
            scores.push(r.score);
          }
        }
      }
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
      return {
        vitalId: vital.id,
        vitalName: vital.name,
        color: vital.color,
        score: avg,
      };
    });
    const known = byVital.filter((v) => v.score != null) as {
      vitalId: string;
      vitalName: string;
      color: string;
      score: number;
    }[];
    const overall =
      known.length > 0
        ? known.reduce((s, v) => s + v.score, 0) / known.length
        : null;
    return { ...role, byVital, overall };
  }).filter((r) => r.overall != null);
}

export function VitalsSunburst({
  data,
  className,
  size = 320,
  avgScore,
  roleData = [],
  barData = [],
  variant = "compact",
}: VitalsSunburstProps) {
  const expanded = variant === "expanded";
  const chartSize = expanded ? Math.max(size, 620) : size;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /** Slice separators — white in light mode, card-dark in dark mode */
  const sliceStroke = isDark ? "#0f172a" : "#ffffff";
  const hubRingStroke = isDark ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.55)";
  const primaryShadow = isDark
    ? "drop-shadow(0 6px 14px rgba(0,0,0,0.55))"
    : "drop-shadow(0 6px 12px rgba(0,0,0,0.22))";

  const labelInk = (depth: number) => {
    if (depth >= 2) {
      // Pale mid/outer rings — dark ink + light halo (readable on both themes)
      return isDark
        ? { fill: "#0f172a", stroke: "rgba(248,250,252,0.92)" }
        : { fill: "#0f172a", stroke: "rgba(255,255,255,0.9)" };
    }
    // Saturated inner vitals — light ink
    return isDark
      ? { fill: "#f8fafc", stroke: "rgba(15,23,42,0.65)" }
      : { fill: "#ffffff", stroke: "rgba(15,23,42,0.55)" };
  };

  const hasRoleRing = data.some((v) =>
    (v.children || []).some((d) => (d.children || []).length > 0)
  );

  const arcs = useMemo(
    () => layoutSunburst(data, chartSize, Math.max(32, chartSize * 0.12)),
    [data, chartSize]
  );

  const dataById = useMemo(() => {
    const map = new Map<string, SunburstNode>();
    const walk = (nodes: SunburstNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(data);
    return map;
  }, [data]);

  const roleOverall = useMemo(
    () => computeRoleOverallScores(roleData),
    [roleData]
  );
  const roleBreakdown = useMemo(
    () => buildRoleVitalBreakdown(data),
    [data]
  );
  const orgOverall =
    roleOverall.length > 0
      ? roleOverall.reduce((s, r) => s + r.score, 0) / roleOverall.length
      : typeof avgScore === "number" && avgScore > 0
        ? (avgScore / 5) * 100
        : data.length
          ? data.reduce((s, n) => s + n.score, 0) / data.length
          : 0;

  const orgLevelInfo =
    orgOverall > 0
      ? getLevelLabel(
          typeof avgScore === "number" && avgScore > 0
            ? avgScore
            : (orgOverall / 100) * 5
        )
      : null;
  const orgLevelOnDark =
    orgLevelInfo != null &&
    (orgLevelInfo.level === 1 ||
      orgLevelInfo.level === 2 ||
      orgLevelInfo.level === 3);

  const selectedArc = selectedId
    ? arcs.find((a) => a.id === selectedId) || null
    : null;
  const hoveredArc = hoveredId
    ? arcs.find((a) => a.id === hoveredId) || null
    : null;
  const focusArc = selectedArc || hoveredArc;

  const selectedVitalId = (() => {
    if (!selectedArc) return null;
    if (selectedArc.depth === 1) return selectedArc.id;
    if (selectedArc.depth === 2) return selectedArc.parentId;
    // depth 3: role → dimension → vital
    const dim = selectedArc.parentId
      ? arcs.find((a) => a.id === selectedArc.parentId)
      : null;
    return dim?.parentId || null;
  })();

  const focusVitalId = (() => {
    const arc = focusArc;
    if (!arc) return null;
    if (arc.depth === 1) return arc.id;
    if (arc.depth === 2) return arc.parentId;
    const dim = arc.parentId
      ? arcs.find((a) => a.id === arc.parentId)
      : null;
    return dim?.parentId || null;
  })();

  const hoverVitalId = (() => {
    const arc = hoveredArc;
    if (!arc) return null;
    if (arc.depth === 1) return arc.id;
    if (arc.depth === 2) return arc.parentId;
    const dim = arc.parentId
      ? arcs.find((a) => a.id === arc.parentId)
      : null;
    return dim?.parentId || null;
  })();

  const previewVitalId = (() => {
    if (!expanded) return null;
    const id = hoverVitalId || selectedVitalId || focusVitalId;
    if (!id || id === "other") return null;
    return id;
  })();

  const selectedVitalNode = selectedVitalId
    ? data.find((d) => d.id === selectedVitalId) || null
    : null;

  const selectedDimension =
    selectedArc?.depth === 2
      ? dataById.get(selectedArc.id) || null
      : selectedArc?.depth === 3 && selectedArc.parentId
        ? dataById.get(selectedArc.parentId) || null
        : null;

  const selectedRole =
    selectedArc?.depth === 3 ? dataById.get(selectedArc.id) || null : null;

  const center = focusArc
    ? { title: focusArc.shortName || focusArc.name, score: focusArc.score }
    : {
        title: "Vital System Overview",
        score: data.length
          ? data.reduce((s, n) => s + n.score, 0) / Math.max(data.length, 1)
          : 0,
      };

  // Hub color follows hovered/selected slice score; otherwise overall performance level
  const hubScoreOnFive =
    focusArc != null
      ? (center.score / 100) * 5
      : typeof avgScore === "number" && avgScore > 0
        ? avgScore
        : center.score > 0
          ? (center.score / 100) * 5
          : 0;
  const levelInfo =
    hubScoreOnFive > 0 ? getLevelLabel(hubScoreOnFive) : null;
  const hubFill = levelInfo?.colorCode ?? undefined;
  const hubTextOnDark =
    levelInfo != null &&
    (levelInfo.level === 1 ||
      levelInfo.level === 2 ||
      levelInfo.level === 3);

  const isEmphasized = (arc: LaidOutArc) => {
    if (selectedId) {
      if (arc.id === selectedId) return true;
      if (selectedArc?.depth === 1) {
        if (arc.parentId === selectedId) return true;
        // roles under selected vital's dimensions
        const dim = arcs.find((a) => a.id === arc.parentId);
        if (dim?.parentId === selectedId) return true;
      }
      if (selectedArc?.depth === 2) {
        if (arc.id === selectedArc.parentId) return true;
        if (arc.parentId === selectedId) return true;
      }
      if (selectedArc?.depth === 3) {
        if (arc.id === selectedArc.parentId) return true;
        const dim = arcs.find((a) => a.id === selectedArc.parentId);
        if (dim && arc.id === dim.parentId) return true;
      }
      return false;
    }
    return hoveredId === arc.id;
  };

  const orderedArcs = useMemo(() => {
    const emphasized = arcs.filter(isEmphasized);
    const rest = arcs.filter((a) => !isEmphasized(a));
    return [...rest, ...emphasized];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcs, selectedId, hoveredId]);

  const handleSelect = (arc: LaidOutArc) => {
    setSelectedId((prev) => (prev === arc.id ? null : arc.id));
  };

  const clearSelection = () => setSelectedId(null);

  const sidePanel = (
    <div
      className={cn(
        "flex flex-col gap-3",
        expanded ? "w-full min-w-0 flex-1 lg:max-h-[min(78vh,820px)] lg:overflow-y-auto" : "w-full max-w-lg px-1"
      )}
    >
      {previewVitalId && (
        <motion.div
          key={previewVitalId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <VitalComplianceCard vitalId={previewVitalId} barData={barData} />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {selectedVitalNode && !previewVitalId ? (
          <motion.div
            key={
              selectedVitalNode.id +
              (selectedDimension?.id || "") +
              (selectedRole?.id || "")
            }
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full overflow-hidden"
          >
            <div
              className="rounded-xl border border-border/70 bg-card p-3 shadow-sm"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: selectedVitalNode.color,
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {selectedRole
                      ? "Role score"
                      : selectedDimension
                        ? "Dimension detail"
                        : "Inside this vital"}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedRole
                      ? `${selectedRole.name} · ${selectedDimension?.name || ""}`
                      : selectedDimension
                        ? selectedDimension.name
                        : selectedVitalNode.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums text-white"
                    style={{ backgroundColor: selectedVitalNode.color }}
                  >
                    {(
                      selectedRole ||
                      selectedDimension ||
                      selectedVitalNode
                    ).score.toFixed(1)}
                    %
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
              </div>

              {selectedRole ? (
                <p className="text-xs text-slate-600 dark:text-muted-foreground">
                  Within{" "}
                  <span className="font-medium text-foreground">
                    {selectedDimension?.name}
                  </span>{" "}
                  · {selectedVitalNode.name}
                </p>
              ) : selectedDimension ? (
                <ul className="space-y-1.5">
                  {(selectedDimension.children || []).length ? (
                    (selectedDimension.children || []).map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(child.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60"
                        >
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {child.shortName || child.name}
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-foreground">
                            {child.score.toFixed(1)}%
                          </span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No role breakdown for this dimension.
                    </p>
                  )}
                </ul>
              ) : (
                <ul className="space-y-1.5">
                  {(selectedVitalNode.children || []).map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(child.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {child.name}
                        </span>
                        <span className="shrink-0 tabular-nums font-semibold text-foreground">
                          {child.score.toFixed(1)}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : previewVitalId ? null : (
          <motion.div
            key="legend-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col gap-3"
          >
            <div
              className={cn(
                "flex flex-wrap gap-x-3 gap-y-1.5",
                expanded ? "justify-start" : "justify-center"
              )}
            >
              {data.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 transition-colors hover:text-foreground dark:text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: v.color }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-foreground/90">
                    {i + 1}. {v.name}
                  </span>
                  <span className="tabular-nums font-medium text-slate-700 dark:text-foreground/80">
                    {v.score.toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>

            {hasRoleRing && (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-2",
                  expanded ? "justify-start" : "justify-center"
                )}
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-muted-foreground">
                  Roles
                </span>
                {ROLE_SUNBURST_META.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-muted-foreground"
                  >
                    <span className="font-semibold text-slate-800 dark:text-foreground/90">
                      {r.abbr}
                    </span>
                    <span>{r.label}</span>
                  </span>
                ))}
              </div>
            )}

            {expanded && roleBreakdown.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-muted-foreground">
                  Score breakdown by role / position
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-semibold">Role</th>
                        {data.map((v) => (
                          <th
                            key={v.id}
                            className="px-2 py-2 font-semibold whitespace-nowrap"
                            title={v.name}
                          >
                            <span
                              className="mr-1 inline-block h-1.5 w-1.5 rounded-sm align-middle"
                              style={{ backgroundColor: v.color }}
                            />
                            {v.name.split(" ")[0]}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-semibold text-right">
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleBreakdown.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-foreground">
                            <span className="text-slate-500">{row.abbr}</span>{" "}
                            {row.label}
                          </td>
                          {row.byVital.map((cell) => (
                            <td
                              key={cell.vitalId}
                              className="px-2 py-2 tabular-nums text-slate-700 dark:text-foreground/85"
                            >
                              {cell.score != null
                                ? `${cell.score.toFixed(0)}%`
                                : "—"}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900 dark:text-foreground">
                            {row.overall != null
                              ? `${row.overall.toFixed(0)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {roleOverall.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#0f2744]/20 bg-[#0f2744] text-white shadow-md">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
                  Overall Vital System Score
                </div>
                <div className="divide-y divide-white/10 px-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                    <span>Role</span>
                    <span>Overall Score</span>
                  </div>
                  {roleOverall.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[1fr_auto] gap-2 py-1.5 text-xs"
                    >
                      <span className="text-white/95">{r.label}</span>
                      <span className="tabular-nums font-semibold text-white">
                        {r.score.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className={cn(
                    "mt-1 px-3 py-2 text-xs font-bold",
                    orgLevelOnDark ? "text-white" : "text-slate-950"
                  )}
                  style={{
                    backgroundColor: orgLevelInfo?.colorCode ?? "#22c55e",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Overall Organization Score</span>
                    <span className="tabular-nums text-sm">
                      {orgOverall.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedId && !previewVitalId && (
        <p className={cn(
          "text-[10px] text-slate-500 dark:text-muted-foreground",
          expanded ? "text-left" : "text-center"
        )}>
          {expanded
            ? "Hover a vital to preview its card and dimension compliance"
            : hasRoleRing
              ? "5 Vital Systems · Dimensions · Roles — hover or click a slice"
              : "Click a slice to enlarge and explore what’s inside"}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "relative",
        expanded
          ? "flex w-full flex-col items-stretch gap-5 lg:flex-row lg:items-start lg:gap-6"
          : "flex flex-col items-center gap-3",
        className
      )}
    >
      <div
        className={cn(
          "shrink-0",
          expanded ? "mx-auto lg:mx-0" : ""
        )}
      >
      <svg
        key={isDark ? "sunburst-dark" : "sunburst-light"}
        width={chartSize}
        height={chartSize}
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        className="max-w-full overflow-visible"
        role="img"
        aria-label="Scores by vitals and dimensions sunburst"
      >
        {orderedArcs.map((arc) => {
          const emphasized = isEmphasized(arc);
          const isPrimary =
            selectedId === arc.id || (!selectedId && hoveredId === arc.id);
          const dimmed = (selectedId || hoveredId) && !emphasized;
          const showName =
            arc.depth === 1
              ? arc.span >= 26
              : arc.depth === 2
                ? arc.span >= 18
                : false;
          const showScore =
            arc.depth === 3 ? arc.span >= 6.5 : arc.span >= 12;
          const displayName =
            arc.depth === 3
              ? arc.shortName || shortLabel(arc.name, 5)
              : shortLabel(
                  arc.name,
                  arc.depth === 1
                    ? arc.span >= 50
                      ? 14
                      : 10
                    : arc.span >= 28
                      ? 12
                      : 8
                );
          const fontSize =
            arc.depth === 1
              ? chartSize >= 500
                ? 12
                : chartSize >= 400
                  ? 10
                  : 9
              : arc.depth === 2
                ? chartSize >= 500
                  ? 10
                  : chartSize >= 400
                    ? 8
                    : 7
                : chartSize >= 500
                  ? 8
                  : 6.5;
          const ink = labelInk(arc.depth);

          return (
            <motion.g
              key={arc.id}
              initial={false}
              animate={{
                scale: isPrimary ? 1.14 : emphasized ? 1.06 : 1,
                opacity: dimmed ? 0.28 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 26,
                mass: 0.7,
              }}
              style={{
                transformOrigin: `${arc.labelX}px ${arc.labelY}px`,
                transformBox: "view-box",
              }}
              onMouseEnter={() => setHoveredId(arc.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(arc);
              }}
              onFocus={() => setHoveredId(arc.id)}
              onBlur={() => setHoveredId(null)}
            >
              <path
                d={arc.path}
                fill={arc.color}
                fillOpacity={
                  isPrimary
                    ? Math.min(scoreToOpacity(arc.score) + 0.14, 1)
                    : scoreToOpacity(arc.score)
                }
                stroke={sliceStroke}
                strokeWidth={isPrimary ? 2.25 : 1.5}
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-pressed={selectedId === arc.id}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(arc);
                  }
                }}
                style={{
                  filter: isPrimary ? primaryShadow : undefined,
                }}
              >
                <title>
                  {arc.name}: {arc.score.toFixed(1)}% — click for details
                </title>
              </path>

              {(showName || showScore) && (
                <g
                  transform={`translate(${arc.labelX}, ${arc.labelY})`}
                  pointerEvents="none"
                >
                  {showName && (
                    <text
                      textAnchor="middle"
                      dominantBaseline={showScore ? "auto" : "middle"}
                      y={showScore ? -5 : 0}
                      fill={ink.fill}
                      stroke={ink.stroke}
                      strokeWidth={arc.depth >= 2 ? 3 : 2.75}
                      paintOrder="stroke"
                      style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {displayName}
                    </text>
                  )}
                  {showScore && (
                    <text
                      textAnchor="middle"
                      dominantBaseline={showName ? "hanging" : "middle"}
                      y={showName ? 4 : 0}
                      fill={ink.fill}
                      stroke={ink.stroke}
                      strokeWidth={arc.depth >= 2 ? 3 : 2.5}
                      paintOrder="stroke"
                      style={{
                        fontSize: Math.max(fontSize - 0.5, 6),
                        fontWeight: 700,
                      }}
                    >
                      {arc.depth === 3
                        ? `${displayName} ${arc.score.toFixed(0)}%`
                        : `${arc.score.toFixed(0)}%`}
                    </text>
                  )}
                </g>
              )}
            </motion.g>
          );
        })}

        <g
          className="cursor-pointer"
          onClick={clearSelection}
          role="button"
          aria-label="Clear selection"
        >
          <circle
            cx={cx}
            cy={cy}
            r={Math.max(34, chartSize * 0.13)}
            className={hubFill ? undefined : "fill-background stroke-border"}
            fill={hubFill || undefined}
            stroke={hubFill ? hubRingStroke : undefined}
            strokeWidth={1.25}
            style={{ transition: "fill 220ms ease, stroke 220ms ease" }}
          />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            className={cn(
              "pointer-events-none",
              hubFill
                ? hubTextOnDark
                  ? "fill-white/90"
                  : "fill-slate-900/80"
                : "fill-muted-foreground"
            )}
            style={{ fontSize: chartSize >= 500 ? 11 : 10 }}
          >
            {center.title.length > 18
              ? `${center.title.slice(0, 16)}…`
              : center.title}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className={cn(
              "font-bold pointer-events-none",
              hubFill
                ? hubTextOnDark
                  ? "fill-white"
                  : "fill-slate-950"
                : "fill-foreground"
            )}
            style={{ fontSize: chartSize >= 500 ? 18 : 16 }}
          >
            {center.score.toFixed(1)}%
          </text>
        </g>
      </svg>
      </div>

      {sidePanel}
    </div>
  );
}
