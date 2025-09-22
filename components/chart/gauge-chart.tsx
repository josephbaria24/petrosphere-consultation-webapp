"use client";

import GaugeComponent from "react-gauge-component";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface GaugeChartProps {
  score: number; // 0 to 5 scale
}




export default function GaugeChart({ score }: GaugeChartProps) {


  const toPercentage = (score: number) => (score / 5) * 100;

  return (
    <Card className="w-full h-full border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Performance Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">

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
    colorArray: ["#EF4444", "#F59E0B", "#22C55E"],
    subArcs: [
      { limit: toPercentage(2) },   // 40%
      { limit: toPercentage(3.5) }, // 70%
      { limit: toPercentage(5) },   // 100%
    ],
    padding: 0.02,
    width: 0.3,
  }}
  pointer={{
    type: "needle",
    elastic: true,
    animationDelay: 0,
    length: 0.7,
  }}
/>

        <p
          className={`mt-2 text-sm font-semibold ${
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
        </p>
      </CardContent>
    </Card>
  );
}
