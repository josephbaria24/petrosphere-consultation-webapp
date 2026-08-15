"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import { Building } from "@/components/icons";
import { EmptyState } from "./empty-state";
import { BarList } from "../tremor_bar";
import { barColorForScoreClass } from "./dimension-bar-utils";

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

export function DepartmentChart({
  data = [],
  isLoading = false,
}: DepartmentChartProps) {
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

  const barData = toBarData(data);

  return (
    <Card className="border-0 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building className="w-4 h-4" /> Scores by Department
        </CardTitle>
        <CardDescription className="text-xs">
          Average safety score per department ({data.length} departments)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
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
        <div className="max-h-[340px] overflow-y-auto pr-1">
          <BarList
            data={barData}
            sortOrder="descending"
            scaleMax={5}
            showAnimation
            valueFormatter={(v) => `${v.toFixed(2)} / 5`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
