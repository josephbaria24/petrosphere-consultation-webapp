/**
 * File: components/dashboard.tsx
 * Description: Main Dashboard component for the Petrosphere Consultation Platform. 
 * Provides interactive analytics, survey selection, and action plan management.
 */
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useApp } from "./app/AppProvider";
import { useTheme } from "next-themes";
import { Activity, BarChart3, PieChart, Target, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import ProfessionalSurveySummaryCard from "./summary-card";
import { DashboardNavigation } from "./dashboard/dashboard-navigation";
import { SurveySelector } from "./dashboard/survey-selector";
import { ResponseSummary } from "./dashboard/response-summary";
import { ActionDialog, ActionFormState } from "./dashboard/action-dialog";
import { OverviewCharts, DetailedCharts } from "./dashboard/charts-grid";
import { Action } from "./dashboard/types";
import { ActionPlan } from "./dashboard/action-plan";
import { ActionDetailDialog } from "./dashboard/action-detail-dialog";
import { OrganizationSelector } from "./dashboard/organization-selector";
import SafetyAIChat from "./dashboard/ai-chat";
import { UpgradeRequiredModal } from "./upgrade-required-modal";

export default function Dashboard() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [, setQuestions] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [totalAvg, setTotalAvg] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [respondentCount, setRespondentCount] = useState<number>(0);
  const [barData, setBarData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [comparisonRadarData, setComparisonRadarData] = useState<any[]>([]);
  const [openChart, setOpenChart] = useState<"bar" | "radar" | "gauge" | "role" | "comparison" | null>(null);
  const [roleData, setRoleData] = useState<any[]>([]);
  const [minAcceptableScore, setMinAcceptableScore] = useState<number>(2.0);
  const [belowMinimumDimensions, setBelowMinimumDimensions] = useState<string[]>([]);
  const [atRiskDimensions, setAtRiskDimensions] = useState<string[]>([]);
  const [strongDimensions, setStrongDimensions] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [selectedActionForDetail, setSelectedActionForDetail] = useState<Action | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(true);
  const [organizations, setOrganizations] = useState<{ id: string, name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all");

  const { user, membership, subscription, org } = useApp();
  const { theme } = useTheme();
  const [isAdminCookie, setIsAdminCookie] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    const adminId = document.cookie.split('; ').find(row => row.startsWith('admin_id='))?.split('=')[1];
    setIsAdminCookie(!!adminId);
    setAdminChecked(true);
  }, []);

  const isPlatformAdmin = isAdminCookie;
  const isRestrictedToAuthored = !isPlatformAdmin && (subscription?.plan === "demo" || membership?.role !== "admin");
  const isRestricted = isRestrictedToAuthored;

  const [actions, setActions] = useState<Action[]>([]);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<"critical" | "at_risk">("critical");
  const [actionForm, setActionForm] = useState<ActionFormState>({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    target_date: "",
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isDemo = subscription?.plan === "demo";

  const selectorRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const [lowestDimensionPercent, setLowestDimensionPercent] = useState<number | null>(null);

  const dashboardCache = useRef<Record<string, {
    stats: any,
    questions: any[],
    templateCache: any[],
    comparisonData: any[],
    actions: Action[]
  }>>({});

  const toPercentage = (score: number) => (score / 5) * 100;

  const itemsWithRefs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: Activity, ref: selectorRef },
    { id: 'charts', label: 'Charts', icon: BarChart3, ref: chartsRef },
    { id: 'summary', label: 'Summary', icon: PieChart, ref: summaryRef },
  ], []);

  const fetchActions = useCallback(async (surveyId: string, skipCache = false) => {
    if (!surveyId) return;
    try {
      if (!skipCache && dashboardCache.current[surveyId]?.actions) {
        setActions(dashboardCache.current[surveyId].actions);
        return;
      }
      let query = supabase.from("actions").select("*").eq("survey_id", surveyId);
      if (!isPlatformAdmin && org?.id) {
        query = query.eq("org_id", org.id);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      const fetchedActions = (data as Action[]) || [];
      if (!dashboardCache.current[surveyId]) {
        dashboardCache.current[surveyId] = { stats: null, questions: [], templateCache: [], comparisonData: [], actions: [] };
      }
      dashboardCache.current[surveyId].actions = fetchedActions;
      setActions(fetchedActions);
    } catch (error) { console.error("Error fetching actions:", error); }
  }, [isPlatformAdmin, org?.id]);

  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fetchAIInsights = useCallback(async (surveyId: string, statsData: any) => {
    if (!surveyId) return;
    try {
      const { data: existing } = await supabase.from('survey_ai_insights').select('insights').eq('survey_id', surveyId).single();
      if (existing) { setAiInsights(existing.insights); return; }
      setIsGeneratingAI(true);
      const prompt = `
        As a Safety Culture Expert, analyze these survey results and provide actionable recommendations.
        
        DATA:
        - Average Score: ${statsData.avgScore.toFixed(2)}/5.0
        - Respondent Count: ${statsData.respondentCount}
        - Top Dimensions: ${statsData.strongDimensions.join(', ')}
        - Critical Areas: ${statsData.belowMinimumDimensions.join(', ')}
        - At Risk Areas: ${statsData.atRiskDimensions.join(', ')}

        INSTRUCTIONS:
        Return a JSON object with exactly two keys:
        1. "quick_insight": A one-sentence executive summary (max 15 words).
        2. "recommendations": An array of 2 objects, each with "title" and "description" keys. Description should be max 25 words.

        JSON FORMAT ONLY. No conversational text.
      `;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: 'You are a Safety Culture AI assistant that outputs JSON.' }, { role: 'user', content: prompt }]
        })
      });
      if (!response.ok) throw new Error(`AI API failed: ${response.status}`);
      const aiResult = await response.json();
      let rawText = aiResult?.result?.response || "";
      let jsonText = rawText;
      if (jsonText.includes('```json')) jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      const cleanInsights = JSON.parse(jsonText);
      setAiInsights(cleanInsights);
      await supabase.from('survey_ai_insights').upsert({ survey_id: surveyId, insights: cleanInsights, updated_at: new Date().toISOString() });
    } catch (err) { console.error("AI Insight Error:", err); } finally { setIsGeneratingAI(false); }
  }, []);

  const fetchSurveyStats = useCallback(async (surveyId: string, company: string, targetOrgId: string = "all", prefetchedQuestions: any[] | null = null, prefetchedTemplates: any[] | null = null) => {
    const cacheKey = `${surveyId}_${targetOrgId}`;
    if (dashboardCache.current[cacheKey]?.stats && !prefetchedQuestions) {
      const cached = dashboardCache.current[cacheKey].stats;
      setMinAcceptableScore(cached.minAcceptableScore);
      setRespondentCount(cached.respondentCount);
      setBelowMinimumDimensions(cached.belowMin);
      setAtRiskDimensions(cached.atRisk);
      setStrongDimensions(cached.strong);
      setBarData(cached.barData);
      setRadarData(cached.radarData);
      setRoleData(cached.roleData);
      setAvgScore(cached.avgScore);
      setTotalAvg(cached.totalAvg);
      setTrend(cached.trend);
      setLowestDimensionPercent(cached.lowestDimensionPercent);
      fetchAIInsights(surveyId, { avgScore: cached.avgScore, respondentCount: cached.respondentCount, strongDimensions: cached.strong, belowMinimumDimensions: cached.belowMin, atRiskDimensions: cached.atRisk });
      return cached;
    }
    setAiInsights(null);
    let questions = prefetchedQuestions || (await supabase.from("survey_questions").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true })).data || [];
    let templateCache = prefetchedTemplates || (await supabase.from("option_templates").select("id, options, scores")).data || [];
    if (!questions.length) return;

    const calculatedMinScore = 2.6;
    setMinAcceptableScore(calculatedMinScore);
    const questionIds = questions.map(q => q.id);
    let responses: any[] = [];
    if (isPlatformAdmin) {
      const resp = await fetch("/api/admin/all-responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionIds, orgId: targetOrgId === "all" ? undefined : targetOrgId }) });
      if (resp.ok) responses = await resp.json();
    } else {
      let query = supabase.from("responses").select("user_id, question_id, answer").in("question_id", questionIds);
      if (org?.id) query = query.eq("org_id", org.id);
      responses = (await query).data || [];
    }

    const templateMap: Record<string, any> = {};
    templateCache.forEach(t => { templateMap[t.id] = { options: t.options, scores: t.scores }; });
    const uniqueRespondents = new Set(responses.map(r => r.user_id));
    setRespondentCount(uniqueRespondents.size);

    const dimensionScores: Record<string, number[]> = {};
    let normalizedScores: number[] = [];
    responses.forEach(r => {
      const q = questions.find(qu => qu.id === r.question_id);
      if (!q) return;
      const template = q.template_id ? templateMap[q.template_id] : null;
      let score = template ? template.scores[template.options.findIndex((opt: string) => opt.trim().toLowerCase() === r.answer.trim().toLowerCase())] : parseFloat(r.answer);
      if (isNaN(score)) return;
      if (q.scoring_type === "likert" && q.reverse_score) score = (q.max_score ?? 5) + 1 - score;
      if (!dimensionScores[q.dimension]) dimensionScores[q.dimension] = [];
      dimensionScores[q.dimension].push(score);
      normalizedScores.push((score - (q.min_score || 1)) / ((q.max_score || 5) - (q.min_score || 1)));
    });

    const belowMin: string[] = [], atRisk: string[] = [], strong: string[] = [];
    Object.entries(dimensionScores).forEach(([dim, scores]) => {
      const avg = Math.min(scores.reduce((a, b) => a + b, 0) / scores.length, 5);
      if (avg <= calculatedMinScore) belowMin.push(dim);
      else if (avg <= calculatedMinScore + 0.5) atRisk.push(dim);
      else strong.push(dim);
    });
    setBelowMinimumDimensions(belowMin); setAtRiskDimensions(atRisk); setStrongDimensions(strong);

    const bar = Object.entries(dimensionScores).map(([dim, scores]) => {
      const avg = Math.min(scores.reduce((a, b) => a + b, 0) / scores.length, 5);
      return { name: dim, score: avg, scorePercent: (avg / 5) * 100 };
    });
    const lowest = bar.reduce((min, curr) => Math.min(min, curr.scorePercent), 100);
    setLowestDimensionPercent(lowest);
    const finalBar = bar.map(b => ({ ...b, fill: b.scorePercent <= lowest ? "#EF4444" : "#4A90E2" }));
    const extractNumberLocal = (dim: string) => { const m = dim.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
    const sortedBar = finalBar.sort((a, b) => extractNumberLocal(a.name) - extractNumberLocal(b.name));
    setBarData(sortedBar); setRadarData(sortedBar.map(b => ({ subject: b.name, you: b.score })));

    const currentAvg = Math.min(normalizedScores.length ? (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length) * 4 + 1 : 0, 5);
    setAvgScore(currentAvg); setTotalAvg(currentAvg);

    const finalStats = { minAcceptableScore: calculatedMinScore, respondentCount: uniqueRespondents.size, reliability: normalizedScores.length ? Math.round((normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length) * 100) : 0, belowMin, atRisk, strong, barData: sortedBar, radarData: sortedBar.map(b => ({ subject: b.name, you: b.score })), avgScore: currentAvg, totalAvg: currentAvg, trend: 0, lowestDimensionPercent: lowest, roleData: [] };
    if (!dashboardCache.current[cacheKey]) dashboardCache.current[cacheKey] = { stats: null, questions: [], templateCache: [], comparisonData: [], actions: [] };
    dashboardCache.current[cacheKey].stats = finalStats;
    fetchAIInsights(surveyId, { avgScore: currentAvg, respondentCount: uniqueRespondents.size, strongDimensions: strong, belowMinimumDimensions: belowMin, atRiskDimensions: atRisk });
    return finalStats;
  }, [fetchAIInsights, isPlatformAdmin, org?.id]);

  const fetchComparisonData = useCallback(async (currentSurveyId: string, skipCache = false, currentRadarFromArgs: any[] | null = null) => {
    try {
      if (!skipCache && dashboardCache.current[currentSurveyId]?.comparisonData && !currentRadarFromArgs) {
        setComparisonRadarData(dashboardCache.current[currentSurveyId].comparisonData);
        return dashboardCache.current[currentSurveyId].comparisonData;
      }
      const { data: otherSurveys } = await supabase.from("surveys").select("id").neq("id", currentSurveyId);
      if (!otherSurveys?.length) { setComparisonRadarData([]); return; }
      const allQs = (await supabase.from("survey_questions").select("*").in("survey_id", otherSurveys.map(s => s.id))).data || [];
      const allRes = (await supabase.from("responses").select("*").in("question_id", allQs.map(q => q.id))).data || [];
      const templates = (await supabase.from("option_templates").select("*")).data || [];
      const templateMap: Record<string, any> = {};
      templates.forEach(t => { templateMap[t.id] = { options: t.options, scores: t.scores }; });
      const dimensionScores: Record<string, number[]> = {};
      allRes.forEach(r => {
        const q = allQs.find(qu => qu.id === r.question_id);
        if (!q) return;
        const template = q.template_id ? templateMap[q.template_id] : null;
        let score = template ? template.scores[template.options.findIndex((o: string) => o.trim().toLowerCase() === r.answer.trim().toLowerCase())] : parseFloat(r.answer);
        if (isNaN(score)) return;
        if (q.scoring_type === "likert" && q.reverse_score) score = (q.max_score ?? 5) + 1 - score;
        if (!dimensionScores[q.dimension]) dimensionScores[q.dimension] = [];
        dimensionScores[q.dimension].push(score);
      });
      const merged = Object.entries(dimensionScores).map(([dim, scores]) => {
        const avg = Math.min(scores.reduce((a, b) => a + b, 0) / scores.length, 5);
        const radarToUse = currentRadarFromArgs || radarData;
        const currentItem = radarToUse.find((r: any) => r.subject === dim);
        return { subject: dim, current: currentItem ? toPercentage(currentItem.you) : 0, average: toPercentage(avg) };
      });
      const extractNumberLocal = (dim: string) => { const m = dim.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
      const sorted = merged.sort((a, b) => extractNumberLocal(a.subject) - extractNumberLocal(b.subject));
      setComparisonRadarData(sorted);
      if (!dashboardCache.current[currentSurveyId]) dashboardCache.current[currentSurveyId] = { stats: null, questions: [], templateCache: [], comparisonData: [], actions: [] };
      dashboardCache.current[currentSurveyId].comparisonData = sorted;
      return sorted;
    } catch (err) { console.error("Comparison Error:", err); setComparisonRadarData([]); return []; }
  }, []); // Removed radarData from dependency to prevent loop

  const handleUpdateOrgName = async (newName: string) => {
    if (!org?.id) return;
    try {
      const { error } = await supabase.from('organizations').update({ name: newName }).eq('id', org.id);
      if (error) throw error;
      setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, name: newName } : o));
      toast.success("Organization name updated successfully");
    } catch (err) { toast.error("Failed to update organization name"); }
  };

  const handleUpdateAction = async (actionId: string, updates: Partial<Action>) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, ...updates } : a));
    try {
      const { error } = await supabase.from("actions").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", actionId);
      if (error) throw error;
    } catch (err) { toast.error("Failed to update action"); }
  };

  const deleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase.from("actions").delete().eq("id", actionId);
      if (error) throw error;
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) { toast.error("Failed to delete action"); }
  };

  const createAction = async () => {
    if (!selectedSurvey || !actionForm.title.trim() || !selectedDimension) return;
    try {
      const { data, error } = await supabase.from("actions").insert({ survey_id: selectedSurvey.id, dimension: selectedDimension, status: selectedStatus, title: actionForm.title, description: actionForm.description, priority: actionForm.priority, assigned_to: actionForm.assigned_to, target_date: actionForm.target_date || null, is_completed: false, org_id: org?.id, created_by: isPlatformAdmin ? null : user?.id }).select().single();
      if (error) throw error;
      setActions(prev => [data as Action, ...prev]);
      setIsActionDialogOpen(false);
      setActionForm({ title: "", description: "", priority: "medium", assigned_to: "", target_date: "" });
    } catch (err) { toast.error("Failed to create action"); }
  };

  const handleCreateActionForDimension = (dimension: string, status: "critical" | "at_risk") => {
    setSelectedDimension(dimension);
    setSelectedStatus(status);
    setIsActionDialogOpen(true);
  };

  const toggleActionCompletion = (actionId: string, isCompleted: boolean) => handleUpdateAction(actionId, { is_completed: isCompleted });

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>, sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const yOffset = -80;
        const y = sectionRef.current!.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 100);
    }
  };

  useEffect(() => {
    if (!selectedSurvey?.id) return;
    const surveyId = selectedSurvey.id, cacheKey = `${surveyId}_${selectedOrgId}`, cached = dashboardCache.current[cacheKey];
    if (cached?.stats) {
      setQuestions(cached.questions); setActions(cached.actions); setComparisonRadarData(cached.comparisonData);
      setIsLoadingStats(false); setIsLoadingComparison(false);
      fetchSurveyStats(surveyId, selectedSurvey.target_company, selectedOrgId, cached.questions, cached.templateCache);
      return;
    }
    const fetchAllData = async () => {
      const questions = (await supabase.from("survey_questions").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true })).data || [];
      const templates = (await supabase.from("option_templates").select("id, options, scores")).data || [];
      if (!questions.length) { setIsLoadingStats(false); setIsLoadingComparison(false); return; }
      setQuestions(questions);
      await fetchActions(surveyId, true);
      const stats = await fetchSurveyStats(surveyId, selectedSurvey.target_company, selectedOrgId, questions, templates);
      const compData = await fetchComparisonData(surveyId, false, stats?.radarData || []);
      if (!dashboardCache.current[cacheKey]) dashboardCache.current[cacheKey] = { stats: null, questions: [], templateCache: [], comparisonData: [], actions: [] };
      dashboardCache.current[cacheKey] = { stats: stats || {}, questions, templateCache: templates, comparisonData: compData || [], actions: dashboardCache.current[surveyId]?.actions || [] };
      setIsLoadingStats(false); setIsLoadingComparison(false);
    };
    setIsLoadingStats(true); setIsLoadingComparison(true); fetchAllData();
  }, [selectedSurvey, selectedOrgId, fetchActions, fetchComparisonData, fetchSurveyStats]);

  useEffect(() => {
    if (!adminChecked) return;
    const fetchSurveys = async () => {
      let query = supabase.from('surveys').select('id, title, created_at, target_company, org_id, organizations(name)').order('created_at', { ascending: false });
      const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';
      if (org?.id) {
        if (isRestrictedToAuthored) query = query.or(`and(org_id.eq.${org.id},created_by.eq.${user?.id || ''}),id.eq.${DEFAULT_SURVEY_ID}`);
        else query = query.or(`org_id.eq.${org.id},id.eq.${DEFAULT_SURVEY_ID}`);
      }
      const { data } = await query;
      if (data) {
        const normalized = data.map((s: any) => ({ ...s, organizations: Array.isArray(s.organizations) ? s.organizations[0] : s.organizations }));
        const final = normalized.sort((a, b) => { if (a.id === DEFAULT_SURVEY_ID) return -1; if (b.id === DEFAULT_SURVEY_ID) return 1; return 0; });
        setSurveys(final); if (final.length) setSelectedSurvey(final[0]);
      }
    };
    fetchSurveys();
  }, [isPlatformAdmin, adminChecked, org?.id, isRestrictedToAuthored, user?.id]);

  useEffect(() => {
    if (!isPlatformAdmin || !adminChecked) return;
    const fetchAllOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id, name').order('name');
      if (data) setOrganizations(data);
    };
    fetchAllOrgs();
  }, [isPlatformAdmin, adminChecked]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  if (!selectedSurvey) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <DashboardNavigation navigationItems={itemsWithRefs} activeSection={activeSection} scrollToSection={scrollToSection} />
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Executive Insights</h2>
            <p className="text-muted-foreground mt-1">Strategic overview of safety culture performance and organizational health.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isPlatformAdmin && <OrganizationSelector organizations={organizations} selectedOrgId={selectedOrgId} onOrgChange={handleOrgChange} />}
            <SurveySelector surveys={surveys} selectedSurvey={selectedSurvey} setSelectedSurvey={setSelectedSurvey} containerRef={selectorRef} />
          </div>
        </div>

        <div className="grid grid-cols-1" ref={selectorRef}>
          <ProfessionalSurveySummaryCard
            selectedSurvey={selectedSurvey}
            respondentCount={respondentCount}
            avgScore={avgScore}
            trend={trend}
            orgName={org?.name}
            onUpdateOrgName={handleUpdateOrgName}
            isPlatformAdmin={isPlatformAdmin}
            aiInsights={aiInsights}
            isGeneratingAI={isGeneratingAI}
            isDemo={isDemo}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        </div>

        <OverviewCharts
          avgScore={avgScore}
          openChart={openChart}
          setOpenChart={setOpenChart}
          comparisonRadarData={comparisonRadarData}
          theme={theme}
          containerRef={chartsRef}
          isLoadingStats={isLoadingStats}
          isLoadingComparison={isLoadingComparison}
          aiInsights={aiInsights}
          isGeneratingAI={isGeneratingAI}
          isDemo={isDemo}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        <div ref={chartsRef}>
          <DetailedCharts
            barData={barData}
            roleData={roleData}
            lowestDimensionPercent={lowestDimensionPercent}
            openChart={openChart}
            setOpenChart={setOpenChart}
            containerRef={chartsRef}
            radarData={radarData}
            isLoadingStats={isLoadingStats}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" ref={summaryRef}>
          <div className="h-full">
            <ResponseSummary
              respondentCount={respondentCount}
              avgScore={avgScore}
              minAcceptableScore={minAcceptableScore}
              belowMinimumDimensions={belowMinimumDimensions}
              atRiskDimensions={atRiskDimensions}
              strongDimensions={strongDimensions}
              actions={actions}
              onAddAction={handleCreateActionForDimension}
              onDeleteAction={deleteAction}
              onToggleAction={toggleActionCompletion}
            />
          </div>
          <div className="h-full">
            <ActionPlan
              actions={actions}
              onDeleteAction={deleteAction}
              onUpdateAction={handleUpdateAction}
              onViewDetails={(a) => { setSelectedActionForDetail(a); setIsDetailDialogOpen(true); }}
              containerRef={summaryRef}
            />
          </div>
        </div>

        <ActionDialog
          isOpen={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          onClose={() => setIsActionDialogOpen(false)}
          selectedDimension={selectedDimension}
          selectedStatus={selectedStatus}
          formState={actionForm}
          setFormState={setActionForm}
          createAction={createAction}
        />

        <ActionDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          action={selectedActionForDetail}
          onUpdate={handleUpdateAction}
          onDelete={deleteAction}
        />

        <SafetyAIChat
          stats={{ avgScore, respondentCount, strongDimensions, belowMinDimensions: belowMinimumDimensions, atRiskDimensions }}
          isDemo={isDemo} onUpgradeClick={() => setShowUpgradeModal(true)}
        />
        <UpgradeRequiredModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} title="AI Insights Required Upgrade" />
      </div>
    </div>
  );
}