"use client";

import GaugeComponent from "react-gauge-component";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../../@/components/ui/badge";

const toPercentage = (score: number) => (score / 5) * 100;

const getLevelLabel = (score: number) => {
  if (score >= 4.20)
    return {
      level: 5,
      label: "Level 5 – Excellence (Resilient & Learning Culture)",
      badgeColor: "bg-green-500 text-white",
    };
  if (score >= 3.40)
    return {
      level: 4,
      label: "Level 4 – Integrated (Cooperative Culture)",
      badgeColor: "bg-yellow-400 text-black",
    };
  if (score >= 2.60)
    return {
      level: 3,
      label: "Level 3 – Interdependent (At risk: over-reliance on systems)",
      badgeColor: "bg-red-500 text-white",
    };
  if (score >= 1.80)
    return {
      level: 2,
      label: "Level 2 – Independent (Needs Intervention)",
      badgeColor: "bg-red-700 text-white",
    };
  return {
    level: 1,
    label: "Level 1 – Dependent (Rules-driven; safety not priority)",
    badgeColor: "bg-red-900 text-white",
  };
};

interface GaugeChartProps {
  score: number; // 0 to 5 scale
}

export default function GaugeChart({ score }: GaugeChartProps) {
  const levelInfo = getLevelLabel(score);

  return (
    <Card className="w-full h-full border-0 shadow-none">
      <CardHeader>
        <CardTitle>Performance Score</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center space-y-4">
        {/* Gauge */}
        <GaugeComponent
          value={toPercentage(score)}
          minValue={20}
          maxValue={100}
          type="radial"
          labels={{
            tickLabels: {
              type: "inner",
              ticks: [
                { value: 20, valueConfig: { formatTextValue: () => "1.0" } },
                { value: 40, valueConfig: { formatTextValue: () => "2.0" } },
                { value: 60, valueConfig: { formatTextValue: () => "3.0" } },
                { value: 80, valueConfig: { formatTextValue: () => "4.0" } },
                { value: 100, valueConfig: { formatTextValue: () => "5.0" } },
              ],
            },
            valueLabel: {
              formatTextValue: () => `${toPercentage(score).toFixed(0)}%`,
              style: { fontSize: "24px", fontWeight: "bold" },
            },
          }}
          arc={{
            colorArray: [
              "#7f1d1d", // Level 1 - Deep Red
              "#b91c1c", // Level 2 - Red
              "#f97316", // Level 3 - Orange
              "#facc15", // Level 4 - Yellow
              "#22c55e", // Level 5 - Green
            ],
            subArcs: [
              { limit: 36 }, // End of Level 1
              { limit: 52 }, // End of Level 2
              { limit: 68 }, // End of Level 3
              { limit: 84 }, // End of Level 4
              { limit: 100 }, // End of Level 5
            ],
            padding: 0.01,
            width: 0.3,
          }}
          
          pointer={{
            type: "needle",
            elastic: true,
            animationDelay: 0,
            length: 0.7,
          }}
        />

        {/* Score Label */}
        {/* <p
          className={`text-sm font-semibold ${
            score < 2
              ? "text-red-500"
              : score < 3.5
              ? "text-yellow-500"
              : "text-green-500"
          }`}
        >
          {score < 2
            ? "Your score is below average"
            : score < 3.5
            ? "Your score is average"
            : "Your score is excellent"}
        </p> */}

        {/* Company Score Level */}
        <div className="w-full mt-4 p-4 border border-gray rounded-lg bg-card text-start">
          <div className="text-gray-600 text-sm font-medium mb-1">Your Company Score</div>

          {/* ✅ ShadCN Badge with custom color */}
          <Badge className={`${levelInfo.badgeColor} text-sm px-3 py-1 rounded-full`}>
            {levelInfo.label}
          </Badge>

          <div className="text-2xl font-extrabold mt-2">
            {toPercentage(score).toFixed(0)}%
            <span className="text-sm text-gray-500 font-normal ml-2">
              ({score.toFixed(2)} / 5.0)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
