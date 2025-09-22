"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../@/components/ui/chart";

interface RoleAreaChartProps {
  data: any[]; // [{ dimension: "Engagement", Manager: 3.8, Staff: 3.4 }]
  bare?: boolean;
}

// 🔹 Helper: convert 1–5 scale into percentage (20%–100%)
const toPercentage = (score: number): number =>
  ((score - 1) / (5 - 1)) * 100;

export function RoleAreaChart({ data, bare }: RoleAreaChartProps) {
  const roles =
    data.length > 0
      ? Object.keys(data[0]).filter((k) => k !== "dimension")
      : [];

  // 🔹 Convert all role scores to percentage
  const percentData = data.map((row) => {
    const newRow: any = { dimension: row.dimension };
    roles.forEach((role) => {
      const score = row[role];
      newRow[role] = typeof score === "number" ? toPercentage(score) : score;
    });
    return newRow;
  });

  const chartContent = (
    <ChartContainer config={{}} className="aspect-auto h-[300px] w-full">
      <AreaChart data={percentData}>
        <CartesianGrid vertical={false} />

        {/* X axis with slanted labels */}
        <XAxis
          dataKey="dimension"
          tickLine={false}
          axisLine={false}
          tickMargin={5}
          angle={-40}
          textAnchor="end"
          interval={0}
          height={150}
          tick={{ fontSize: 11 }}
        />

        {/* ✅ Y axis now in percentage */}
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          tickFormatter={(val) => `${val}%`}
          axisLine={false}
          tickLine={false}
          label={{ value: "Percentage", angle: -90, position: "insideLeft" }}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />

        {/* Each role line */}
        {roles.map((role, idx) => (
          <Area
            key={role}
            dataKey={role}
            type="monotone"
            fillOpacity={0.2}
            stroke={`var(--chart-${(idx % 5) + 1})`}
            fill={`var(--chart-${(idx % 5) + 1})`}
            name={role}
          />
        ))}

        <Legend />
      </AreaChart>
    </ChartContainer>
  );

  if (bare) return chartContent;

  return (
    <Card className=" border-0 bg-card">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-0 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardDescription>
            Comparing dimension scores across different roles
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-1 sm:px-6 sm:pt-6">
        {chartContent}
      </CardContent>
    </Card>
  );
}
