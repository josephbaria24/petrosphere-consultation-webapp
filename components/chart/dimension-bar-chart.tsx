"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../@/components/ui/chart";
import { Button } from "../ui/button";
import { Minus, Plus, RotateCcw } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface DimensionBarDatum {
  name: string;
  scorePercent: number;
}

const barConfig = {
  scorePercent: {
    label: "Score",
  },
} satisfies ChartConfig;

/** Solid fills: red <70, yellow <75, blue ≥75 */
export function colorForScore(scorePercent: number): string {
  if (scorePercent < 70) return "#ef4444";
  if (scorePercent < 75) return "#eab308";
  return "#2563eb";
}

function truncateLabel(label: string, max = 42) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

interface DimensionBarChartProps {
  data: DimensionBarDatum[];
  lowestDimensionPercent: number | null;
  improvementLabel: string;
  /** Max height of the scroll viewport (px). Chart grows with row count inside. */
  maxViewportHeight?: number;
  hideControls?: boolean;
}

/**
 * Horizontal bar chart — best practice for long category labels
 * (Storytelling with Data / shadcn charts): labels read left→right.
 * Horizontal zoom widens the plot; scroll when overflow.
 */
export function DimensionBarChart({
  data,
  lowestDimensionPercent,
  improvementLabel,
  maxViewportHeight = 280,
  hideControls = false,
}: DimensionBarChartProps) {
  const [hZoom, setHZoom] = useState(1);

  const labelWidth = useMemo(() => {
    const longest = data.reduce((m, d) => Math.max(m, d.name.length), 0);
    return Math.min(220, Math.max(110, longest * 6));
  }, [data]);

  const chartHeight = Math.max(160, data.length * 32 + 40);

  return (
    <div className="w-full space-y-2">
      {!hideControls && (
        <div className="flex flex-wrap items-center justify-end gap-1 px-1">
          <span className="mr-auto text-[10px] text-muted-foreground">
            Zoom stretches the score scale horizontally
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="Zoom out"
            disabled={hZoom <= 1}
            onClick={() =>
              setHZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))
            }
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-center">
            {Math.round(hZoom * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="Zoom in (horizontal)"
            disabled={hZoom >= 2.5}
            onClick={() =>
              setHZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))
            }
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Reset zoom"
            disabled={hZoom === 1}
            onClick={() => setHZoom(1)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div
        className="w-full overflow-auto rounded-md border border-border/40"
        style={{ maxHeight: maxViewportHeight }}
      >
        <div
          style={{
            width: `${hZoom * 100}%`,
            minWidth: "100%",
            height: chartHeight,
          }}
        >
          <ChartContainer
            config={barConfig}
            className={cn("!aspect-auto h-full w-full justify-stretch")}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 8,
                right: 44,
                left: 4,
                bottom: 8,
              }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={labelWidth}
                interval={0}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => truncateLabel(String(v), 40)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | DimensionBarDatum
                        | undefined;
                      return row?.name ?? "";
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      "Score",
                    ]}
                  />
                }
              />
              <Bar
                dataKey="scorePercent"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}-${index}`}
                    fill={colorForScore(entry.scorePercent)}
                  />
                ))}
                <LabelList
                  dataKey="scorePercent"
                  position="right"
                  formatter={(v) => `${Number(v).toFixed(0)}%`}
                  className="fill-foreground text-[10px]"
                />
              </Bar>
              {lowestDimensionPercent != null && (
                <ReferenceLine
                  x={lowestDimensionPercent}
                  stroke="#ef4444"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  ifOverflow="visible"
                  label={{
                    position: "insideTopRight",
                    value: `${improvementLabel} (${lowestDimensionPercent.toFixed(1)}%)`,
                    fill: "#ef4444",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
              )}
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
