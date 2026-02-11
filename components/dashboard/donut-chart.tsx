import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTheme } from "next-themes";

interface ScoreRange {
    name: string;
    value: number;
    range: string;
}

interface DonutChartProps {
    data: ScoreRange[];
    title?: string;
    className?: string;
}

const COLORS = {
    light: {
        "1-2": "#ef4444", // red-500
        "2-3": "#f97316", // orange-500
        "3-4": "#eab308", // yellow-500
        "4-5": "#22c55e", // green-500
    },
    dark: {
        "1-2": "#dc2626", // red-600
        "2-3": "#ea580c", // orange-600
        "3-4": "#ca8a04", // yellow-600
        "4-5": "#16a34a", // green-600
    },
};

export function DonutChart({ data, title = "Score Distribution", className }: DonutChartProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const getColor = (range: string) => {
        const colorMap = isDark ? COLORS.dark : COLORS.light;
        return colorMap[range as keyof typeof colorMap] || "#94a3b8";
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium">{payload[0].name}</p>
                    <p className="text-xs text-muted-foreground">
                        {payload[0].value} responses ({((payload[0].value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.range)} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => (
                                <span className="text-xs text-muted-foreground">
                                    {entry.payload.range}: {entry.payload.value}
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
