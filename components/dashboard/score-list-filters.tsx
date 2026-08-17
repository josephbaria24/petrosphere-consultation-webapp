"use client";

import { cn } from "../../lib/utils";

export type ScoreSort = "lowest" | "highest" | "az" | "number";
export type ScoreBand = "all" | "critical" | "review" | "on_track";

const SORT_OPTIONS: { id: ScoreSort; label: string }[] = [
  { id: "lowest", label: "Lowest → highest" },
  { id: "highest", label: "Highest → lowest" },
  { id: "az", label: "A → Z" },
  { id: "number", label: "By number" },
];

const BAND_OPTIONS: { id: ScoreBand; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "review", label: "Need review" },
  { id: "on_track", label: "On track" },
];

function bandForPct(pct: number): Exclude<ScoreBand, "all"> {
  if (pct < 70) return "critical";
  if (pct < 75) return "review";
  return "on_track";
}

function extractLeadingNumber(name: string): number {
  const m = String(name).match(/^(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

export function applyScoreListFilters<T>(
  items: T[],
  getPct: (item: T) => number,
  getName: (item: T) => string,
  sort: ScoreSort,
  band: ScoreBand
): T[] {
  let next = items.filter((item) => {
    if (band === "all") return true;
    return bandForPct(getPct(item)) === band;
  });

  next = [...next].sort((a, b) => {
    const nameA = getName(a);
    const nameB = getName(b);
    const pctA = getPct(a);
    const pctB = getPct(b);
    if (sort === "lowest") return pctA - pctB;
    if (sort === "highest") return pctB - pctA;
    if (sort === "number") {
      const nA = extractLeadingNumber(nameA);
      const nB = extractLeadingNumber(nameB);
      if (nA !== nB) return nA - nB;
      return nameA.localeCompare(nameB);
    }
    return nameA.localeCompare(nameB);
  });

  return next;
}

type ScoreListFiltersProps = {
  sort: ScoreSort;
  band: ScoreBand;
  onSortChange: (sort: ScoreSort) => void;
  onBandChange: (band: ScoreBand) => void;
  /** Hide "By number" when names aren't numbered */
  showNumberSort?: boolean;
  className?: string;
  resultCount?: number;
  totalCount?: number;
};

export function ScoreListFilters({
  sort,
  band,
  onSortChange,
  onBandChange,
  showNumberSort = true,
  className,
  resultCount,
  totalCount,
}: ScoreListFiltersProps) {
  const sortOptions = showNumberSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((o) => o.id !== "number");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shrink-0">
          Sort
        </span>
        <div className="inline-flex flex-wrap rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {sortOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSortChange(opt.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                sort === opt.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shrink-0">
          Show
        </span>
        <div className="inline-flex flex-wrap rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {BAND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onBandChange(opt.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                band === opt.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {typeof resultCount === "number" && typeof totalCount === "number" && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {resultCount} of {totalCount}
          </span>
        )}
      </div>
    </div>
  );
}
