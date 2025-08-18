"use client";

import GaugeComponent from "react-gauge-component";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface GaugeChartProps {
  score: number; // 0 to 5 scale
}

export default function GaugeChart({ score }: GaugeChartProps) {
  return (
    <Card className="w-full h-full border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Performance Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <GaugeComponent
          value={score}
          minValue={0}
          maxValue={5}  // ✅ changed to 5
          type="radial"
          labels={{
            tickLabels: {
              type: "inner",
              ticks: [
                { value: 0, valueConfig: { formatTextValue: () => "0.0" } },
                { value: 1, valueConfig: { formatTextValue: () => "1.0" } },
                { value: 2, valueConfig: { formatTextValue: () => "2.0" } },
                { value: 3, valueConfig: { formatTextValue: () => "3.0" } },
                { value: 4, valueConfig: { formatTextValue: () => "4.0" } },
                { value: 5, valueConfig: { formatTextValue: () => "5.0" } }, // ✅ added 5
              ],
            },
            valueLabel: {
              formatTextValue: () => score.toFixed(2),
              style: {
                fontSize: "24px",
                fontWeight: "bold",
              },
            },
          }}
          arc={{
            colorArray: ["#EF4444", "#F59E0B", "#22C55E"], // red, yellow, green
            subArcs: [
              { limit: 2 },  // red zone ends at 2
              { limit: 3.5 }, // yellow zone ends at 3.5
              {},            // green zone (3.5–5)
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
