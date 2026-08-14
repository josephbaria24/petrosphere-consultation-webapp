"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface RoleAreaChartProps {
  data: Record<string, string | number | null | undefined>[];
  bare?: boolean;
}

const ROLE_HEX = [
  "#3B82F6",
  "#06B6D4",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#84CC16",
  "#D946EF",
  "#6B7280",
];

const toPercentage = (score: number): number =>
  ((score - 1) / (5 - 1)) * 100;

const valueFormatter = (number: number) =>
  `${Intl.NumberFormat("us", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(number)}%`;

function shortDimension(label: string): string {
  const match = label.match(/^(\d+)\./);
  if (match) return match[1];
  return label.length > 14 ? `${label.slice(0, 12)}…` : label;
}

function RoleTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            key={String(item.dataKey)}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name || String(item.dataKey)}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {valueFormatter(Number(item.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoleAreaChart({ data, bare }: RoleAreaChartProps) {
  const roles =
    data.length > 0
      ? Array.from(
          new Set(
            data.flatMap((row) =>
              Object.keys(row).filter((k) => k !== "dimension")
            )
          )
        )
      : [];

  if (data.length === 0 || roles.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No role-based data available yet.
      </p>
    );
  }

  const percentData = data.map((row) => {
    const newRow: Record<string, string | number> = {
      dimension: String(row.dimension ?? ""),
    };
    roles.forEach((role) => {
      const score = row[role];
      // Use numeric values only; skip nulls by omitting (Recharts handles sparse better with 0 + connectNulls false for single series)
      if (typeof score === "number" && !Number.isNaN(score)) {
        newRow[role] = Math.round(toPercentage(score) * 10) / 10;
      }
    });
    // Ensure every role key exists so Area always has a path
    roles.forEach((role) => {
      if (typeof newRow[role] !== "number") {
        newRow[role] = 0;
      }
    });
    return newRow;
  });

  const height = bare ? 420 : 320;

  return (
    <div className="w-full min-h-[240px]" style={{ height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={240}>
        <AreaChart
          data={percentData}
          margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="dimension"
            tickFormatter={shortDimension}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            minTickGap={8}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip content={<RoleTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
          />
          {roles.map((role, i) => {
            const color = ROLE_HEX[i % ROLE_HEX.length];
            return (
              <Area
                key={role}
                type="monotone"
                dataKey={role}
                name={role}
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 3, strokeWidth: 1, stroke: "#fff", fill: color }}
                activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff" }}
                isAnimationActive={false}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
