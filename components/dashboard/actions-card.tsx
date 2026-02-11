import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface ActionsCardProps {
    criticalCount: number;
    atRiskCount: number;
    completedCount?: number;
    onViewActions?: () => void;
    className?: string;
}

export function ActionsCard({
    criticalCount,
    atRiskCount,
    completedCount = 0,
    onViewActions,
    className,
}: ActionsCardProps) {
    const totalActive = criticalCount + atRiskCount;

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Action Plans
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Active */}
                <div>
                    <div className="text-3xl font-bold tracking-tight">
                        {totalActive}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Active actions</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-muted-foreground">Critical</span>
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400">
                            {criticalCount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-muted-foreground">At Risk</span>
                        </div>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                            {atRiskCount}
                        </span>
                    </div>
                    {completedCount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-muted-foreground">Completed</span>
                            </div>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {completedCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* View Actions Link */}
                {onViewActions && (
                    <button
                        onClick={onViewActions}
                        className="w-full text-xs text-primary hover:underline text-left mt-2"
                    >
                        View all actions →
                    </button>
                )}
            </CardContent>
        </Card>
    );
}
