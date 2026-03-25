/**
 * File: components/dashboard/empty-state.tsx
 * Description: Reusable empty state component for dashboard charts and sections.
 */
import React from "react";
import { Button } from "../ui/button";
import { BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useApp } from "../app/AppProvider";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No data yet",
  message = "Conduct your first survey to see insights here.",
  actionLabel = "Go to Surveys",
  actionHref,
  icon = <BarChart3 className="w-12 h-12 text-muted-foreground/40" />
}: EmptyStateProps) {
  const { membership } = useApp();
  
  // Determine default redirection path based on role if not provided
  const defaultPath = membership?.role === 'admin' 
    ? "/admin/view-survey" 
    : "/user/view-survey";
    
  const targetHref = actionHref || defaultPath;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/50 min-h-[300px] w-full animate-in fade-in zoom-in duration-500">
      <div className="mb-4 p-4 bg-background rounded-full shadow-sm ring-1 ring-border/50">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px] mb-6">
        {message}
      </p>
      <Link href={targetHref}>
        <Button variant="default" className="gap-2 group shadow-lg shadow-primary/20">
          {actionLabel}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
}
