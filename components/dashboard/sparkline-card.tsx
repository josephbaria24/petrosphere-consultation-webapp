import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

interface SparklineData {
    dimension: string;
    currentScore: number;
    data: Array<{ date: string; score: number }>;
    trend: "up" | "down" | "stable";
}

interface SparklineCardProps {
    data: SparklineData[];
    title?: string;
    className?: string;
}

export function SparklineCard({ data, title = "Dimension Trends", className }: SparklineCardProps) {
    const getTrendColor = (trend: string) => {
        if (trend === "up") return "text-emerald-600 dark:text-emerald-400";
        if (trend === "down") return "text-red-600 dark:text-red-400";
        return "text-muted-foreground";
    };

    const getLineColor = (trend: string) => {
        if (trend === "up") return "#22c55e";
        if (trend === "down") return "#ef4444";
        return "#94a3b8";
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.dimension}</p>
                                <p className={cn("text-xs font-medium", getTrendColor(item.trend))}>
                                    {item.currentScore.toFixed(2)}
                                </p>
                            </div>
                            <div className="w-24 h-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={item.data}>
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke={getLineColor(item.trend)}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
