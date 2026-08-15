"use client";

import type { FC } from "react";
import { useMemo, useState } from "react";
import {
  Check,
  Layers,
  Activity,
  BarChart3,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../../lib/utils";
import {
  matchDimensionToVital,
  type DimensionScoreRow,
} from "../../lib/vitals-framework";
import { barColorForScoreClass } from "./dimension-bar-utils";

type VitalSystem = {
  id: string;
  title: string;
  dimensions: string[];
  question: string;
  /** Header / icon fill */
  color: string;
  Icon: FC<{ className?: string }>;
};

function IconLeadership({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="14" cy="16" r="4.2" fill="currentColor" opacity="0.85" />
      <path
        d="M7.5 32.5c.6-5.2 3.6-8 6.5-8s5.9 2.8 6.5 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="34" cy="16" r="4.2" fill="currentColor" opacity="0.85" />
      <path
        d="M27.5 32.5c.6-5.2 3.6-8 6.5-8s5.9 2.8 6.5 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="24" cy="13.5" r="5.2" fill="currentColor" />
      <path
        d="M14.5 34c1-6.8 4.8-10.5 9.5-10.5S32.5 27.2 33.5 34"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M21.2 18.2h5.6v1.4c0 1.1-.7 1.8-1.6 2.1l.5 2.3h-3.4l.5-2.3c-.9-.3-1.6-1-1.6-2.1v-1.4z"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

function IconPeople({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {[12, 24, 36].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="16" r="4.5" fill="currentColor" />
          <path
            d={`M${cx - 7} 33.5c.7-5.4 3.5-8.2 7-8.2s6.3 2.8 7 8.2`}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

function IconRisk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M24 8.5l12.5 4.2v9.8c0 7.4-5 12.8-12.5 15.5C16.5 35.3 11.5 29.9 11.5 22.5V12.7L24 8.5z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.8 23.2l4.2 4.2 8.4-8.6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLearning({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M12 14.5h20c2.5 0 4.5 2 4.5 4.5v9c0 2.5-2 4.5-4.5 4.5H22l-6.5 5.2V32.5H12c-2.5 0-4.5-2-4.5-4.5v-9c0-2.5 2-4.5 4.5-4.5z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="23.5" r="1.7" fill="currentColor" />
      <circle cx="24.5" cy="23.5" r="1.7" fill="currentColor" />
      <circle cx="30" cy="23.5" r="1.7" fill="currentColor" />
    </svg>
  );
}

function IconCapability({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M24 7.5c-6.2 0-11 4.7-11 10.8 0 4.2 2.2 7.8 5.5 9.6V34c0 1.4 1.1 2.5 2.5 2.5h6c1.4 0 2.5-1.1 2.5-2.5v-6.1c3.3-1.8 5.5-5.4 5.5-9.6C35 12.2 30.2 7.5 24 7.5z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="18" r="4.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 12.2v2.2M24 21.6v2.2M18.2 18h2.2M27.6 18h2.2M19.9 13.9l1.6 1.6M26.5 20.5l1.6 1.6M26.5 13.9l-1.6 1.6M19.9 20.5l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const VITAL_SYSTEMS: VitalSystem[] = [
  {
    id: "leadership",
    title: "Leadership Vital",
    Icon: IconLeadership,
    dimensions: [
      "Management Commitment",
      "Supervisory Safety Support",
      "Safety Accountability & Recognition",
    ],
    question:
      "Do leaders create, model and reinforce the conditions for safe work?",
    color: "#1e3a5f",
  },
  {
    id: "people",
    title: "People & Culture Vital",
    Icon: IconPeople,
    dimensions: [
      "Employee Involvement",
      "Psychological Safety",
      "Safety Climate",
    ],
    question:
      "Do people feel involved, trusted and collectively responsible for safety?",
    color: "#2f5f9e",
  },
  {
    id: "risk",
    title: "Risk & Operational Control Vital",
    Icon: IconRisk,
    dimensions: [
      "Risk Awareness",
      "Safety Rules & Compliance",
      "Contractor Safety Alignment",
    ],
    question:
      "Are risks understood and consistently controlled across operational boundaries?",
    color: "#1f6f6a",
  },
  {
    id: "learning",
    title: "Learning & Improvement Vital",
    Icon: IconLearning,
    dimensions: [
      "Safety Communication",
      "Incident Reporting",
      "Organizational Learning",
    ],
    question: "Does safety information become learning and improvement?",
    color: "#2a7bb8",
  },
  {
    id: "capability",
    title: "Capability & Resilience Vital",
    Icon: IconCapability,
    dimensions: [
      "Safety Training",
      "Safety Resources",
      "Work-Life Balance & Stress",
    ],
    question:
      "Do people have the competence, resources and capacity to perform safely under changing conditions?",
    color: "#3d9a96",
  },
];

const HIERARCHY = [
  {
    label: "5 Vital Systems",
    detail: "Core culture pillars",
    icon: Layers,
    tone: "from-[#1e3a5f] to-[#2f5f9e]",
  },
  {
    label: "15 Dimensions",
    detail: "Measurable themes",
    icon: Activity,
    tone: "from-[#2f5f9e] to-[#1f6f6a]",
  },
  {
    label: "75 Diagnostic Indicators",
    detail: "Survey signals",
    icon: BarChart3,
    tone: "from-[#2a7bb8] to-[#3d9a96]",
  },
] as const;

export function bandForPct(pct: number) {
  if (pct < 70)
    return {
      label: "Critical",
      compliant: false as const,
      className: "text-red-600 dark:text-red-400",
      chip: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };
  if (pct < 75)
    return {
      label: "Need review",
      compliant: false as const,
      className: "text-amber-700 dark:text-amber-400",
      chip: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20",
    };
  return {
    label: "On track",
    compliant: true as const,
    className: "text-emerald-700 dark:text-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  };
}

export function scoresForVital(
  vitalId: string,
  dimensions: string[],
  barData: DimensionScoreRow[]
) {
  const matched = (barData || [])
    .map((row) => {
      const pct =
        typeof row.scorePercent === "number"
          ? row.scorePercent
          : typeof row.score === "number"
            ? (row.score / 5) * 100
            : null;
      if (pct == null) return null;
      const vital = matchDimensionToVital(String(row.name || ""));
      if (vital?.id !== vitalId) return null;
      return { name: String(row.name || ""), pct };
    })
    .filter(Boolean) as { name: string; pct: number }[];

  const ordered: { name: string; pct: number | null }[] = dimensions.map(
    (label) => {
      const hit = matched.find((m) =>
        m.name.toLowerCase().includes(label.toLowerCase().slice(0, 12))
      );
      return hit
        ? { name: hit.name, pct: hit.pct }
        : { name: label, pct: null };
    }
  );

  for (const m of matched) {
    if (!ordered.some((o) => o.name === m.name)) ordered.push(m);
  }

  const known = ordered.filter((o) => o.pct != null) as {
    name: string;
    pct: number;
  }[];
  const avg =
    known.length > 0
      ? known.reduce((s, d) => s + d.pct, 0) / known.length
      : null;

  return { rows: ordered, avg, knownCount: known.length };
}

/** Compact vital architecture card with dimension compliance — used in sunburst enlarge. */
export function VitalComplianceCard({
  vitalId,
  barData = [],
  className,
}: {
  vitalId: string;
  barData?: DimensionScoreRow[];
  className?: string;
}) {
  const system = VITAL_SYSTEMS.find((v) => v.id === vitalId);
  const result = useMemo(() => {
    if (!system) return null;
    return scoresForVital(system.id, system.dimensions, barData);
  }, [system, barData]);

  if (!system || !result) return null;

  const Icon = system.Icon;
  const compliantCount = result.rows.filter(
    (r) => r.pct != null && bandForPct(r.pct).compliant
  ).length;
  const checkedCount = result.rows.filter((r) => r.pct != null).length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-card",
        className
      )}
    >
      <header
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: system.color }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/15">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-snug">
            {system.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/85">
            {system.question}
          </p>
        </div>
        {result.avg != null && (
          <div className="shrink-0 text-right">
            <p className="text-xl font-extrabold tabular-nums leading-none">
              {result.avg.toFixed(0)}%
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wide text-white/75">
              avg
            </p>
          </div>
        )}
      </header>

      <div className="space-y-3 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: system.color }}
          >
            Dimension checklist
          </p>
          <span className="text-[10px] font-semibold tabular-nums text-slate-500 dark:text-muted-foreground">
            {compliantCount}/{checkedCount || system.dimensions.length} on track
          </span>
        </div>

        <ul className="space-y-2">
          {result.rows.map((row, i) => {
            const band = row.pct != null ? bandForPct(row.pct) : null;
            const StatusIcon = !band
              ? AlertCircle
              : band.compliant
                ? CheckCircle2
                : band.label === "Critical"
                  ? AlertTriangle
                  : AlertCircle;
            return (
              <li
                key={`${row.name}-${i}`}
                className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    !band
                      ? "bg-slate-300 dark:bg-muted"
                      : band.compliant
                        ? "bg-emerald-500"
                        : band.label === "Critical"
                          ? "bg-red-500"
                          : "bg-amber-500"
                  )}
                >
                  {band?.compliant ? (
                    <Check className="h-3 w-3 text-white" aria-hidden />
                  ) : (
                    <StatusIcon className="h-3 w-3 text-white" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-slate-800 dark:text-foreground">
                    {row.name}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        row.pct != null
                          ? barColorForScoreClass(row.pct)
                          : "bg-muted"
                      )}
                      style={{
                        width: `${row.pct != null ? Math.min(Math.max(row.pct, 0), 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {row.pct != null ? (
                    <>
                      <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-foreground">
                        {row.pct.toFixed(0)}%
                      </p>
                      {band && (
                        <p
                          className={cn(
                            "text-[9px] font-semibold",
                            band.className
                          )}
                        >
                          {band.compliant ? "Compliant" : band.label}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No data
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function SafetyVitalsArchitecture({
  className,
  barData = [],
}: {
  className?: string;
  barData?: DimensionScoreRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = VITAL_SYSTEMS.find((v) => v.id === selectedId) || null;

  const result = useMemo(() => {
    if (!selected) return null;
    return scoresForVital(selected.id, selected.dimensions, barData);
  }, [selected, barData]);

  return (
    <>
    <Card
      className={cn(
        "w-full border-0 shadow-lg relative overflow-hidden",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(42,90,138,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(47,111,122,0.14),_transparent_50%),linear-gradient(135deg,_rgba(30,58,95,0.06),_transparent_40%,_rgba(255,122,64,0.05))] dark:bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(45,212,191,0.1),_transparent_50%),linear-gradient(135deg,_rgba(14,116,144,0.12),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#2a5a8a]/15 blur-3xl dark:bg-sky-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-[#2f6f7a]/15 blur-3xl dark:bg-teal-500/10"
      />

      <CardHeader className="relative pb-3">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#1e3a5f]/15 bg-[#1e3a5f]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1e3a5f] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Framework map
              </p>
              <CardTitle className="text-2xl tracking-tight text-[#12263f] dark:text-foreground">
                Safety Vitals™ Architecture
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
                Five interconnected vital systems—each with three dimensions and
                a guiding question—that structure how your survey reads culture,
                control, and capability. Click a vital to view dimension
                results.
              </CardDescription>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
            {HIERARCHY.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="contents">
                  {i > 0 && (
                    <div className="hidden sm:flex items-center justify-center text-[#1e3a5f]/35 dark:text-sky-300/40">
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </div>
                  )}
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border border-white/40 p-3 text-white shadow-md dark:border-white/10",
                      "bg-gradient-to-br",
                      item.tone,
                      "transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                    )}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)]"
                    />
                    <div className="relative flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/75">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3">
          {VITAL_SYSTEMS.map((system, index) => {
            const Icon = system.Icon;
            return (
              <button
                key={system.id}
                type="button"
                onClick={() => setSelectedId(system.id)}
                className="group relative flex h-full flex-col pt-7 text-left cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ animationDelay: `${index * 60}ms` }}
                aria-label={`View results for ${system.title}`}
              >
                {/* Overlapping circular icon — matches reference positioning */}
                <div
                  className="absolute left-1/2 top-0 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white shadow-md transition-transform duration-300 group-hover:scale-105 dark:border-card"
                  style={{ backgroundColor: system.color }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>

                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-active:scale-[0.99] dark:border-white/10 dark:bg-card">
                  <header
                    className="flex min-h-[72px] items-end justify-center px-3 pb-3.5 pt-9 text-center"
                    style={{ backgroundColor: system.color }}
                  >
                    <h3 className="text-[13px] font-bold leading-snug text-white">
                      {index + 1}. {system.title}
                    </h3>
                  </header>

                  <div className="relative flex flex-1 flex-col bg-white px-3.5 pb-4 pt-3.5 text-center dark:bg-card">
                    {/* Watermark question mark */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-2 right-2 select-none text-7xl font-serif leading-none text-slate-200/70 dark:text-white/5"
                    >
                      ?
                    </span>

                    <p
                      className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: system.color }}
                    >
                      3 Dimensions
                    </p>
                    <ul className="mx-auto space-y-2 text-left">
                      {system.dimensions.map((dim) => (
                        <li
                          key={dim}
                          className="flex items-start gap-2 text-[11px] leading-snug text-slate-700 dark:text-foreground/85"
                        >
                          <span
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: system.color }}
                          >
                            <Check
                              className="h-2.5 w-2.5 text-white"
                              aria-hidden
                            />
                          </span>
                          <span>{dim}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-auto border-t border-slate-200/80 pt-3 dark:border-white/10">
                      <p
                        className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: system.color }}
                      >
                        Central Question
                      </p>
                      <p
                        className="text-[11px] font-semibold leading-relaxed"
                        style={{ color: system.color }}
                      >
                        {system.question}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent
          className={cn(
            "!z-[100] sm:max-w-lg gap-0 overflow-hidden p-0",
            "data-[state=open]:duration-300 data-[state=closed]:duration-200"
          )}
        >
          {selected && (
            <>
              <div
                className="px-6 pt-6 pb-4 text-white"
                style={{ backgroundColor: selected.color }}
              >
                <DialogHeader className="gap-2 text-left">
                  <DialogTitle className="text-lg text-white">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-white/85">
                    {selected.question}
                  </DialogDescription>
                </DialogHeader>
                {result?.avg != null && (
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-3xl font-extrabold tabular-nums leading-none">
                      {result.avg.toFixed(1)}%
                    </span>
                    <span className="pb-0.5 text-xs text-white/80">
                      vital average · {result.knownCount} dimension
                      {result.knownCount === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1 px-6 py-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Dimension results
                </p>
                {result && result.rows.length > 0 ? (
                  <ul className="space-y-3">
                    {result.rows.map((row, i) => {
                      const pct = row.pct;
                      const band = pct != null ? bandForPct(pct) : null;
                      return (
                        <li
                          key={`${row.name}-${i}`}
                          className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-xl border border-border/60 bg-muted/20 p-3"
                          style={{ animationDelay: `${i * 70}ms` }}
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-sm font-medium leading-snug text-foreground">
                              {row.name}
                            </p>
                            {pct != null ? (
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold tabular-nums">
                                  {pct.toFixed(1)}%
                                </p>
                                {band && (
                                  <p
                                    className={cn(
                                      "text-[10px] font-semibold",
                                      band.className
                                    )}
                                  >
                                    {band.label}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No data
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500 ease-out",
                                pct != null
                                  ? barColorForScoreClass(pct)
                                  : "bg-muted"
                              )}
                              style={{
                                width: `${pct != null ? Math.min(Math.max(pct, 0), 100) : 0}%`,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                    Dimension scores will appear here once survey responses are
                    available.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
