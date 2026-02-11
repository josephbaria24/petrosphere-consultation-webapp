import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";
import { Calendar } from "lucide-react";

interface TimelineDataPoint {
    date: string;
    count: number;
}

interface TimelineChartProps {
    data: TimelineDataPoint[];
    title?: string;
    className?: string;
}

export function TimelineChart({ data, title = "Response Activity", className }: TimelineChartProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium">{payload[0].payload.date}</p>
                    <p className="text-xs text-muted-foreground">
                        {payload[0].value} responses
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isDark ? "#3b82f6" : "#60a5fa"} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={isDark ? "#3b82f6" : "#60a5fa"} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke={isDark ? "#3b82f6" : "#2563eb"}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
