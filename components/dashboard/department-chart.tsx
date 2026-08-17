"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import { Building, Maximize2, Minus, Plus } from "@/components/icons";
import { EmptyState } from "./empty-state";
import { BarList } from "../tremor_bar";
import { barColorForScoreClass } from "./dimension-bar-utils";
import { Button } from "../ui/button";
import ChartModal from "../chart-modal";
import {
  ScoreListFilters,
  applyScoreListFilters,
  type ScoreBand,
  type ScoreSort,
} from "./score-list-filters";

export interface DeptData {
  department: string;
  avg_score: number;
  respondent_count: number;
}

interface DepartmentChartProps {
  data?: DeptData[];
  isLoading?: boolean;
}

function toBarData(data: DeptData[]) {
  return data.map((d, i) => {
    const scorePercent = (Number(d.avg_score) / 5) * 100;
    return {
      key: `${d.department}-${i}`,
      name: d.department,
      value: Number(d.avg_score) || 0,
      color: barColorForScoreClass(scorePercent),
      respondent_count: d.respondent_count,
    };
  });
}

function DepartmentLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-red-200/80 dark:bg-red-900/50" />
        Below 70%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-yellow-200/80 dark:bg-yellow-900/40" />
        70–75%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-blue-200 dark:bg-blue-900" />
        75%+
      </span>
    </div>
  );
}

function departmentSummary(data: DeptData[]) {
  if (!data.length) return null;
  let critical = 0;
  let review = 0;
  let onTrack = 0;
  let sum = 0;
  let lowest = data[0];
  let highest = data[0];

  for (const d of data) {
    const pct = (Number(d.avg_score) / 5) * 100;
    sum += pct;
    if (pct < 70) critical += 1;
    else if (pct < 75) review += 1;
    else onTrack += 1;
    if (Number(d.avg_score) < Number(lowest.avg_score)) lowest = d;
    if (Number(d.avg_score) > Number(highest.avg_score)) highest = d;
  }

  return {
    total: data.length,
    critical,
    review,
    onTrack,
    avg: sum / data.length,
    lowestName: lowest.department,
    lowestPct: (Number(lowest.avg_score) / 5) * 100,
    highestName: highest.department,
    highestPct: (Number(highest.avg_score) / 5) * 100,
  };
}

export function DepartmentChart({
  data = [],
  isLoading = false,
}: DepartmentChartProps) {
  const [open, setOpen] = React.useState(false);
  const [barZoom, setBarZoom] = React.useState(1);
  const [sort, setSort] = React.useState<ScoreSort>("highest");
  const [band, setBand] = React.useState<ScoreBand>("all");
  const BAR_ZOOM_MIN = 0.5;
  const BAR_ZOOM_MAX = 1.5;
  const BAR_ZOOM_STEP = 0.15;

  React.useEffect(() => {
    if (!open) setBarZoom(1);
  }, [open]);

  const filteredData = React.useMemo(
    () =>
      applyScoreListFilters(
        data,
        (d) => (Number(d.avg_score) / 5) * 100,
        (d) => d.department,
        sort,
        band
      ),
    [data, sort, band]
  );

  if (isLoading) {
    return (
      <Card className="border-0 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building className="w-4 h-4" /> Scores by Department
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="space-y-2 w-full px-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-0 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building className="w-4 h-4" /> Scores by Department
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-0">
          <EmptyState
            title="No department data"
            message="Respondents need a department on their profile or survey form to show insights here."
          />
        </CardContent>
      </Card>
    );
  }

  const barData = toBarData(filteredData);
  const summary = departmentSummary(data);

  const filterBar = (
    <ScoreListFilters
      sort={sort}
      band={band}
      onSortChange={setSort}
      onBandChange={setBand}
      showNumberSort={false}
      resultCount={filteredData.length}
      totalCount={data.length}
    />
  );

  const analysis = summary ? (
    <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3 px-0.5">
      Across {summary.total} departments, average is{" "}
      <span className="font-medium text-foreground">
        {summary.avg.toFixed(1)}%
      </span>
      .{" "}
      <span className="text-red-600 dark:text-red-400 font-medium">
        {summary.critical} critical
      </span>
      ,{" "}
      <span className="text-yellow-700 dark:text-yellow-400 font-medium">
        {summary.review} need review
      </span>
      ,{" "}
      <span className="text-blue-600 dark:text-blue-400 font-medium">
        {summary.onTrack} on track
      </span>
      . Highest:{" "}
      <span className="font-medium text-foreground">{summary.highestName}</span>{" "}
      ({summary.highestPct.toFixed(1)}%). Lowest:{" "}
      <span className="font-medium text-foreground">{summary.lowestName}</span>{" "}
      ({summary.lowestPct.toFixed(1)}%).
    </p>
  ) : null;

  return (
    <>
      <Card className="border-0 bg-card shadow-sm relative overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 shrink-0" /> Scores by Department
            </CardTitle>
            <CardDescription className="text-xs">
              Average safety score per department ({data.length} departments)
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setOpen(true)}
            aria-label="Enlarge department scores"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          <DepartmentLegend />
          {filterBar}
          <div className="max-h-[340px] overflow-y-auto pr-1">
            {barData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No departments match this filter.
              </p>
            ) : (
              <BarList
                data={barData}
                sortOrder="none"
                scaleMax={5}
                showAnimation
                valueFormatter={(v) => `${v.toFixed(2)} / 5`}
              />
            )}
          </div>
          {analysis}
        </CardContent>
      </Card>

      <ChartModal
        open={open}
        onClose={() => setOpen(false)}
        title="Scores by Department"
      >
        <div className="flex flex-col gap-3 -mt-1 mb-2">
          <div className="flex items-center justify-between gap-2">
            <DepartmentLegend />
            <div className="flex items-center gap-1 shrink-0">
              <span className="mr-1 text-xs text-muted-foreground tabular-nums">
                {Math.round(barZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Zoom out — squeeze bars"
                disabled={barZoom <= BAR_ZOOM_MIN}
                onClick={() =>
                  setBarZoom((z) =>
                    Math.max(BAR_ZOOM_MIN, Number((z - BAR_ZOOM_STEP).toFixed(2)))
                  )
                }
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Zoom in — expand bars"
                disabled={barZoom >= BAR_ZOOM_MAX}
                onClick={() =>
                  setBarZoom((z) =>
                    Math.min(BAR_ZOOM_MAX, Number((z + BAR_ZOOM_STEP).toFixed(2)))
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {filterBar}
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-3">
          {barData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No departments match this filter.
            </p>
          ) : (
            <BarList
              data={barData}
              sortOrder="none"
              scaleMax={5}
              showAnimation
              density={barZoom}
              valueFormatter={(v) => `${v.toFixed(2)} / 5`}
            />
          )}
          {analysis}
        </div>
      </ChartModal>
    </>
  );
}
