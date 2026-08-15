//components\dashboard\charts-grid.tsx
import React from "react";
import { LoadingOverlay } from "../../components/ui/loading-overlay";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Maximize2, Info } from "@/components/icons";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
} from "recharts";
import GaugeChart from "../chart/gauge-chart";
import CustomTooltip from "../chart/custom-tooltip";
import ChartModal from "../chart-modal";
import { RoleAreaChart } from "../chart/area-chart";
import { BarList } from "../tremor_bar";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "../../@/components/ui/chart";
import { EmptyState } from "./empty-state";
import { barColorForScoreClass } from "./dimension-bar-utils";
import { DimensionRespondentsDialog } from "../dimension-respondents-dialog";
import {
    aggregateScoresByVital,
    barDataForSelectedRoles,
    buildVitalsSunburstData,
    ROLE_SCORE_FILTERS,
    type RoleFilterId,
} from "../../lib/vitals-framework";
import { VitalsSunburst } from "./vitals-sunburst";
import { cn } from "../../lib/utils";
import { Checkbox } from "../../@/components/ui/checkbox";

function toTremorBarData(
    barData: { name?: string; scorePercent?: number }[]
) {
    return (barData || []).map((d, i) => {
        const value = Number(d.scorePercent ?? 0);
        return {
            key: `${d.name ?? "dim"}-${i}`,
            name: d.name || `Dimension ${i + 1}`,
            value,
            color: barColorForScoreClass(value),
        };
    });
}

function toVitalBarData(barData: { name?: string; scorePercent?: number }[]) {
    return aggregateScoresByVital(barData).map((v) => ({
        key: v.id,
        name: v.name,
        value: v.value,
        color: v.barClass,
        dimensionCount: v.dimensionCount,
    }));
}

function getImprovementLevel(scorePercent: number) {
    if (scorePercent < 60) return "Priority Improvement Area";
    if (scorePercent < 65) return "Top Improvement Priority";
    if (scorePercent < 70) return "Most Needed Improvement";
    if (scorePercent < 75) return "Key Opportunity Area";
    if (scorePercent < 80) return "Area for Improvement";
    return "Primary Focus Area";
}

// Types
type ChartType = "bar" | "radar" | "gauge" | "role" | "vitals" | "comparison" | null;

interface OverviewChartsProps {
    avgScore: number;
    openChart: ChartType;
    setOpenChart: (chart: ChartType) => void;
    comparisonRadarData: any[];
    barData: any[];
    roleData?: any[];
    theme: string | undefined;
    containerRef: React.RefObject<HTMLDivElement>;
    isLoadingStats?: boolean;
    isLoadingComparison?: boolean;
    aiInsights?: any;
    isGeneratingAI?: boolean;
    isDemo?: boolean;
    onUpgradeClick?: () => void;
}

const comparisonConfig = {
    current: {
        label: "Your Score",
        color: "hsl(var(--primary))",
    },
    average: {
        label: "Industry Average",
        color: "hsl(var(--warning))",
    },
} satisfies ChartConfig;

