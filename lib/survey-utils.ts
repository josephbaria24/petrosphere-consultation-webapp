/**
 * File: lib/survey-utils.ts
 * Description: Shared utility functions for survey calculations and formatting.
 */

export const getLevelLabel = (score: number) => {
  if (score >= 4.2)
    return {
      level: 5,
      label: "Level 5 – Excellence (Resilient & Learning Culture)",
      badgeColor: "bg-green-500 text-white",
      colorCode: "#22c55e"
    };
  if (score >= 3.4)
    return {
      level: 4,
      label: "Level 4 – Integrated (Cooperative Culture)",
      badgeColor: "bg-yellow-400 text-black",
      colorCode: "#fbbf24"
    };
  if (score >= 2.6)
    return {
      level: 3,
      label: "Level 3 – Interdependent (At risk: over-reliance on systems)",
      badgeColor: "bg-red-500 text-white",
      colorCode: "#f97316"
    };
  if (score >= 1.8)
    return {
      level: 2,
      label: "Level 2 – Independent (Needs Intervention)",
      badgeColor: "bg-red-700 text-white",
      colorCode: "#dc2626"
    };
  return {
    level: 1,
    label: "Level 1 – Dependent (Rules-driven; safety not priority)",
    badgeColor: "bg-red-900 text-white",
    colorCode: "#991b1b"
  };
};

export const toPercentage = (score: number) => (score / 5) * 100;
