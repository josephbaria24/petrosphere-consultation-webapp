"use client";

import {
  Users,
  Users2,
  ShieldCheck,
  MessageSquare,
  Brain,
  Check,
  Layers,
  Activity,
  BarChart3,
  ChevronRight,
} from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "@/components/icons";

type VitalSystem = {
  id: string;
  title: string;
  icon: LucideIcon;
  dimensions: string[];
  question: string;
  /** Solid header band */
  header: string;
  /** Soft panel wash */
  wash: string;
  /** Icon chip */
  chip: string;
  /** Check / accent text */
  accentText: string;
};

const VITAL_SYSTEMS: VitalSystem[] = [
  {
    id: "leadership",
    title: "Leadership",
    icon: Users,
    dimensions: [
      "Management Commitment",
      "Supervisory Safety Support",
      "Safety Accountability & Recognition",
    ],
    question:
      "Do leaders create, model and reinforce the conditions for safe work?",
    header: "bg-[#5b7c99] dark:bg-slate-700",
    wash: "bg-gradient-to-b from-slate-100/90 to-white dark:from-slate-900/50 dark:to-card",
    chip: "bg-white/20 text-white",
    accentText: "text-slate-600 dark:text-slate-300",
  },
  {
    id: "people",
    title: "People & Culture",
    icon: Users2,
    dimensions: [
      "Employee Involvement",
      "Psychological Safety",
      "Safety Climate",
    ],
    question:
      "Do people feel involved, trusted and collectively responsible for safety?",
    header: "bg-[#8b6faf] dark:bg-violet-800",
    wash: "bg-gradient-to-b from-violet-50/95 to-white dark:from-violet-950/45 dark:to-card",
    chip: "bg-white/20 text-white",
    accentText: "text-violet-700 dark:text-violet-300",
  },
  {
    id: "risk",
    title: "Risk & Operational Control",
    icon: ShieldCheck,
    dimensions: [
      "Risk Awareness",
      "Safety Rules & Compliance",
      "Contractor Safety Alignment",
    ],
    question:
      "Are risks understood and consistently controlled across operational boundaries?",
    header: "bg-[#4a9b8e] dark:bg-teal-800",
    wash: "bg-gradient-to-b from-teal-50/95 to-white dark:from-teal-950/45 dark:to-card",
    chip: "bg-white/20 text-white",
    accentText: "text-teal-700 dark:text-teal-300",
  },
  {
    id: "learning",
    title: "Learning & Improvement",
    icon: MessageSquare,
    dimensions: [
      "Safety Communication",
      "Incident Reporting",
      "Organizational Learning",
    ],
    question: "Does safety information become learning and improvement?",
    header: "bg-[#d4894a] dark:bg-orange-800",
    wash: "bg-gradient-to-b from-orange-50/95 to-white dark:from-orange-950/40 dark:to-card",
    chip: "bg-white/20 text-white",
    accentText: "text-orange-700 dark:text-orange-300",
  },
  {
    id: "capability",
    title: "Capability & Resilience",
    icon: Brain,
    dimensions: [
      "Safety Training",
      "Safety Resources",
      "Work-Life Balance & Stress",
    ],
    question:
      "Do people have the competence, resources and capacity to perform safely under changing conditions?",
    header: "bg-[#5f9e6e] dark:bg-emerald-800",
    wash: "bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-card",
    chip: "bg-white/20 text-white",
    accentText: "text-emerald-700 dark:text-emerald-300",
  },
];

const HIERARCHY = [
  {
    label: "5 Vital Systems",
    detail: "Core culture pillars",
    icon: Layers,
    tone: "from-[#5b7c99] to-[#8b6faf]",
  },
  {
    label: "15 Dimensions",
    detail: "Measurable themes",
    icon: Activity,
    tone: "from-[#8b6faf] to-[#4a9b8e]",
  },
  {
    label: "75 Diagnostic Indicators",
    detail: "Survey signals",
    icon: BarChart3,
    tone: "from-[#d4894a] to-[#5f9e6e]",
  },
] as const;

export function SafetyVitalsArchitecture({
  className,
}: {
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "w-full border-0 shadow-lg relative overflow-hidden",
        className
      )}
    >
      {/* Atmospheric layers */}
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2] [background-image:linear-gradient(rgba(30,58,95,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(30,58,95,0.04)_1px,transparent_1px)] [background-size:28px_28px]"
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
                control, and capability.
              </CardDescription>
            </div>
          </div>

          {/* Hierarchy flow */}
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

      <CardContent className="relative pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {VITAL_SYSTEMS.map((system, index) => {
            const Icon = system.icon;
            return (
              <article
                key={system.id}
                className={cn(
                  "group flex h-full flex-col overflow-hidden rounded-xl border border-[#1e3a5f]/10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10",
                  system.wash
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <header
                  className={cn(
                    "relative flex h-[92px] items-start px-3.5 py-3 text-white",
                    system.header
                  )}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div className="relative flex items-start gap-2.5">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm",
                        system.chip
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                        Vital {index + 1}
                      </p>
                      <h3 className="text-sm font-semibold leading-snug">
                        {system.title}
                      </h3>
                    </div>
                  </div>
                </header>

                <div className="flex flex-1 flex-col p-3.5">
                  <p
                    className={cn(
                      "mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      system.accentText
                    )}
                  >
                    3 Dimensions
                  </p>
                  <ul className="space-y-1.5">
                    {system.dimensions.map((dim) => (
                      <li
                        key={dim}
                        className="flex items-start gap-2 text-xs leading-snug text-slate-700 dark:text-foreground/85"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                            system.accentText
                          )}
                          aria-hidden
                        />
                        <span>{dim}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-[#1e3a5f]/10 pt-3 dark:border-white/10">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-muted-foreground">
                      Central question
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-600 italic dark:text-muted-foreground">
                      “{system.question}”
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