const radarConfig = {
    you: {
        label: "You",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

export function OverviewCharts({
    avgScore,
    openChart,
    setOpenChart,
    comparisonRadarData,
    barData = [],
    roleData = [],
    theme,
    containerRef,
    isLoadingStats,
    isLoadingComparison,
    aiInsights,
    isGeneratingAI,
    isDemo,
    onUpgradeClick
}: OverviewChartsProps) {
    const [scoreView, setScoreView] = React.useState<"vitals" | "dimensions">(
        "vitals"
    );
    const [selectedRoles, setSelectedRoles] = React.useState<RoleFilterId[]>(
        []
    );

    const filteredBarData = React.useMemo(
        () => barDataForSelectedRoles(roleData, selectedRoles, barData),
        [roleData, selectedRoles, barData]
    );

    const vitalBars = React.useMemo(
        () => toVitalBarData(filteredBarData),
        [filteredBarData]
    );
    const dimensionBars = React.useMemo(
        () => toTremorBarData(filteredBarData),
        [filteredBarData]
    );
    const sunburstData = React.useMemo(
        () => buildVitalsSunburstData(filteredBarData),
        [filteredBarData]
    );
    const hasScoreData = filteredBarData.length > 0;

    const availableRoleIds = React.useMemo(() => {
        const keys = new Set<string>();
        for (const row of roleData || []) {
            Object.keys(row || {}).forEach((k) => {
                if (k !== "dimension") keys.add(k);
            });
        }
        return ROLE_SCORE_FILTERS.filter((f) =>
            [...keys].some((key) => {
                const norm = key.toLowerCase();
                return f.match.some(
                    (token) => norm === token || norm.includes(token)
                );
            })
        ).map((f) => f.id);
    }, [roleData]);

    const toggleRole = (id: RoleFilterId, checked: boolean) => {
        setSelectedRoles((prev) => {
            if (checked) return prev.includes(id) ? prev : [...prev, id];
            return prev.filter((r) => r !== id);
        });
    };

    return (
        <div ref={containerRef} id="tour-overview-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4">
            {/* Gauge Chart */}
            <Card className="w-full shadow-lg border-0 relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Gauge</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenChart("gauge")}
                        disabled={isLoadingStats || avgScore === 0}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className={isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}>
                    {avgScore === 0 && !isLoadingStats ? (
                        <EmptyState />
                    ) : (
                        <GaugeChart
                            score={avgScore}
                            aiInsights={aiInsights}
                            isGeneratingAI={isGeneratingAI}
                            isDemo={isDemo}
                            onUpgradeClick={onUpgradeClick}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Scores by Vitals / Dimensions */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                            <CardTitle>
                                {scoreView === "vitals"
                                    ? "Scores by Vitals"
                                    : "Scores by Dimensions"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {scoreView === "vitals"
                                    ? "Inner ring = vitals · outer ring = dimensions"
                                    : "Individual dimension performance across this survey"}
                                {selectedRoles.length > 0
                                    ? " · filtered by role"
                                    : " · all roles"}
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                setOpenChart(scoreView === "vitals" ? "vitals" : "bar")
                            }
                            disabled={isLoadingStats || !hasScoreData}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
                        <button
                            type="button"
                            onClick={() => setScoreView("vitals")}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                scoreView === "vitals"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            By Vitals
                        </button>
                        <button
                            type="button"
                            onClick={() => setScoreView("dimensions")}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                scoreView === "dimensions"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            By Dimensions
                        </button>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Filter by role
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                            {ROLE_SCORE_FILTERS.map((role) => {
                                const checked = selectedRoles.includes(role.id);
                                const hasData = availableRoleIds.includes(role.id);
                                return (
                                    <label
                                        key={role.id}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 text-xs",
                                            hasData
                                                ? "cursor-pointer text-foreground"
                                                : "cursor-not-allowed opacity-45"
                                        )}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            disabled={!hasData}
                                            onCheckedChange={(v) =>
                                                toggleRole(role.id, v === true)
                                            }
                                        />
                                        <span>{role.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {selectedRoles.length > 0 && (
                            <button
                                type="button"
                                className="mt-2 text-[10px] font-medium text-primary hover:underline"
                                onClick={() => setSelectedRoles([])}
                            >
                                Clear role filters
                            </button>
                        )}
                    </div>
                </CardHeader>

                <CardContent
                    className={`p-2 md:p-4 ${
                        isLoadingStats
                            ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50"
                            : "transition-all duration-500"
                    }`}
                >
                    {!hasScoreData && !isLoadingStats ? (
                        <EmptyState message="No score data available for the selected filters." />
                    ) : scoreView === "vitals" ? (
                        <VitalsSunburst data={sunburstData} size={340} />
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto pr-1">
                            <BarList
                                data={dimensionBars}
                                sortOrder="none"
                                scaleMax={100}
                                showAnimation
                                valueFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <ChartModal open={openChart === "gauge"} onClose={() => setOpenChart(null)} title="Gauge Chart">
                <GaugeChart score={avgScore} bare />
            </ChartModal>

            <ChartModal
                open={openChart === "vitals"}
                onClose={() => setOpenChart(null)}
                title="Scores by Vitals"
            >
                <div className="flex justify-center py-4">
                    <VitalsSunburst data={sunburstData} size={420} />
                </div>
            </ChartModal>

            <ChartModal
                open={openChart === "comparison"}
                onClose={() => setOpenChart(null)}
                title="Survey vs Average Comparison"
            >
                <ChartContainer config={comparisonConfig} className="h-[450px] w-full">
                    <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={comparisonRadarData}
                    >
                        <PolarGrid stroke="#e4e4e7" gridType="polygon" />
                        <PolarAngleAxis
                            dataKey="subject"
                            fontSize={10}
                            fontWeight={700}
                            tick={{ fill: "#71717a" }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Current Survey"
                            dataKey="current"
                            stroke="#14b8a6"
                            fill="#14b8a6"
                            fillOpacity={0.6}
                            strokeWidth={3}
                        />
                        <Radar
                            name="Average"
                            dataKey="average"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.4}
                            strokeWidth={2}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend iconType="rect" verticalAlign="bottom" />
                    </RadarChart>
                </ChartContainer>
            </ChartModal>
        </div>
    );
}

interface DetailedChartsProps {
    barData: any[];
    roleData: any[];
    lowestDimensionPercent: number | null;
    openChart: ChartType;
    setOpenChart: (chart: ChartType) => void;
    containerRef: React.RefObject<HTMLDivElement>;
    radarData: any[];
    isLoadingStats?: boolean;
    surveyId?: string | null;
    orgId?: string | null;
    isPlatformAdmin?: boolean;
}

export function DetailedCharts({
    barData,
    roleData,
    lowestDimensionPercent,
    openChart,
    setOpenChart,
    containerRef,
    radarData,
    isLoadingStats,
    surveyId = null,
    orgId = null,
    isPlatformAdmin = false,
}: DetailedChartsProps) {
    const [dimensionDialogOpen, setDimensionDialogOpen] = React.useState(false);
    const [selectedDimension, setSelectedDimension] = React.useState<string | null>(
        null
    );

    const improvementLabel =
        lowestDimensionPercent !== null
            ? getImprovementLevel(lowestDimensionPercent)
            : "Improvement Area";

    const referenceLine =
        lowestDimensionPercent != null
            ? {
                  value: lowestDimensionPercent,
                  label: `${improvementLabel} (${lowestDimensionPercent.toFixed(1)}%)`,
              }
            : null;

    const handleDimensionClick = (payload: { name: string }) => {
        setSelectedDimension(payload.name);
        setDimensionDialogOpen(true);
    };

    const dimensionSummary = React.useMemo(() => {
        if (!barData?.length) return null;
        let critical = 0;
        let review = 0;
        let onTrack = 0;
        let sum = 0;
        let lowest = barData[0];
        for (const d of barData) {
            const pct = Number(d.scorePercent ?? 0);
            sum += pct;
            if (pct < 70) critical += 1;
            else if (pct < 75) review += 1;
            else onTrack += 1;
            if (pct < Number(lowest.scorePercent ?? 100)) lowest = d;
        }
        return {
            total: barData.length,
            critical,
            review,
            onTrack,
            avg: sum / barData.length,
            lowestName: String(lowest.name || "—"),
            lowestPct: Number(lowest.scorePercent ?? 0),
        };
    }, [barData]);

    return (
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-1 gap-2 md:gap-4">
            {/* Dimension scores */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Scores by Dimension</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground mr-4">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>&lt;70% Critical</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#eab308]"></div>&lt;75% Review</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>≥75% On track</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpenChart("bar")}
                            disabled={isLoadingStats || barData.length === 0}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className={`p-2 md:p-6 ${isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}`}>
                    {barData.length === 0 && !isLoadingStats ? (
                        <EmptyState message="No dimension data available yet." />
                    ) : (
                        <div className="space-y-3">
                            <div className="max-h-[280px] overflow-y-auto pr-1 pt-5">
                                <p className="text-[10px] text-muted-foreground mb-2">
                                    Hover to enlarge · click a dimension for respondent answers
                                </p>
                                <BarList
                                    data={toTremorBarData(barData)}
                                    sortOrder="none"
                                    scaleMax={100}
                                    showAnimation
                                    referenceLine={referenceLine}
                                    valueFormatter={(v) => `${v.toFixed(1)}%`}
                                    onValueChange={handleDimensionClick}
                                />
                            </div>
                            {dimensionSummary && (
                                <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3 px-0.5">
                                    Across {dimensionSummary.total} dimensions, average is{" "}
                                    <span className="font-medium text-foreground">
                                        {dimensionSummary.avg.toFixed(1)}%
                                    </span>
                                    .{" "}
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                        {dimensionSummary.critical} critical
                                    </span>
                                    ,{" "}
                                    <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                                        {dimensionSummary.review} need review
                                    </span>
                                    ,{" "}
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        {dimensionSummary.onTrack} on track
                                    </span>
                                    . Lowest:{" "}
                                    <span className="font-medium text-foreground">
                                        {dimensionSummary.lowestName}
                                    </span>{" "}
                                    ({dimensionSummary.lowestPct.toFixed(1)}%).
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Role Area Chart */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle>Scores by Role</CardTitle>
                        <CardDescription>
                            Comparing dimension scores across different roles
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenChart("role")}
                        disabled={isLoadingStats || roleData.length === 0}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className={isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}>
                    {roleData.length === 0 && !isLoadingStats ? (
                        <EmptyState message="No role-based data available yet." />
                    ) : (
                        <RoleAreaChart data={roleData} />
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <ChartModal
                open={openChart === "bar"}
                onClose={() => setOpenChart(null)}
                title="Scores by Dimension"
            >
                <div className="max-h-[70vh] overflow-y-auto pr-1 pt-5">
                    <BarList
                        data={toTremorBarData(barData)}
                        sortOrder="none"
                        scaleMax={100}
                        showAnimation
                        referenceLine={referenceLine}
                        valueFormatter={(v) => `${v.toFixed(1)}%`}
                        onValueChange={handleDimensionClick}
                    />
                </div>
            </ChartModal>

            <ChartModal
                open={openChart === "role"}
                onClose={() => setOpenChart(null)}
                title="Scores by Role"
            >
                <RoleAreaChart data={roleData} bare />
            </ChartModal>

            <ChartModal open={openChart === "radar"} onClose={() => setOpenChart(null)} title="Radar Chart">
                <ChartContainer config={radarConfig} className="h-[450px] w-full">
                    <RadarChart cx="50%" cy="30%" outerRadius="50%" data={radarData}>
                        <PolarGrid opacity={0.4} />
                        <PolarAngleAxis dataKey="subject" fontSize={12} />
                        <PolarRadiusAxis angle={30} domain={[0, 4]} />
                        <Radar name="You" dataKey="you" stroke="#FF7A40" fill="#FF7A40" fillOpacity={0.4} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                </ChartContainer>
            </ChartModal>

            <DimensionRespondentsDialog
                open={dimensionDialogOpen}
                onOpenChange={setDimensionDialogOpen}
                dimension={selectedDimension}
                surveyId={surveyId}
                orgId={orgId}
                isPlatformAdmin={isPlatformAdmin}
            />
        </div>
    );
}
