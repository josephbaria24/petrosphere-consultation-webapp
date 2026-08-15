"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "../ui/dropdown-menu";
import {
  ClipboardList,
  Users,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Plus,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
} from "@/components/icons";
import { Action } from "./types";
import { toPercentage } from "../../lib/survey-utils";
import { cn } from "../../lib/utils";

interface ResponseSummaryProps {
  respondentCount: number;
  avgScore: number;
  minAcceptableScore: number;
  belowMinimumDimensions: string[];
  atRiskDimensions: string[];
  strongDimensions: string[];
  actions: Action[];
  onAddAction: (dimension: string, status: "critical" | "at_risk") => void;
  onDeleteAction: (id: string) => void;
  onToggleAction: (id: string, isCompleted: boolean) => void;
}

type Band = "critical" | "at_risk" | "strong";

function sortDimensionsByNumber(dims: string[]) {
  return [...dims].sort((a, b) => {
    const numA = Number(/^(\d+)/.exec(a)?.[1]);
    const numB = Number(/^(\d+)/.exec(b)?.[1]);
    const hasA = Number.isFinite(numA);
    const hasB = Number.isFinite(numB);
    if (hasA && hasB && numA !== numB) return numA - numB;
    if (hasA !== hasB) return hasA ? -1 : 1;
    return a.localeCompare(b);
  });
}

const BAND_STYLES: Record<
  Band,
  {
    icon: React.ElementType;
    label: string;
    chip: string;
    panel: string;
    title: string;
    item: string;
  }
> = {
  critical: {
    icon: AlertTriangle,
    label: "Critical",
    chip: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    panel: "border-red-500/20 bg-red-500/[0.04]",
    title: "text-red-700 dark:text-red-400",
    item: "border-red-500/15 hover:bg-red-500/[0.06]",
  },
  at_risk: {
    icon: AlertCircle,
    label: "Need review",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    panel: "border-amber-500/20 bg-amber-500/[0.04]",
    title: "text-amber-700 dark:text-amber-400",
    item: "border-amber-500/15 hover:bg-amber-500/[0.06]",
  },
  strong: {
    icon: ShieldCheck,
    label: "On track",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    panel: "border-emerald-500/20 bg-emerald-500/[0.04]",
    title: "text-emerald-700 dark:text-emerald-400",
    item: "border-emerald-500/15",
  },
};

