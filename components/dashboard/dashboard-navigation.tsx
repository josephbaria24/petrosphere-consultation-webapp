import { Button } from "../ui/button";
import { Activity, BarChart3, PieChart, Target, LucideIcon } from "lucide-react";
import React from "react";

interface NavigationItem {
    id: string;
    label: string;
    icon: LucideIcon;
    ref: React.RefObject<HTMLDivElement>;
}

interface DashboardNavigationProps {
    activeSection: string;
    scrollToSection: (ref: React.RefObject<HTMLDivElement>, id: string) => void;
    navigationItems: NavigationItem[];
}

export function DashboardNavigation({
    activeSection,
    scrollToSection,
    navigationItems,
}: DashboardNavigationProps) {
    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 md:top-1/2 md:-translate-y-1/2 z-50">
            <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-2 shadow-2xl">
                <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2">
                    {navigationItems.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = activeSection === item.id;

                        return (
                            <Button
                                key={item.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => scrollToSection(item.ref, item.id)}
                                className={`
                    w-10 h-10 p-0 rounded-xl transition-all duration-200
                    ${isActive
                                        ? "bg-primary text-primary-foreground shadow-md scale-110"
                                        : "hover:bg-muted hover:scale-105"
                                    }
                  `}
                                title={item.label}
                            >
                                <IconComponent className="w-4 h-4" />
                            </Button>
                        );
                    })}
                </div>

                <div className="hidden md:block absolute left-1/2 top-2 bottom-2 w-0.5 bg-border/30 transform -translate-x-1/2 -z-10 rounded-full" />

                <div
                    className="hidden md:block absolute left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 transition-all duration-300 ease-out"
                    style={{
                        top: `${8 +
                            navigationItems.findIndex((item) => item.id === activeSection) *
                            48
                            }px`,
                    }}
                />
            </div>
        </div>
    );
}
