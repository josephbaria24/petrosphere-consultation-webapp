import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface KPICardProps {
    title: string;
    value: string | number;
    trend?: number; // Percentage change (positive or negative)
    icon?: LucideIcon;
    suffix?: string;
    className?: string;
    valueClassName?: string;
}

export function KPICard({
    title,
    value,
    trend,
    icon: Icon,
    suffix = "",
    className,
    valueClassName,
}: KPICardProps) {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend > 0) return <ArrowUp className="h-4 w-4" />;
        if (trend < 0) return <ArrowDown className="h-4 w-4" />;
        return <Minus className="h-4 w-4" />;
    };

    const getTrendColor = () => {
        if (!trend) return "text-muted-foreground";
        if (trend > 0) return "text-emerald-600 dark:text-emerald-400";
        if (trend < 0) return "text-red-600 dark:text-red-400";
        return "text-muted-foreground";
    };

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && (
                    <Icon className="h-4 w-4 text-muted-foreground opacity-70" />
                )}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className={cn("text-3xl font-bold tracking-tight", valueClassName)}>
                        {typeof value === "number" ? value.toLocaleString() : value}
                        {suffix && <span className="text-xl ml-1">{suffix}</span>}
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={cn("flex items-center gap-1 text-xs mt-2", getTrendColor())}>
                        {getTrendIcon()}
                        <span className="font-medium">
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">vs last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
