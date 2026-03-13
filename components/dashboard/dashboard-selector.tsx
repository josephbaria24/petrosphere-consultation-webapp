"use client";

import { useRouter } from "next/navigation";
import { Activity, ClipboardCheck, Target, BarChart3, AlertTriangle } from "lucide-react";
import { getClientCookie } from "../../lib/cookies-client";

interface DashboardCard {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  href?: string;
  scrollTo?: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    id: "safety-vitals",
    title: "Safety Vitals",
    icon: Activity,
    gradient: "from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    href: "/dashboard",
  },
  {
    id: "inspections",
    title: "Inspections",
    icon: ClipboardCheck,
    gradient: "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    href: "__TASKS__",
  },
  {
    id: "actions",
    title: "Actions",
    icon: Target,
    gradient: "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
    scrollTo: "summary",
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    gradient: "from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/20 dark:to-fuchsia-500/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    scrollTo: "charts",
  },
  {
    id: "flagged",
    title: "Flagged Items",
    icon: AlertTriangle,
    gradient: "from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20",
    iconBg: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
    scrollTo: "summary",
  },
];

interface DashboardSelectorProps {
  onScrollTo?: (sectionId: string) => void;
}

export function DashboardSelector({ onScrollTo }: DashboardSelectorProps) {
  const router = useRouter();
  const isAdmin = !!getClientCookie("admin_id");
  const basePath = isAdmin ? "/admin" : "/user";

  const handleClick = (card: DashboardCard) => {
    if (card.href) {
      const href = card.href === "__TASKS__" ? `${basePath}/tasks` : card.href;
      router.push(href);
    } else if (card.scrollTo && onScrollTo) {
      onScrollTo(card.scrollTo);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        Dashboards
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => handleClick(card)}
              className={`
                group flex-shrink-0 flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl
                bg-gradient-to-br ${card.gradient}
                border border-border/50 hover:border-border
                hover:shadow-lg hover:scale-[1.03]
                transition-all duration-200 ease-out
                cursor-pointer min-w-[110px] md:min-w-[140px] w-[110px] md:w-[140px]
              `}
            >
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center ${card.iconBg} transition-transform group-hover:scale-110`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight">
                {card.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
