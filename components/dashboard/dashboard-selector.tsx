"use client";

import Image from "next/image";
import { cn } from "../../lib/utils";

export type DashboardViewId = "safety-vitals" | "investigations";

const DASHBOARD_OPTIONS: {
  id: DashboardViewId;
  title: string;
  subtitle: string;
  imageSrc: string;
}[] = [
  {
    id: "safety-vitals",
    title: "Safety Vitals",
    subtitle: "Survey Analytics & Culture Insights",
    imageSrc: "/dashboard-safety-vitals.png",
  },
  {
    id: "investigations",
    title: "Investigations",
    subtitle: "Field Inspections & Compliance Overview",
    imageSrc: "/dashboard-investigations-bg.png",
  },
];

interface DashboardSelectorProps {
  activeId: DashboardViewId;
  onSelect: (id: DashboardViewId) => void;
}

export function DashboardSelector({ activeId, onSelect }: DashboardSelectorProps) {
  return (
    <div className="mb-6 md:mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
        Dashboards
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DASHBOARD_OPTIONS.map((card) => {
          const isActive = activeId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              className={cn(
                "group relative overflow-hidden rounded-3xl border-2 text-left transition-all duration-300 ease-out w-full",
                "hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-0.5",
                isActive
                  ? "border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/20"
                  : "border-border/60 hover:border-primary/30"
              )}
            >
              <div className="relative aspect-[16/10] sm:aspect-[2/1] w-full bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src={card.imageSrc}
                  alt={card.title}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={card.id === "safety-vitals"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <p className="text-lg sm:text-xl font-bold text-white drop-shadow-sm">
                    {card.title}
                  </p>
                  <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5">
                    {card.subtitle}
                  </p>
                </div>
                {isActive && (
                  <div className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md">
                    Active
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
