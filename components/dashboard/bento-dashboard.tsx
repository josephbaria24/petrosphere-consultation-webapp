import React from "react";
import { KPICard } from "./kpi-card";
import { DonutChart } from "./donut-chart";
import { TimelineChart } from "./timeline-chart";
import { SparklineCard } from "./sparkline-card";
import { ActionsCard } from "./actions-card";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Activity, Users, Target } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { Maximize2 } from "lucide-react";

interface BentoDashboardProps {
    // KPI Data
    avgScore: number;
    totalRespondents: number;
    completionRate: number;

    // Chart Data
    scoreDistribution: Array<{ name: string; value: number; range: string }>;
    responseTimeline: Array<{ date: string; count: number }>;
    dimensionTrends: Array<{
        dimension: string;
        currentScore: number;
        data: Array<{ date: string; score: number }>;
        trend: "up" | "down" | "stable";
    }>;
    topBottomDimensions: Array<{ dimension: string; score: number }>;

    // Actions Data
    criticalActionsCount: number;
    atRiskActionsCount: number;

    // Handlers
    onViewActions?: () => void;
    setOpenChart?: (chart: any) => void;
}

export function BentoDashboard({
    avgScore,
    totalRespondents,
    completionRate,
    scoreDistribution,
    responseTimeline,
    dimensionTrends,
    topBottomDimensions,
    criticalActionsCount,
    atRiskActionsCount,
    onViewActions,
    setOpenChart,
}: BentoDashboardProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Sort and get top 3 and bottom 3
    const sortedDimensions = [...topBottomDimensions].sort((a, b) => b.score - a.score);
    const topDimensions = sortedDimensions.slice(0, 3);
    const bottomDimensions = sortedDimensions.slice(-3).reverse();
    const combinedDimensions = [...topDimensions, ...bottomDimensions];

    const getBarColor = (score: number, index: number) => {
        if (index < 3) return isDark ? "#22c55e" : "#16a34a"; // Top 3 - green
        return isDark ? "#ef4444" : "#dc2626"; // Bottom 3 - red
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {/* Row 1: KPI Cards */}
            <KPICard
                title="Average Score"
                value={avgScore.toFixed(2)}
                suffix="/5"
                icon={Activity}
                className="lg:col-span-1"
            />
            <KPICard
                title="Total Respondents"
                value={totalRespondents}
                icon={Users}
                className="lg:col-span-1"
            />
            <KPICard
                title="Completion Rate"
                value={completionRate.toFixed(1)}
                suffix="%"
                icon={Target}
                className="lg:col-span-1"
            />
            <ActionsCard
                criticalCount={criticalActionsCount}
                atRiskCount={atRiskActionsCount}
                onViewActions={onViewActions}
                className="lg:col-span-1"
            />

            {/* Row 2: Timeline (large) + Donut (small) */}
            <TimelineChart
                data={responseTimeline}
                className="lg:col-span-3 lg:row-span-1"
            />
            <DonutChart
                data={scoreDistribution}
                className="lg:col-span-1 lg:row-span-1"
            />

            {/* Row 3: Top/Bottom Dimensions + Sparklines */}
            <Card className="lg:col-span-2 lg:row-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top & Bottom Dimensions</CardTitle>
                    {setOpenChart && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpenChart("bar")}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                            data={combinedDimensions}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                        >
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis
                                type="category"
                                dataKey="dimension"
                                tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
                                width={90}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                                    borderRadius: "8px",
                                }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {combinedDimensions.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score, index)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <SparklineCard
                data={dimensionTrends}
                className="lg:col-span-2 lg:row-span-1"
            />
        </div>
    );
}
