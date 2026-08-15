"use client";

import GaugeComponent from "react-gauge-component";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../../@/components/ui/badge";
import { getLevelLabel, toPercentage } from "../../lib/survey-utils";
import { Sparkles, Lock } from "@/components/icons";
import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "../../lib/utils";

interface GaugeChartProps {
  score: number; // 0 to 5 scale
  bare?: boolean;
  aiInsights?: any;
  isGeneratingAI?: boolean;
  isDemo?: boolean;
  onUpgradeClick?: () => void;
}

const getAISuggestions = (score: number) => {
  if (score >= 4.2) return [
    { title: "Knowledge Mentorship", description: "Your safety culture is elite. Consider peer-to-peer mentorship programs across departments." },
    { title: "Innovation Buffer", description: "Use current stability to trial next-gen safety technologies or autonomous monitoring." }
  ];
  if (score >= 3.4) return [
    { title: "Accountability Focus", description: "Strengthen informal peer-to-peer accountability to reduce reliance on formal supervision." },
    { title: "Leading Indicators", description: "Shift focus toward tracking 'near-miss' quality rather than just quantity." }
  ];
  if (score >= 2.6) return [
    { title: "Proactive Reporting", description: "Improve the reporting interface; friction in reporting is likely hiding minor risks." },
    { title: "System Trust", description: "Employees rely on systems but lack personal ownership. Run 'Safety Choice' workshops." }
  ];
  if (score >= 1.8) return [
    { title: "Supervisor Training", description: "Frontline supervisors need hazard ID training to bridge the gap between rules and practice." },
    { title: "Communication Gap", description: "Standardize safety briefings. Information is being lost in top-down transmission." }
  ];
  return [
    { title: "Compliance Reset", description: "Urgent review of basic safety protocols. Ensure 100% PPE compliance immediately." },
    { title: "Leadership Presence", description: "Management should be visible on the floor to signal that safety is the top priority." }
  ];
};

