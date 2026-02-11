
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Lightbulb, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SafetyInsightsProps {
    lowestDimension: { name: string; score: number } | null;
    highestDimension: { name: string; score: number } | null;
    trend: number;
}

export function SafetyInsights({ lowestDimension, highestDimension, trend }: SafetyInsightsProps) {
    const insights = [];

    if (lowestDimension) {
        insights.push({
            id: 'low-score',
            icon: AlertTriangle,
            color: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            title: "Improvement Opportunity",
            message: `${lowestDimension.name} scored lowest (${lowestDimension.score.toFixed(1)}%). Consider targeted training or process review.`
        });
    }

    if (highestDimension) {
        insights.push({
            id: 'high-score',
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            title: "Core Strength",
            message: `${highestDimension.name} is your strongest area (${highestDimension.score.toFixed(1)}%). Leverage this to mentor other teams.`
        });
    }

    if (trend < 0) {
        insights.push({
            id: 'negative-trend',
            icon: TrendingDown,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            title: "Negative Trend",
            message: "Overall safety culture score has declined since the previous period. Investigate recent changes or incidents."
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: 'no-insights',
            icon: Lightbulb,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            title: "Data Collection",
            message: "Continue collecting responses to generate specific safety insights."
        });
    }

    return (
        <Card className="border-0 shadow-lg h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Safety Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                {insights.map((insight) => (
                    <div key={insight.id} className={`p-4 rounded-lg flex gap-3 ${insight.bgColor}`}>
                        <div className={`mt-0.5 ${insight.color}`}>
                            <insight.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className={`font-semibold text-sm ${insight.color}`}>{insight.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {insight.message}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
