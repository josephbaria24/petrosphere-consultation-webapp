"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export interface OrgKPIs {
    overdueActionsPct: number;
    totalActions: number;
    overdueActions: number;
    avgClosureTimeDays: number | null;
    totalResponsesThisMonth: number;
    safetyScoreThisMonth: number | null;
    safetyScoreLastMonth: number | null;
    trendPct: number;
}

const DEFAULT_KPIS: OrgKPIs = {
    overdueActionsPct: 0,
    totalActions: 0,
    overdueActions: 0,
    avgClosureTimeDays: null,
    totalResponsesThisMonth: 0,
    safetyScoreThisMonth: null,
    safetyScoreLastMonth: null,
    trendPct: 0,
};

export function useOrgKPIs(orgId?: string) {
    const [kpis, setKpis] = useState<OrgKPIs>(DEFAULT_KPIS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchKPIs = useCallback(async (targetOrgId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch overdue actions
            const { data: overdueData } = await supabase
                .from("v_org_action_overdue")
                .select("*")
                .eq("org_id", targetOrgId)
                .single();

            // 2. Fetch average closure time
            const { data: closureData } = await supabase
                .from("v_org_action_closure_time")
                .select("*")
                .eq("org_id", targetOrgId)
                .single();

            // 3. Fetch monthly scores (last 2 months for trend)
            const { data: monthlyData } = await supabase
                .from("v_org_safety_score_monthly")
                .select("*")
                .eq("org_id", targetOrgId)
                .order("month", { ascending: false })
                .limit(2);

            const currentMonth = monthlyData?.[0] || null;
            const lastMonth = monthlyData?.[1] || null;

            const currentScore = currentMonth?.safety_score ? parseFloat(currentMonth.safety_score) : null;
            const lastScore = lastMonth?.safety_score ? parseFloat(lastMonth.safety_score) : null;

            let trendPct = 0;
            if (currentScore !== null && lastScore !== null && lastScore > 0) {
                trendPct = ((currentScore - lastScore) / lastScore) * 100;
            }

            setKpis({
                overdueActionsPct: overdueData?.overdue_pct ? parseFloat(overdueData.overdue_pct) : 0,
                totalActions: overdueData?.total_actions || 0,
                overdueActions: overdueData?.overdue_actions || 0,
                avgClosureTimeDays: closureData?.avg_days_to_close ? parseFloat(closureData.avg_days_to_close) : null,
                totalResponsesThisMonth: currentMonth?.total_responses || 0,
                safetyScoreThisMonth: currentScore,
                safetyScoreLastMonth: lastScore,
                trendPct: Math.round(trendPct * 100) / 100,
            });
        } catch (err: any) {
            console.error("Error fetching org KPIs:", err);
            setError(err?.message || "Failed to fetch KPIs");
            setKpis(DEFAULT_KPIS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!orgId) {
            setIsLoading(false);
            return;
        }
        fetchKPIs(orgId);
    }, [orgId, fetchKPIs]);

    return { kpis, isLoading, error, refetch: () => orgId && fetchKPIs(orgId) };
}
