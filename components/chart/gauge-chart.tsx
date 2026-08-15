"use client";

import GaugeComponent from "react-gauge-component";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../../@/components/ui/badge";
import { getLevelLabel, toPercentage } from "../../lib/survey-utils";

interface GaugeChartProps {
  score: number; // 0 to 5 scale
  bare?: boolean; // ✅ add this
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

import { Sparkles, Lock } from "@/components/icons";
import { useState } from "react";

export default function GaugeChart({
  score,
  bare = false,
  aiInsights,
  isGeneratingAI,
  isDemo,
  onUpgradeClick
}: GaugeChartProps) {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const levelInfo = getLevelLabel(score);
  const aiSuggestions = getAISuggestions(score);
  const Content = (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full flex justify-center">
        <GaugeComponent
          value={toPercentage(score)}
          minValue={20}
          maxValue={100}
          type="radial"
          marginInPercent={{ top: 0.1, bottom: 0.05, left: 0.1, right: 0.1 }}
          style={{ width: "100%", overflow: "visible" }}
          labels={{
            tickLabels: {
              type: "outer",
              ticks: [
                { value: 20, valueConfig: { formatTextValue: () => "1.0" } },
                { value: 28, valueConfig: { formatTextValue: () => "Vulnerable", style: { fontSize: "10px", fontWeight: "bold" } } },
                { value: 40, valueConfig: { formatTextValue: () => "2.0" } },
                { value: 44, valueConfig: { formatTextValue: () => "Managed", style: { fontSize: "10px", fontWeight: "bold" } } },
                { value: 60, valueConfig: { formatTextValue: () => "Engaged", style: { fontSize: "10px", fontWeight: "bold" } } },
                { value: 76, valueConfig: { formatTextValue: () => "Integrated", style: { fontSize: "10px", fontWeight: "bold" } } },
                { value: 80, valueConfig: { formatTextValue: () => "4.0" } },
                { value: 92, valueConfig: { formatTextValue: () => "Resilient", style: { fontSize: "10px", fontWeight: "bold" } } },
                { value: 100, valueConfig: { formatTextValue: () => "5.0" } },
              ],
              defaultTickValueConfig: { style: { fontSize: "10px" } }
            },
            valueLabel: {
              formatTextValue: () => `${toPercentage(score).toFixed(0)}%`,
              style: { fontSize: "20px", fontWeight: "bold" },
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
            width: 0.3,
          }}
          pointer={{
            type: "needle",
            elastic: true,
            animationDelay: 0,
            length: 0.7,
          }}
        />
        {/* Custom Animated Tooltip */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 max-w-[250px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-medium px-3 py-2 rounded-md shadow-xl border border-zinc-800 dark:border-zinc-200 pointer-events-none transition-all duration-300 z-50 text-center
            ${hoveredTooltip ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        >
          {hoveredTooltip}
        </div>
      </div>

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
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: levelInfo.colorCode }}
        />
        <div className="relative flex flex-col gap-3 p-3.5 pl-4 md:p-4 md:pl-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Your company score
              </p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {toPercentage(score).toFixed(0)}
                  <span className="text-lg md:text-xl font-bold text-muted-foreground">%</span>
                </span>
                <span className="text-xs md:text-sm text-muted-foreground tabular-nums">
                  {score.toFixed(2)}
                  <span className="text-muted-foreground/70"> / 5.0</span>
                </span>
              </div>
            </div>
            <Badge
              className={`${levelInfo.badgeColor} shrink-0 text-[10px] md:text-xs px-2.5 py-1 rounded-full border-0 shadow-sm whitespace-nowrap`}
            >
              {levelInfo.label}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(Math.max(toPercentage(score), 0), 100)}%`,
                  backgroundColor: levelInfo.colorCode,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] md:text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
              <span>Vulnerable</span>
              <span>Resilient</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div
        className={`w-full p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-3 relative overflow-hidden group/ai ${isDemo ? 'cursor-pointer hover:bg-primary/[0.08] transition-colors overflow-hidden' : ''}`}
        onClick={() => isDemo && onUpgradeClick?.()}
      >
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/ai:opacity-20 transition-opacity">
          <Sparkles className={`w-12 h-12 text-primary ${isGeneratingAI ? 'animate-pulse' : ''}`} />
        </div>

        <div className={`flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider ${isDemo ? 'blur-[1.5px] pointer-events-none' : ''}`}>
          <Sparkles className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
          AI Recommendations
        </div>

        {isDemo && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-background/10 backdrop-blur-[1px]">
            <Lock className="w-4 h-4 text-primary/80" />
            <span className="text-[10px] font-black text-primary/80 uppercase tracking-tighter">Get full access</span>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-3 relative z-10 ${isDemo ? 'blur-[4px] pointer-events-none select-none grayscale opacity-60' : ''}`}>
          {isGeneratingAI ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-1/3 bg-primary/20 animate-pulse rounded" />
                  <div className="h-3 w-full bg-primary/10 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            (aiInsights?.recommendations || aiSuggestions).map((s: any, i: number) => (
              <div key={i} className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-500">
                <div className="text-xs font-bold text-foreground">
                  {s.title}
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {s.description}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ✅ If bare, don’t wrap in a Card (prevents nested “modal/card” look)
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
