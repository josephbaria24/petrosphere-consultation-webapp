// components/charts/CustomTooltip.tsx
import React from "react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export default function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-black text-white p-3 rounded shadow-md">
        <p className="font-bold mb-1">{label}</p>
        <ul className="space-y-1 text-sm">
          {payload.map((entry, index) => (
            <li key={index} className="flex justify-between">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></span>
                {entry.name}
              </span>
              <span>{Number(entry.value).toFixed(1)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-right text-xs text-gray-300">
          Total {total.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
}
