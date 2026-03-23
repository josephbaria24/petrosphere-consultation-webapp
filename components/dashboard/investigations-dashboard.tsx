"use client";

import { useState, useEffect } from "react";
import { useApp } from "../app/AppProvider";
import TaskReports from "../tasks/TaskReports";
import { getClientCookie } from "../../lib/cookies-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { GatedFeature } from "../gated-feature";

interface InvestigationsDashboardProps {
  isAdmin?: boolean;
}

export default function InvestigationsDashboard({ isAdmin = false }: InvestigationsDashboardProps) {
  const { org, user, limits } = useApp();
  const isPlatformAdmin = !!getClientCookie("admin_id");

  return (
    <GatedFeature
      isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
      featureName="Investigations Dashboard"
    >
      <div className="flex flex-col min-h-screen bg-transparent p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href={isAdmin ? "/dashboard" : "/dashboard"}>
                <Button variant="ghost" size="sm" className="h-8 gap-1 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
              </Link>
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 leading-tight">
              Investigations Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Comprehensive overview of task compliance, inspections, and safety reports.
            </p>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-border/50 p-1">
          <TaskReports
            orgId={org?.id || ""}
            userId={user?.id}
            isPlatformAdmin={isPlatformAdmin}
          />
        </div>
      </div>
    </GatedFeature>
  );
}