export function ResponseSummary({
  respondentCount,
  avgScore,
  minAcceptableScore: _minAcceptableScore,
  belowMinimumDimensions,
  atRiskDimensions,
  strongDimensions,
  actions,
  onAddAction,
  onDeleteAction,
  onToggleAction,
}: ResponseSummaryProps) {
  const scorePct = toPercentage(avgScore);

  const criticalDims = sortDimensionsByNumber(belowMinimumDimensions);
  const reviewDims = sortDimensionsByNumber(atRiskDimensions);
  const onTrackDims = sortDimensionsByNumber(strongDimensions);

  const statusTiles = [
    {
      band: "critical" as const,
      count: criticalDims.length,
      hint: "< 70%",
    },
    {
      band: "at_risk" as const,
      count: reviewDims.length,
      hint: "70 – 75%",
    },
    {
      band: "strong" as const,
      count: onTrackDims.length,
      hint: "≥ 75%",
    },
  ];

  const renderDimensionItem = (dimension: string, status: "critical" | "at_risk") => {
    const styles = BAND_STYLES[status];
    const dimensionActions = actions.filter(
      (a) => a.dimension === dimension && a.status === status
    );

    return (
      <DropdownMenu key={dimension}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto justify-between gap-2 rounded-lg border px-3 py-2.5 text-left font-normal",
              styles.item
            )}
          >
            <span className="text-sm leading-snug line-clamp-2">{dimension}</span>
            <div className="flex items-center gap-2 shrink-0">
              {dimensionActions.length > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {dimensionActions.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 z-[90]">
          <div className="p-2 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm leading-snug">{dimension}</span>
              <Button
                size="sm"
                onClick={() => onAddAction(dimension, status)}
                className="h-7 px-2 text-xs shrink-0 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Action
              </Button>
            </div>

            {dimensionActions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dimensionActions.map((action) => (
                  <div
                    key={action.id}
                    className={cn(
                      "p-2.5 border rounded-lg text-xs space-y-1.5",
                      action.is_completed
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          action.is_completed && "line-through text-muted-foreground"
                        )}
                      >
                        {action.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAction(action.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {action.description && (
                      <p className="text-muted-foreground">{action.description}</p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {action.priority && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                              action.priority === "high"
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : action.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            )}
                          >
                            {action.priority}
                          </span>
                        )}
                        {action.target_date && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(action.target_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleAction(action.id, !action.is_completed)}
                        className="h-6 px-2 text-xs gap-1"
                      >
                        {action.is_completed ? (
                          "Reopen"
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </>
                        )}
                      </Button>
                    </div>

                    {action.assigned_to && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{action.assigned_to}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs py-1">
                No actions yet — add one to start planning.
              </p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Card className="border-0 shadow-lg bg-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ClipboardList className="w-5 h-5 text-primary" />
          Response Summary
        </CardTitle>
        <CardDescription>
          Snapshot of participation, score, and dimension health
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide">
                Responses
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {respondentCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide">
                Overall
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {scorePct.toFixed(1)}
              <span className="text-base font-semibold text-muted-foreground ml-0.5">
                %
              </span>
            </p>
          </div>
        </div>

        {/* Status bands */}
        <div className="grid grid-cols-3 gap-2">
          {statusTiles.map(({ band, count, hint }) => {
            const styles = BAND_STYLES[band];
            const Icon = styles.icon;
            return (
              <div
                key={band}
                className={cn(
                  "rounded-xl border p-3 flex flex-col gap-2 min-w-0",
                  styles.chip
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xl font-bold tabular-nums leading-none">{count}</p>
                  <p className="text-[11px] font-semibold mt-1 truncate">{styles.label}</p>
                  <p className="text-[10px] opacity-70 truncate">{hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dimension lists */}
        <div className="space-y-3">
          {criticalDims.length > 0 && (
            <section className={cn("rounded-xl border p-3 space-y-2.5", BAND_STYLES.critical.panel)}>
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  BAND_STYLES.critical.title
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                Critical areas
                <span className="ml-auto text-xs font-bold tabular-nums opacity-80">
                  {criticalDims.length}
                </span>
              </h4>
              <div className="space-y-1.5">
                {criticalDims.map((dim) =>
                  renderDimensionItem(dim, "critical")
                )}
              </div>
            </section>
          )}

          {reviewDims.length > 0 && (
            <section className={cn("rounded-xl border p-3 space-y-2.5", BAND_STYLES.at_risk.panel)}>
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  BAND_STYLES.at_risk.title
                )}
              >
                <AlertCircle className="w-4 h-4" />
                Need review
                <span className="ml-auto text-xs font-bold tabular-nums opacity-80">
                  {reviewDims.length}
                </span>
              </h4>
              <div className="space-y-1.5">
                {reviewDims.map((dim) => renderDimensionItem(dim, "at_risk"))}
              </div>
            </section>
          )}

          {onTrackDims.length > 0 && (
            <section className={cn("rounded-xl border p-3 space-y-2.5", BAND_STYLES.strong.panel)}>
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  BAND_STYLES.strong.title
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                On track
                <span className="ml-auto text-xs font-bold tabular-nums opacity-80">
                  {onTrackDims.length}
                </span>
              </h4>
              <ul className="space-y-1">
                {onTrackDims.map((dim) => (
                  <li
                    key={dim}
                    className="flex items-start gap-2 text-sm text-emerald-700/90 dark:text-emerald-400/90 py-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />
                    <span className="leading-snug">{dim}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {criticalDims.length === 0 &&
            reviewDims.length === 0 &&
            onTrackDims.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Dimension breakdown will appear once survey scores are available.
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
