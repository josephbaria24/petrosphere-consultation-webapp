"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

export type SunburstNode = {
  id: string;
  name: string;
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
  const maxDepth = 2;
  const ringWidth = (size / 2 - innerHole - 8) / maxDepth;
  const arcs: LaidOutArc[] = [];

  const rootWeight = roots.reduce((s, n) => s + (n.weight ?? 1), 0) || 1;
  let angle = 0;

  const pushArc = (
    node: {
      id: string;
      name: string;
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

  for (const root of roots) {
    const rootSpan = ((root.weight ?? 1) / rootWeight) * 360;
    const rootStart = angle;
    const rootEnd = angle + rootSpan;

    const rootInner = innerHole;
    const rootOuter = innerHole + ringWidth;
    pushArc(
      {
        id: root.id,
        name: root.name,
        score: root.score,
        color: root.color,
        depth: 1,
        parentId: null,
      },
      rootStart,
      rootEnd,
      rootInner,
      rootOuter
    );

    const children = root.children || [];
    const childWeight =
      children.reduce((s, n) => s + (n.weight ?? 1), 0) || children.length || 1;
    let childAngle = rootStart;
    for (const child of children) {
      const childSpan = ((child.weight ?? 1) / childWeight) * rootSpan;
      const childStart = childAngle;
      const childEnd = childAngle + childSpan;
      const childInner = rootOuter + 2;
      const childOuter = childInner + ringWidth;
      pushArc(
        {
          id: child.id,
          name: child.name,
          score: child.score,
          color: child.color,
          depth: 2,
          parentId: root.id,
        },
        childStart,
        childEnd,
        childInner,
        childOuter
      );
      childAngle = childEnd;
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
};

export function VitalsSunburst({
  data,
  className,
  size = 320,
}: VitalsSunburstProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;

  const arcs = useMemo(
    () => layoutSunburst(data, size, Math.max(36, size * 0.14)),
    [data, size]
  );

  const dataById = useMemo(() => {
    const map = new Map<string, SunburstNode>();
    for (const node of data) {
      map.set(node.id, node);
      for (const child of node.children || []) map.set(child.id, child);
    }
    return map;
  }, [data]);

  const selectedArc = selectedId
    ? arcs.find((a) => a.id === selectedId) || null
    : null;
  const hoveredArc = hoveredId
    ? arcs.find((a) => a.id === hoveredId) || null
    : null;
  const focusArc = selectedArc || hoveredArc;

  const selectedVitalId =
    selectedArc?.depth === 1
      ? selectedArc.id
      : selectedArc?.parentId || null;

  const selectedVitalNode = selectedVitalId
    ? data.find((d) => d.id === selectedVitalId) || null
    : null;

  const selectedDimension =
    selectedArc?.depth === 2 ? dataById.get(selectedArc.id) || null : null;

  const center = focusArc
    ? { title: focusArc.name, score: focusArc.score }
    : data.length
      ? {
          title: "Overall",
          score:
            data.reduce((s, n) => s + n.score, 0) / Math.max(data.length, 1),
        }
      : { title: "No data", score: 0 };

  const isEmphasized = (arc: LaidOutArc) => {
    if (selectedId) {
      if (arc.id === selectedId) return true;
      // If a vital is selected, also emphasize its dimensions
      if (selectedArc?.depth === 1 && arc.parentId === selectedId) return true;
      // If a dimension is selected, also emphasize its parent vital
      if (selectedArc?.depth === 2 && arc.id === selectedArc.parentId)
        return true;
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

  return (
    <div className={cn("relative flex flex-col items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full overflow-visible"
        role="img"
        aria-label="Scores by vitals and dimensions sunburst"
      >
        {orderedArcs.map((arc) => {
          const emphasized = isEmphasized(arc);
          const isPrimary =
            selectedId === arc.id || (!selectedId && hoveredId === arc.id);
          const dimmed = (selectedId || hoveredId) && !emphasized;
          const showName = arc.depth === 1 ? arc.span >= 28 : arc.span >= 22;
          const showScore = arc.span >= 14;
          const nameMax =
            arc.depth === 1
              ? arc.span >= 50
                ? 14
                : 9
              : arc.span >= 32
                ? 11
                : 7;
          const fontSize =
            arc.depth === 1 ? (size >= 400 ? 10 : 9) : size >= 400 ? 8 : 7;

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
                stroke="white"
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
                  filter: isPrimary
                    ? "drop-shadow(0 6px 12px rgba(0,0,0,0.22))"
                    : undefined,
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
                      fill="#ffffff"
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {shortLabel(arc.name, nameMax)}
                    </text>
                  )}
                  {showScore && (
                    <text
                      textAnchor="middle"
                      dominantBaseline={showName ? "hanging" : "middle"}
                      y={showName ? 4 : 0}
                      fill="#ffffff"
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth={2}
                      paintOrder="stroke"
                      style={{
                        fontSize: fontSize - 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {arc.score.toFixed(0)}%
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
            r={Math.max(34, size * 0.13)}
            className="fill-background stroke-border"
            strokeWidth={1}
          />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            className="fill-muted-foreground pointer-events-none"
            style={{ fontSize: 10 }}
          >
            {center.title.length > 16
              ? `${center.title.slice(0, 14)}…`
              : center.title}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="fill-foreground font-bold pointer-events-none"
            style={{ fontSize: 16 }}
          >
            {center.score.toFixed(1)}%
          </text>
        </g>
      </svg>

      <AnimatePresence mode="wait">
        {selectedVitalNode ? (
          <motion.div
            key={selectedVitalNode.id + (selectedDimension?.id || "")}
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-md overflow-hidden"
          >
            <div
              className="rounded-xl border border-border/70 bg-muted/25 p-3 shadow-sm"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: selectedVitalNode.color,
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {selectedDimension ? "Dimension detail" : "Inside this vital"}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedDimension
                      ? selectedDimension.name
                      : selectedVitalNode.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums text-white"
                    style={{ backgroundColor: selectedVitalNode.color }}
                  >
                    {(selectedDimension || selectedVitalNode).score.toFixed(1)}%
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

              {selectedDimension ? (
                <p className="text-xs text-muted-foreground">
                  Part of{" "}
                  <span className="font-medium text-foreground">
                    {selectedVitalNode.name}
                  </span>
                  . Click the center or Close to return.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(selectedVitalNode.children || []).map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(child.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-background/80"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground/90">
                          {child.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {child.score.toFixed(1)}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="legend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2"
          >
            {data.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: v.color }}
                />
                <span className="font-medium text-foreground/80">{v.name}</span>
                <span>{v.score.toFixed(0)}%</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedId && (
        <p className="text-[10px] text-muted-foreground">
          Click a slice to enlarge and explore what’s inside
        </p>
      )}
    </div>
  );
}
