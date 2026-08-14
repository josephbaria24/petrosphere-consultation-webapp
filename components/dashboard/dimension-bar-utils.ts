/** Shared color helpers for dimension score bars / badges */

export function barColorForScoreClass(scorePercent: number): string {
  if (scorePercent < 70) return "bg-red-200/80 dark:bg-red-900/50";
  if (scorePercent < 75) return "bg-yellow-200/80 dark:bg-yellow-900/40";
  return "bg-blue-200 dark:bg-blue-900";
}
