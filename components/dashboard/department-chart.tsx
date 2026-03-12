"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend
} from "recharts";
import {
    Card, CardHeader, CardTitle, CardContent, CardDescription
} from "../ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "../ui/chart"
import { supabase } from "../../lib/supabaseClient";
import { Building } from "lucide-react";

interface DepartmentChartProps {
    orgId?: string;
    surveyId?: string;
    isPlatformAdmin?: boolean;
}

interface DeptData {
    department: string;
    avg_score: number;
    respondent_count: number;
}

const chartConfig = {
    avg_score: {
        label: "Score",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const COLORS = [
    "#4A90E2", "#50C878", "#FF7A40", "#9B59B6",
    "#E74C3C", "#1ABC9C", "#F39C12", "#3498DB"
];

export function DepartmentChart({ orgId, surveyId, isPlatformAdmin }: DepartmentChartProps) {
    const [data, setData] = useState<DeptData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!orgId && !isPlatformAdmin) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            let query = supabase
                .from("v_org_scores_by_department")
                .select("department, avg_score, respondent_count");

            if (orgId) query = query.eq("org_id", orgId);
            if (surveyId) query = query.eq("survey_id", surveyId);

            const { data: rows, error } = await query;
            if (error) throw error;

            // Aggregate across surveys if no specific survey
            const deptMap: Record<string, { scores: number[]; count: number }> = {};
            (rows || []).forEach((r: any) => {
                if (!deptMap[r.department]) deptMap[r.department] = { scores: [], count: 0 };
                deptMap[r.department].scores.push(parseFloat(r.avg_score));
                deptMap[r.department].count += parseInt(r.respondent_count);
            });

            const aggregated = Object.entries(deptMap).map(([dept, val]) => ({
                department: dept,
                avg_score: parseFloat((val.scores.reduce((a, b) => a + b, 0) / val.scores.length).toFixed(2)),
                respondent_count: val.count,
            })).sort((a, b) => b.avg_score - a.avg_score);

            setData(aggregated);
        } catch (err) {
            console.error("DepartmentChart error:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [orgId, surveyId, isPlatformAdmin]);

    useEffect(() => { fetchData(); }, [fetchData]);

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
                        {[1, 2, 3].map(i => (
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
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No department data available</p>
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
                    <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
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
                            content={<ChartTooltipContent indicator="line" labelFormatter={(value) => `Avg Score: ${value}`} />}
                        />
                        <Bar dataKey="avg_score" fill="var(--color-avg_score)" radius={[0, 4, 4, 0]} maxBarSize={28}>
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
