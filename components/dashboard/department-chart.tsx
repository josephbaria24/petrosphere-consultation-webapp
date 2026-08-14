"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { Building } from "@/components/icons";
import { EmptyState } from "./empty-state";

export interface DeptData {
  department: string;
  avg_score: number;
  respondent_count: number;
}

interface DepartmentChartProps {
  data?: DeptData[];
  isLoading?: boolean;
}

const chartConfig = {
  avg_score: {
    label: "Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const COLORS = [
  "#4A90E2",
  "#50C878",
  "#FF7A40",
  "#9B59B6",
  "#E74C3C",
  "#1ABC9C",
  "#F39C12",
  "#3498DB",
];

export function DepartmentChart({
  data = [],
  isLoading = false,
}: DepartmentChartProps) {
  if (isLoading) {
    return (
      <Card className="border-0 bg-card">
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
      <Card className="border-0 bg-card">
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

  return (
    <Card className="border-0 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building className="w-4 h-4" /> Scores by Department
        </CardTitle>
        <CardDescription className="text-xs">
          Average safety score per department ({data.length} departments)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              vertical={true}
            />
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="department"
              tick={{ fontSize: 11 }}
              width={120}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => String(value)}
                />
              }
            />
            <Bar
              dataKey="avg_score"
              fill="var(--color-avg_score)"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
