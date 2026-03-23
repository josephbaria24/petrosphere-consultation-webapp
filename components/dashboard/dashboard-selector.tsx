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
    gradient: "from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20",
    iconBg: "bg-blue-600 dark:bg-blue-500 text-white",
    href: "/dashboard",
  },
  {
    id: "investigations",
    title: "Investigations",
    icon: ClipboardCheck,
    gradient: "from-emerald-600/10 to-teal-600/10 dark:from-emerald-600/20 dark:to-teal-600/20",
    iconBg: "bg-emerald-600 dark:bg-emerald-500 text-white",
    href: "__TASKS_REPORTS__",
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
      let href = card.href;
      if (href === "__TASKS__") {
        href = `${basePath}/tasks`;
      } else if (href === "__TASKS_REPORTS__") {
        href = `${basePath}/investigations`;
      }
      router.push(href);
    } else if (card.scrollTo && onScrollTo) {
      onScrollTo(card.scrollTo);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
        Dashboards
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          const isVitals = card.id === "safety-vitals";
          return (
            <button
              key={card.id}
              onClick={() => handleClick(card)}
              className={`
                group relative overflow-hidden flex flex-col items-center justify-center gap-4 p-8 rounded-3xl
                bg-gradient-to-br ${card.gradient}
                border border-border/50 hover:border-primary/20
                hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1
                transition-all duration-300 ease-out
                cursor-pointer w-full text-center
              `}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${card.iconBg} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <Icon className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-bold text-foreground transition-colors">
                  {card.title}
                </span>
                <span className="text-sm text-muted-foreground font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                  {isVitals ? "Survey Analytics & Culture Insights" : "Task Compliance & Incident Reports"}
                </span>
              </div>
              
              {/* Subtle background pattern/glow */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