export default function GaugeChart({
  score,
  bare = false,
  aiInsights,
  isGeneratingAI,
  isDemo,
  onUpgradeClick
}: GaugeChartProps) {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const levelInfo = getLevelLabel(score);
  const aiSuggestions = getAISuggestions(score);
  const pct = toPercentage(score);

  const tickFill = isDark ? "#e2e8f0" : "#334155";
  const tickMutedFill = isDark ? "#94a3b8" : "#64748b";
  const valueFill = isDark ? "#f8fafc" : "#0f172a";
  const labelFont = bare ? "11px" : "10px";

  const GaugeVisual = (
    <div className={cn("relative w-full flex justify-center", bare && "max-w-[460px] mx-auto")}>
      <GaugeComponent
        key={isDark ? "gauge-dark" : "gauge-light"}
        value={pct}
        minValue={20}
        maxValue={100}
        type="radial"
        marginInPercent={
          bare
            ? { top: 0.08, bottom: 0.03, left: 0.09, right: 0.09 }
            : { top: 0.1, bottom: 0.05, left: 0.1, right: 0.1 }
        }
        style={{ width: "100%", overflow: "visible" }}
        labels={{
          tickLabels: {
            type: "outer",
            ticks: [
              {
                value: 20,
                valueConfig: {
                  formatTextValue: () => "1.0",
                  style: { fill: tickMutedFill, fontSize: labelFont },
                },
              },
              {
                value: 28,
                valueConfig: {
                  formatTextValue: () => "Vulnerable",
                  style: {
                    fontSize: labelFont,
                    fontWeight: "bold",
                    fill: tickFill,
                  },
                },
              },
              {
                value: 40,
                valueConfig: {
                  formatTextValue: () => "2.0",
                  style: { fill: tickMutedFill, fontSize: labelFont },
                },
              },
              {
                value: 44,
                valueConfig: {
                  formatTextValue: () => "Managed",
                  style: {
                    fontSize: labelFont,
                    fontWeight: "bold",
                    fill: tickFill,
                  },
                },
              },
              {
                value: 60,
                valueConfig: {
                  formatTextValue: () => "Engaged",
                  style: {
                    fontSize: labelFont,
                    fontWeight: "bold",
                    fill: tickFill,
                  },
                },
              },
              {
                value: 76,
                valueConfig: {
                  formatTextValue: () => "Integrated",
                  style: {
                    fontSize: labelFont,
                    fontWeight: "bold",
                    fill: tickFill,
                  },
                },
              },
              {
                value: 80,
                valueConfig: {
                  formatTextValue: () => "4.0",
                  style: { fill: tickMutedFill, fontSize: labelFont },
                },
              },
              {
                value: 92,
                valueConfig: {
                  formatTextValue: () => "Resilient",
                  style: {
                    fontSize: labelFont,
                    fontWeight: "bold",
                    fill: tickFill,
                  },
                },
              },
              {
                value: 100,
                valueConfig: {
                  formatTextValue: () => "5.0",
                  style: { fill: tickMutedFill, fontSize: labelFont },
                },
              },
            ],
            defaultTickValueConfig: {
              style: { fontSize: labelFont, fill: tickMutedFill },
            },
          },
          valueLabel: {
            formatTextValue: () => `${pct.toFixed(0)}%`,
            style: {
              fontSize: bare ? "28px" : "20px",
              fontWeight: "bold",
              fill: valueFill,
            },
          },
        }}
        arc={{
          colorArray: ["#991b1b", "#dc2626", "#f97316", "#fbbf24", "#22c55e"],
          subArcs: [
            { limit: 36, onMouseMove: () => setHoveredTooltip("Level 1 – Vulnerable"), onMouseLeave: () => setHoveredTooltip(null) },
            { limit: 52, onMouseMove: () => setHoveredTooltip("Level 2 – Managed"), onMouseLeave: () => setHoveredTooltip(null) },
            { limit: 68, onMouseMove: () => setHoveredTooltip("Level 3 – Engaged"), onMouseLeave: () => setHoveredTooltip(null) },
            { limit: 84, onMouseMove: () => setHoveredTooltip("Level 4 – Integrated"), onMouseLeave: () => setHoveredTooltip(null) },
            { limit: 100, onMouseMove: () => setHoveredTooltip("Level 5 – Resilient"), onMouseLeave: () => setHoveredTooltip(null) },
          ],
          padding: 0.01,
          width: bare ? 0.28 : 0.3,
        }}
        pointer={{
          type: "needle",
          elastic: true,
          animationDelay: 0,
          length: 0.7,
          color: isDark ? "#e2e8f0" : "#1e293b",
          baseColor: isDark ? "#94a3b8" : "#475569",
        }}
      />
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 max-w-[260px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-sm font-medium px-3 py-2 rounded-md shadow-xl border border-zinc-800 dark:border-zinc-200 pointer-events-none transition-all duration-300 z-50 text-center",
          hoveredTooltip ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
        )}
      >
        {hoveredTooltip}
      </div>
    </div>
  );

  const ScoreCard = (
    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `linear-gradient(135deg, ${levelInfo.colorCode}22 0%, transparent 58%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: levelInfo.colorCode }}
      />
      <div
        className={cn(
          "relative flex flex-col",
          bare ? "gap-3 p-5 pl-6" : "gap-3 p-3.5 pl-4 md:p-4 md:pl-5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={cn("min-w-0", bare ? "space-y-1" : "space-y-0.5")}>
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                bare ? "text-xs" : "text-[10px] md:text-xs"
              )}
            >
              Your company score
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span
                className={cn(
                  "font-extrabold tracking-tight tabular-nums text-foreground",
                  bare ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
                )}
              >
                {pct.toFixed(0)}
                <span
                  className={cn(
                    "font-bold text-muted-foreground",
                    bare ? "text-2xl" : "text-lg"
                  )}
                >
                  %
                </span>
              </span>
              <span
                className={cn(
                  "text-muted-foreground tabular-nums",
                  bare ? "text-base" : "text-xs md:text-sm"
                )}
              >
                {score.toFixed(2)}
                <span className="text-muted-foreground/70"> / 5.0</span>
              </span>
            </div>
          </div>
          <Badge
            className={cn(
              `${levelInfo.badgeColor} shrink-0 rounded-full border-0 shadow-sm whitespace-nowrap`,
              bare ? "text-xs md:text-sm px-3 py-1.5" : "text-[10px] md:text-xs px-2.5 py-1"
            )}
          >
            {levelInfo.label}
          </Badge>
        </div>

        <div className={cn(bare ? "space-y-1.5" : "space-y-1")}>
          <div className={cn("w-full overflow-hidden rounded-full bg-muted/80", bare ? "h-2.5" : "h-2")}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(Math.max(pct, 0), 100)}%`,
                backgroundColor: levelInfo.colorCode,
              }}
            />
          </div>
          <div
            className={cn(
              "flex justify-between font-medium uppercase tracking-wider text-muted-foreground/80",
              bare ? "text-[11px]" : "text-[9px] md:text-[10px]"
            )}
          >
            <span>Vulnerable</span>
            <span>Resilient</span>
          </div>
        </div>
      </div>
    </div>
  );

  const AiSection = (
    <div
      className={cn(
        "w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl relative overflow-hidden group/ai",
        bare ? "p-5 space-y-3.5" : "p-4 space-y-3",
        isDemo ? "cursor-pointer hover:bg-primary/[0.08] transition-colors" : ""
      )}
      onClick={() => isDemo && onUpgradeClick?.()}
    >
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/ai:opacity-20 transition-opacity">
        <Sparkles className={`text-primary ${isGeneratingAI ? "animate-pulse" : ""} ${bare ? "w-14 h-14" : "w-10 h-10"}`} />
      </div>

      <div
        className={cn(
          "flex items-center gap-2 text-primary font-bold uppercase tracking-wider",
          bare ? "text-sm" : "text-xs",
          isDemo ? "blur-[1.5px] pointer-events-none" : ""
        )}
      >
        <Sparkles className={`${bare ? "w-4 h-4" : "w-3.5 h-3.5"} ${isGeneratingAI ? "animate-spin" : ""}`} />
        AI Recommendations
      </div>

      {isDemo && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-background/10 backdrop-blur-[1px]">
          <Lock className="w-4 h-4 text-primary/80" />
          <span className="text-[10px] font-black text-primary/80 uppercase tracking-tighter">Get full access</span>
        </div>
      )}

      <div
        className={cn(
          "relative z-10",
          bare ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid grid-cols-1 gap-3",
          isDemo ? "blur-[4px] pointer-events-none select-none grayscale opacity-60" : ""
        )}
      >
        {isGeneratingAI ? (
          <div className="space-y-3 col-span-full">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-1/3 bg-primary/20 animate-pulse rounded" />
                <div className="h-3 w-full bg-primary/10 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : (
          (aiInsights?.recommendations || aiSuggestions).map((s: any, i: number) => (
            <div key={i} className={cn("animate-in fade-in slide-in-from-bottom-1 duration-500", bare ? "space-y-1" : "space-y-0.5")}>
              <div className={cn("font-bold text-foreground", bare ? "text-sm" : "text-xs")}>
                {s.title}
              </div>
              <div
                className={cn(
                  "text-muted-foreground",
                  bare ? "text-xs leading-relaxed line-clamp-4" : "text-[11px] leading-snug line-clamp-3"
                )}
              >
                {s.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const Content = bare ? (
    <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
      <div className="shrink-0 md:w-[44%]">{GaugeVisual}</div>
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {ScoreCard}
        {AiSection}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center space-y-4">
      {GaugeVisual}
      {ScoreCard}
      {AiSection}
    </div>
  );

  if (bare) return Content;

  return (
    <Card className="w-full h-full border-0 shadow-none">
      <CardHeader>
        <CardTitle>Performance Score</CardTitle>
      </CardHeader>
      <CardContent>{Content}</CardContent>
    </Card>
  );
}
