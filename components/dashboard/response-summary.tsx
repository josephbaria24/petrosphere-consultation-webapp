import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "../ui/dropdown-menu";
import {
    PieChart,
    AlertTriangle,
    Target,
    CheckCircle2,
    ChevronDown,
    Plus,
    Trash2,
    Calendar,
    User,
} from "lucide-react";
import { Action } from "./types";

interface ResponseSummaryProps {
    respondentCount: number;
    avgScore: number;
    minAcceptableScore: number;
    belowMinimumDimensions: string[];
    atRiskDimensions: string[];
    strongDimensions: string[];
    actions: Action[];
    onAddAction: (dimension: string, status: "critical" | "at_risk") => void;
    onDeleteAction: (id: string) => void;
    onToggleAction: (id: string, isCompleted: boolean) => void;
}

export function ResponseSummary({
    respondentCount,
    avgScore,
    minAcceptableScore,
    belowMinimumDimensions,
    atRiskDimensions,
    strongDimensions,
    actions,
    onAddAction,
    onDeleteAction,
    onToggleAction,
}: ResponseSummaryProps) {
    const toPercentage = (score: number): number => {
        return (score / 5) * 100;
    };

    const renderDimensionItem = (
        dimension: string,
        status: "critical" | "at_risk"
    ) => {
        const statusColor = status === "critical" ? "red" : "yellow";
        const dimensionActions = actions.filter(
            (a) => a.dimension === dimension && a.status === status
        );

        return (
            <div key={dimension} className="space-y-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={`w-full justify-between text-left p-2 h-auto border border-${statusColor}-200 dark:border-${statusColor}-800 hover:bg-${statusColor}-50 dark:hover:bg-${statusColor}-950/20`}
                        >
                            <span className="text-sm">• {dimension}</span>
                            <div className="flex items-center gap-2">
                                {dimensionActions.length > 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                        {dimensionActions.length} action
                                        {dimensionActions.length > 1 ? "s" : ""}
                                    </span>
                                )}
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                        <div className="p-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{dimension}</span>
                                <Button
                                    size="sm"
                                    onClick={() => onAddAction(dimension, status)}
                                    className="h-6 px-2 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Action
                                </Button>
                            </div>

                            {dimensionActions.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {dimensionActions.map((action) => (
                                        <div
                                            key={action.id}
                                            className={`p-2 border rounded text-xs space-y-1 ${action.is_completed
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                                : "bg-card"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <span
                                                    className={`font-medium ${action.is_completed
                                                        ? "line-through text-muted-foreground"
                                                        : ""
                                                        }`}
                                                >
                                                    {action.title}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onDeleteAction(action.id)}
                                                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            {action.description && (
                                                <p className="text-muted-foreground">
                                                    {action.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {action.priority && (
                                                        <span
                                                            className={`px-1 py-0.5 rounded text-xs font-medium ${action.priority === "high"
                                                                ? "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                                                                : action.priority === "medium"
                                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400"
                                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400"
                                                                }`}
                                                        >
                                                            {action.priority}
                                                        </span>
                                                    )}
                                                    {action.target_date && (
                                                        <span className="flex items-center gap-1 text-muted-foreground">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(action.target_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        onToggleAction(action.id, !action.is_completed)
                                                    }
                                                    className="h-5 px-1 text-xs"
                                                >
                                                    {action.is_completed ? "Reopen" : "Complete"}
                                                </Button>
                                            </div>

                                            {action.assigned_to && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <User className="w-3 h-3" />
                                                    <span>{action.assigned_to}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-xs">
                                    No actions created yet
                                </p>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Response Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-center p-3 md:p-4 bg-muted/50 rounded-lg border border-border/50">
                        <div className="text-xl md:text-2xl font-bold">{respondentCount}</div>
                        <div className="text-xs md:text-sm text-muted-foreground">Total Responses</div>
                    </div>
                    <div className="text-center p-3 md:p-4 bg-muted/50 rounded-lg border border-border/50">
                        <div className="text-xl md:text-2xl font-bold">
                            {toPercentage(avgScore).toFixed(1)}%
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Overall Score</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span>Dimension Status</span>
                        <span>Dimension Count</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            Critical (≤ {minAcceptableScore.toFixed(1)})
                        </span>
                        <span className="font-semibold">{belowMinimumDimensions.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            At Risk ({minAcceptableScore.toFixed(1)} -{" "}
                            {(minAcceptableScore + 0.5).toFixed(1)})
                        </span>
                        <span className="font-semibold">{atRiskDimensions.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            Strong (&gt; {(minAcceptableScore + 0.5).toFixed(1)})
                        </span>
                        <span className="font-semibold">{strongDimensions.length}</span>
                    </div>
                </div>

                {/* Interactive Dimension Lists */}
                <div className="space-y-4 pt-4">
                    {belowMinimumDimensions.length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                            <h4 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-3">
                                <AlertTriangle className="w-4 h-4" />
                                Critical Areas
                            </h4>
                            <div className="space-y-2">
                                {belowMinimumDimensions.map((dim) =>
                                    renderDimensionItem(dim, "critical")
                                )}
                            </div>
                        </div>
                    )}

                    {atRiskDimensions.length > 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <h4 className="flex items-center gap-2 font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
                                <Target className="w-4 h-4" />
                                At Risk Areas
                            </h4>
                            <div className="space-y-2">
                                {atRiskDimensions.map((dim) =>
                                    renderDimensionItem(dim, "at_risk")
                                )}
                            </div>
                        </div>
                    )}

                    {strongDimensions.length > 0 && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <h4 className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400 mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Strengths
                            </h4>
                            <div className="space-y-1">
                                {strongDimensions.map((dim) => (
                                    <div
                                        key={dim}
                                        className="text-sm text-green-600 dark:text-green-400"
                                    >
                                        • {dim}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
