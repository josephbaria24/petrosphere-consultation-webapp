//area-chart.tsx
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../@/components/ui/chart";

interface RoleAreaChartProps {
  data: any[]; // [{ dimension: "Engagement", Manager: 3.8, Staff: 3.4 }]
  bare?: boolean; // NEW: allows modal to use chart without Card wrapper
}

export function RoleAreaChart({ data, bare }: RoleAreaChartProps) {
  const roles =
    data.length > 0
      ? Object.keys(data[0]).filter((k) => k !== "dimension")
      : [];

  const chartContent = (
    <ChartContainer config={{}} className="aspect-auto h-[300px] w-full">
      <AreaChart data={data}>
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
          tick={{ fontSize: 11 }} // Adjust text color
        />

        {/* Y axis for scores */}
        <YAxis
          domain={[0, 5]} // adjust if scores can go higher/lower
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Score", angle: -90, position: "insideLeft" }}
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
            name={role} // <- Legend shows role names
          />
        ))}

        {/* Built-in Recharts Legend */}
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
      <CardContent className="px-2 pt-1 sm:px-6 sm:pt-6">{chartContent}</CardContent>
    </Card>
  );
}
