import {
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Circle,
  Plus,
  ArrowRight,
  SendHorizontal,
} from "lucide-react"
import { cn } from "../lib/utils"

type Trend = {
  id: string
  title: string         // e.g. "Safety Culture"
  delta: string         // e.g. "+0.4" or "-0.2"
  type: "positive" | "negative"
  category: string      // e.g. "HSSE"
  timestamp: string     // e.g. "Q3 2025"
  status: "improved" | "declined" | "unchanged"
}

interface List02Props {
  trends?: Trend[]
  className?: string
}

const SAMPLE_TRENDS: Trend[] = [
  {
    id: "1",
    title: "Leadership",
    delta: "+0.3",
    type: "positive",
    category: "Management",
    timestamp: "Q3 2025",
    status: "improved",
  },
  {
    id: "2",
    title: "Safety Culture",
    delta: "-0.2",
    type: "negative",
    category: "HSSE",
    timestamp: "Q3 2025",
    status: "declined",
  },
  {
    id: "3",
    title: "Engagement",
    delta: "0.0",
    type: "positive",
    category: "HR",
    timestamp: "Q3 2025",
    status: "unchanged",
  },
]

export default function List02({ trends = SAMPLE_TRENDS, className }: List02Props) {
  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto",
        "bg-white dark:bg-zinc-900/70",
        "border border-zinc-100 dark:border-zinc-800",
        "rounded-xl shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Trends & Comparisons
            <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
              ({trends.length} updates)
            </span>
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Latest: Q3 2025</span>
        </div>

        <div className="space-y-1">
          {trends.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-center gap-3",
                "p-2 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg",
                  "bg-zinc-100 dark:bg-zinc-800",
                  "border border-zinc-200 dark:border-zinc-700",
                )}
              >
                {item.status === "improved" && (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {item.status === "declined" && (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                {item.status === "unchanged" && (
                  <Circle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>

              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{item.timestamp}</p>
                </div>

                <div className="flex items-center gap-1.5 pl-3">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      item.type === "positive"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {item.delta}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📌 Footer Button Actions */}
      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["Add", Plus],
              ["Send", SendHorizontal],
              ["Top-up", ArrowDownLeft],
              ["More", ArrowRight],
            ] as [string, React.ElementType][]
          ).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              className={cn(
                "flex items-center justify-center gap-2",
                "py-2 px-3 rounded-lg",
                "text-xs font-medium",
                "bg-zinc-900 dark:bg-zinc-50",
                "text-zinc-50 dark:text-zinc-900",
                "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                "shadow-sm hover:shadow transition-all duration-200",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
