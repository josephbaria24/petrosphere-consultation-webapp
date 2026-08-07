"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  ReferenceLine,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../@/components/ui/chart";

export interface DimensionBarDatum {
  name: string;
  scorePercent: number;
}

const barConfig = {
  scorePercent: {
    label: "Score",
  },
} satisfies ChartConfig;

function tierForScore(scorePercent: number): "critical" | "review" | "accent" {
  if (scorePercent < 70) return "critical";
  if (scorePercent < 75) return "review";
  return "accent";
}

const TIER_STROKE = {
  critical: "#ef4444",
  review: "#f97316",
  accent: "#FF7A40",
} as const;

function BarGradientDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient
        id={`${prefix}-critical`}
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
        <stop offset="55%" stopColor="#ef4444" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.18} />
      </linearGradient>
      <linearGradient id={`${prefix}-review`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
        <stop offset="55%" stopColor="#f97316" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#f97316" stopOpacity={0.18} />
      </linearGradient>
      <linearGradient id={`${prefix}-accent`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF7A40" stopOpacity={1} />
        <stop offset="55%" stopColor="#FF7A40" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#FF7A40" stopOpacity={0.18} />
      </linearGradient>
    </defs>
  );
}

function gradientUrl(prefix: string, scorePercent: number) {
  return `url(#${prefix}-${tierForScore(scorePercent)})`;
}

function FadingBarShape(
  prefix: string,
  props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: DimensionBarDatum;
  }
) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const score = payload?.scorePercent ?? 0;
  const tier = tierForScore(score);
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[4, 4, 0, 0]}
      fill={gradientUrl(prefix, score)}
      stroke={TIER_STROKE[tier]}
      strokeWidth={1}
    />
  );
}

interface DimensionBarChartProps {
  data: DimensionBarDatum[];
  lowestDimensionPercent: number | null;
  improvementLabel: string;
  className?: string;
}

export function DimensionBarChart({
  data,
  lowestDimensionPercent,
  improvementLabel,
  className = "h-[250px] md:h-[300px] w-full",
}: DimensionBarChartProps) {
  const gradientPrefix = useId().replace(/:/g, "");

  return (
    <ChartContainer config={barConfig} className={className}>
      <BarChart data={data} margin={{ top: 50, right: 10, left: 0, bottom: 0 }}>
        <BarGradientDefs prefix={gradientPrefix} />
        <XAxis
          dataKey="name"
          angle={-20}
          textAnchor="end"
          fontSize={12}
          interval={0}
          height={100}
        />
        <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Score"]}
            />
          }
        />
        <Bar
          dataKey="scorePercent"
          shape={(props) => FadingBarShape(gradientPrefix, props)}
        />
        <ReferenceLine
          y={lowestDimensionPercent ?? 0}
          stroke="#ef4444"
          strokeDasharray="6 6"
          strokeWidth={2}
          ifOverflow="visible"
          label={{
            position: "insideTopRight",
            value: `${improvementLabel} (${(lowestDimensionPercent ?? 0).toFixed(1)}%)`,
            fill: "#ef4444",
            fontSize: 12,
            fontWeight: "bold",
            dy: -10,
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
