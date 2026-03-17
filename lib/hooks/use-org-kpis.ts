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
            // Get current user for filtering
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!userId) {
                setKpis(DEFAULT_KPIS);
                return;
            }

            // 1. Fetch actions for this user/org
            const { data: actions } = await supabase
                .from("actions")
                .select("id, is_completed, target_date, created_at, updated_at")
                .eq("org_id", targetOrgId)
                .eq("created_by", userId);

            const totalActions = actions?.length || 0;
            const overdueActions = actions?.filter(a => !a.is_completed && a.target_date && new Date(a.target_date) < new Date()).length || 0;
            const overduePct = totalActions > 0 ? (overdueActions / totalActions) * 100 : 0;

            const completedActions = actions?.filter(a => a.is_completed) || [];
            let avgClosureTime = null;
            if (completedActions.length > 0) {
                const totalDays = completedActions.reduce((acc, a) => {
                    const start = new Date(a.created_at);
                    const end = new Date(a.updated_at);
                    return acc + (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
                }, 0);
                avgClosureTime = totalDays / completedActions.length;
            }

            // 2. Fetch responses for this user's surveys
            // First find surveys created by this user
            const { data: userSurveys } = await supabase
                .from("surveys")
                .select("id")
                .eq("org_id", targetOrgId)
                .eq("created_by", userId);
            
            const userSurveyIds = userSurveys?.map(s => s.id) || [];
            let totalResponsesThisMonth = 0;
            let currentScore = null;
            let lastScore = null;

            if (userSurveyIds.length > 0) {
                const { data: qIds } = await supabase.from("survey_questions").select("id").in("survey_id", userSurveyIds);
                const validQIds = qIds?.map(q => q.id) || [];

                if (validQIds.length > 0) {
                    const now = new Date();
                    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

                    const { data: responses } = await supabase
                        .from("responses")
                        .select("answer, created_at")
                        .eq("org_id", targetOrgId)
                        .in("question_id", validQIds)
                        .gte("created_at", startOfLastMonth);

                    const thisMonthResponses = responses?.filter(r => r.created_at >= startOfThisMonth) || [];
                    const lastMonthResponses = responses?.filter(r => r.created_at >= startOfLastMonth && r.created_at < startOfThisMonth) || [];

                    totalResponsesThisMonth = thisMonthResponses.length;

                    const calculateAvg = (resps: any[]) => {
                        const scores = resps.map(r => {
                            const val = r.answer.replace(/[^0-9.]/g, '');
                            return val ? parseFloat(val) : null;
                        }).filter(v => v !== null) as number[];
                        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                    };

                    currentScore = calculateAvg(thisMonthResponses);
                    lastScore = calculateAvg(lastMonthResponses);
                }
            }

            let trendPct = 0;
            if (currentScore !== null && lastScore !== null && lastScore > 0) {
                trendPct = ((currentScore - lastScore) / lastScore) * 100;
            }

            setKpis({
                overdueActionsPct: Math.round(overduePct * 100) / 100,
                totalActions,
                overdueActions,
                avgClosureTimeDays: avgClosureTime ? Math.round(avgClosureTime * 100) / 100 : null,
                totalResponsesThisMonth,
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
