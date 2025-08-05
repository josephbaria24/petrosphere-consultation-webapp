import {
  ArrowDownLeft,
  SendHorizontal,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Star,
  Award,
} from "lucide-react"
import { cn } from "../lib/utils"

type MaturityDomain = {
  id: string
  title: string
  description?: string
  score: string // e.g. "4.2 / 5"
  type: "low" | "moderate" | "high" | "excellent"
}

interface List01Props {
  totalScore?: string
  maturityData?: MaturityDomain[]
  className?: string
}

// Icon & color per maturity type
const typeIcons = {
  low: <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
  moderate: <TrendingUp className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />,
  high: <Star className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  excellent: <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
}

const bgColor = {
  low: "bg-red-100 dark:bg-red-900/30",
  moderate: "bg-yellow-100 dark:bg-yellow-900/30",
  high: "bg-blue-100 dark:bg-blue-900/30",
  excellent: "bg-emerald-100 dark:bg-emerald-900/30",
}

const MATURITY_SCORES: MaturityDomain[] = [
  {
    id: "1",
    title: "Leadership",
    description: "Engagement from top-level management",
    score: "4.2 / 5",
    type: "high",
  },
  {
    id: "2",
    title: "Communication",
    description: "Internal & external communication flow",
    score: "3.6 / 5",
    type: "moderate",
  },
  {
    id: "3",
    title: "Risk Management",
    description: "Identification and mitigation strategies",
    score: "4.8 / 5",
    type: "excellent",
  },
]

export default function List01({
  totalScore = "4.2",
  maturityData = MATURITY_SCORES,
  className,
}: List01Props) {
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
      {/* Total Score */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Average Maturity Score</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalScore}</h1>
      </div>

      {/* Maturity Scores List */}
      <div className="p-3">
        <h2 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Dimensions
        </h2>
        <div className="space-y-1">
          {maturityData.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", bgColor[item.type])}>
                  {typeIcons[item.type]}
                </div>
                <div>
                  <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {item.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Buttons (optional) */}
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
