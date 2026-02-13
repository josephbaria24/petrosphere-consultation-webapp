//components\dashboard\charts-grid.tsx
import React from "react";
import { LoadingOverlay } from "../../components/ui/loading-overlay";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Maximize2, Info } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    ReferenceLine,
    Cell,
} from "recharts";
import GaugeChart from "../chart/gauge-chart";
import CustomTooltip from "../chart/custom-tooltip";
import ChartModal from "../chart-modal";
import { RoleAreaChart } from "../chart/area-chart";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "../../@/components/ui/chart";

// Types
type ChartType = "bar" | "radar" | "gauge" | "role" | "comparison" | null;

interface OverviewChartsProps {
    avgScore: number;
    openChart: ChartType;
    setOpenChart: (chart: ChartType) => void;
    comparisonRadarData: any[];
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

const barConfig = {
    scorePercent: {
        label: "Score",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const radarConfig = {
    you: {
        label: "You",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

// Helper to determine improvement level text
const getImprovementLevel = (scorePercent: number) => {
    if (scorePercent < 60) return "Priority Improvement Area";
    if (scorePercent < 65) return "Top Improvement Priority";
    if (scorePercent < 70) return "Most Needed Improvement";
    if (scorePercent < 75) return "Key Opportunity Area";
    if (scorePercent < 80) return "Area for Improvement";
    return "Primary Focus Area";
};

// Helper to determine bar color
const getBarColor = (scorePercent: number) => {
    if (scorePercent < 70) return "#ef4444"; // Red for < 70%
    if (scorePercent < 75) return "#f97316"; // Orange for < 75%
    return "#2563eb"; // Blue (Tailwind blue-600) for >= 75%
};

export function OverviewCharts({
    avgScore,
    openChart,
    setOpenChart,
    comparisonRadarData,
    theme,
    containerRef,
    isLoadingStats,
    isLoadingComparison,
    aiInsights,
    isGeneratingAI,
    isDemo,
    onUpgradeClick
}: OverviewChartsProps) {
    const toPercentage = (score: number): number => {
        return (score / 5) * 100;
    };

    return (
        <div ref={containerRef} id="tour-overview-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Gauge Chart */}
            <Card className="w-full shadow-lg border-0 relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Gauge</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenChart("gauge")}
                        disabled={isLoadingStats}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className={isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}>
                    <GaugeChart
                        score={avgScore}
                        aiInsights={aiInsights}
                        isGeneratingAI={isGeneratingAI}
                        isDemo={isDemo}
                        onUpgradeClick={onUpgradeClick}
                    />
                </CardContent>
            </Card>

            {/* Comparison Radar Chart */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {(isLoadingComparison || isLoadingStats) && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Survey vs Average</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenChart("comparison")}
                        disabled={isLoadingComparison || isLoadingStats}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className={`h-[400px] md:h-[550px] p-2 md:p-4 ${(isLoadingComparison || isLoadingStats) ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}`}>
                    <ChartContainer config={comparisonConfig} className="h-full w-full">
                        <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            data={comparisonRadarData}
                        >
                            <PolarGrid stroke="#e4e4e7" strokeWidth={1} gridType="polygon" />
                            <PolarAngleAxis
                                dataKey="subject"
                                fontSize={window.innerWidth < 768 ? 8 : 10}
                                fontWeight={700}
                                tick={{ fill: theme === "dark" ? "#a1a1aa" : "#71717a" }}
                                dy={4}
                            />
                            <PolarRadiusAxis
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                            />

                            <Radar
                                name="Your Score"
                                dataKey="current"
                                stroke="#14b8a6"
                                fill="#14b8a6"
                                fillOpacity={0.6}
                                strokeWidth={3}
                            />
                            <Radar
                                name="Industry Average"
                                dataKey="average"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.4}
                                strokeWidth={2}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="rect"
                                wrapperStyle={{
                                    paddingTop: "20px",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: theme === "dark" ? "#fff" : "#000",
                                }}
                            />
                        </RadarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Modals */}
            <ChartModal open={openChart === "gauge"} onClose={() => setOpenChart(null)} title="Gauge Chart">
                <GaugeChart score={avgScore} bare />
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
}: DetailedChartsProps) {

    // Process bar data with colors
    const coloredBarData = barData.map(d => ({
        ...d,
        fill: getBarColor(d.scorePercent)
    }));

    const improvementLabel = lowestDimensionPercent !== null
        ? getImprovementLevel(lowestDimensionPercent)
        : "Improvement Area";

    return (
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-1 gap-2">
            {/* Bar Chart */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Bar Chart</CardTitle>
                    <div className="flex items-center gap-2">
                        {/* Legend for color meaning */}
                        <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground mr-4">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>&lt;70% Critical</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f97316]"></div>&lt;75% Review</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpenChart("bar")}
                            disabled={isLoadingStats}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className={isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}>
                    <ChartContainer config={barConfig} className="h-[300px] w-full">
                        <BarChart
                            data={coloredBarData}
                            margin={{ top: 50, right: 10, left: 0, bottom: 0 }}
                        >
                            <XAxis
                                dataKey="name"
                                angle={-20}
                                textAnchor="end"
                                fontSize={12}
                                interval={0}
                                height={100}
                            />
                            <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />

                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="scorePercent" radius={[4, 4, 0, 0]}>
                                {coloredBarData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>

                            <ReferenceLine
                                y={lowestDimensionPercent ?? 0}
                                stroke="red"
                                strokeDasharray="6 6"
                                strokeWidth={2}
                                ifOverflow="visible"
                                label={{
                                    position: "insideTopRight",
                                    value: `${improvementLabel} (${(lowestDimensionPercent ?? 0).toFixed(1)}%)`,
                                    fill: "red",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    dy: -10
                                }}
                            />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Role Area Chart */}
            <Card className="w-full border-0 shadow-lg relative overflow-hidden">
                {isLoadingStats && <LoadingOverlay />}
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Scores by Role</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenChart("role")}
                        disabled={isLoadingStats}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className={isLoadingStats ? "filter blur-[4px] grayscale-[0.5] transition-all duration-500 opacity-50" : "transition-all duration-500"}>
                    <RoleAreaChart data={roleData} />
                </CardContent>
            </Card>

            {/* Modals */}
            <ChartModal
                open={openChart === "bar"}
                onClose={() => setOpenChart(null)}
                title="Bar Chart"
            >
                <ChartContainer config={barConfig} className="h-[300px] w-full">
                    <BarChart
                        data={coloredBarData}
                        margin={{ top: 50, right: 10, left: 0, bottom: 0 }}
                    >
                        <XAxis
                            dataKey="name"
                            angle={-20}
                            textAnchor="end"
                            fontSize={12}
                            interval={0}
                            height={100}
                        />
                        <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="scorePercent" radius={[4, 4, 0, 0]}>
                            {coloredBarData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                        <ReferenceLine
                            y={lowestDimensionPercent ?? 0}
                            stroke="red"
                            strokeDasharray="6 6"
                            strokeWidth={2}
                            ifOverflow="visible"
                            label={{
                                position: "insideTopRight",
                                value: `${improvementLabel} (${(lowestDimensionPercent ?? 0).toFixed(1)}%)`,
                                fill: "red",
                                fontSize: 12,
                                fontWeight: "bold",
                                dy: -10
                            }}
                        />
                    </BarChart>
                </ChartContainer>
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
        </div>
    );
}
