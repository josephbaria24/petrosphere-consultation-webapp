"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend,
  ReferenceLine, Cell
} from "recharts";
import { useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import GaugeChart from "./chart/gauge-chart";
import CustomTooltip from "./chart/custom-tooltip";
import { BarChart3, Building2, GaugeCircle, Maximize2, Minimize2, TrendingDown, TrendingUp, Users2, AlertTriangle, CheckCircle2, Target, Navigation, FileText, Activity, PieChart, ChevronDown, Plus, Edit, Trash2, Clock, User, Calendar } from "lucide-react";
import ChartModal from "./chart-modal";
import { RoleAreaChart } from "./chart/area-chart";
import ProfessionalSurveySummaryCard from "./summary-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../@/components/ui/dialog";

// Action interface
interface Action {
  id: string;
  survey_id: string;
  dimension: string;
  status: 'critical' | 'at_risk';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  created_by?: string;
}

export default function Dashboard() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [, setQuestions] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [totalAvg, setTotalAvg] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [reliability, setReliability] = useState<number>(0);
  const [respondentCount, setRespondentCount] = useState<number>(0);
  const [barData, setBarData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [comparisonRadarData, setComparisonRadarData] = useState<any[]>([]);
  const [openChart, setOpenChart] = useState<
    "bar" | "radar" | "gauge" | "role" | "comparison" | null
  >(null);
  const [roleData, setRoleData] = useState<any[]>([]);
  const [minAcceptableScore, setMinAcceptableScore] = useState<number>(2.0);
  const [belowMinimumDimensions, setBelowMinimumDimensions] = useState<string[]>([]);
  const [atRiskDimensions, setAtRiskDimensions] = useState<string[]>([]);
  const [strongDimensions, setStrongDimensions] = useState<string[]>([]);
  const [, setIsCompact] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('selector');

  // New states for actions
  const [actions, setActions] = useState<Action[]>([]);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'critical' | 'at_risk'>('critical');
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to: '',
    target_date: ''
  });

  const { theme } = useTheme(); 
  const responseSummaryRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [showGoToTop, setShowGoToTop] = useState(false);

  const selectorRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const actionPlanRef = useRef<HTMLDivElement | null>(null);
  const [lowestDimensionPercent, setLowestDimensionPercent] = useState<number | null>(null);

  const toPercentage = (score: number): number => {
    return (score / 5 ) * 100;
  };

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      ref: selectorRef
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: BarChart3,
      ref: chartsRef
    },
    {
      id: 'summary',
      label: 'Summary',
      icon: PieChart,
      ref: summaryRef
    },
    {
      id: 'actions',
      label: 'Action Plan',
      icon: Target,
      ref: actionPlanRef
    }
  ];

  // Fetch actions from Supabase
  const fetchActions = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from("actions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching actions:", error);
        return;
      }

      setActions(data || []);
    } catch (error) {
      console.error("Error fetching actions:", error);
    }
  };

  // Create new action
  const createAction = async () => {
    if (!selectedSurvey || !actionForm.title.trim() || !selectedDimension) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("actions")
        .insert({
          survey_id: selectedSurvey.id,
          dimension: selectedDimension,
          status: selectedStatus,
          title: actionForm.title,
          description: actionForm.description,
          priority: actionForm.priority,
          assigned_to: actionForm.assigned_to,
          target_date: actionForm.target_date || null,
          is_completed: false
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating action:", error);
        return;
      }

      // Update local state
      setActions(prev => [data, ...prev]);
      
      // Reset form and close dialog
      resetActionForm();
      closeActionDialog();
    } catch (error) {
      console.error("Error creating action:", error);
    }
  };

  // Helper function to reset action form
  const resetActionForm = () => {
    setActionForm({
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      target_date: ''
    });
    setSelectedDimension('');
    setSelectedStatus('critical');
  };

  // Helper function to close action dialog with cleanup
  const closeActionDialog = () => {
    setIsActionDialogOpen(false);
    // Small delay to ensure dialog is fully closed before cleanup
    setTimeout(() => {
      resetActionForm();
      // Force a re-render to clear any lingering modal states
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }, 100);
  };

  // Delete action
  const deleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from("actions")
        .delete()
        .eq("id", actionId);

      if (error) {
        console.error("Error deleting action:", error);
        return;
      }

      setActions(prev => prev.filter(action => action.id !== actionId));
    } catch (error) {
      console.error("Error deleting action:", error);
    }
  };

  // Toggle action completion
  const toggleActionCompletion = async (actionId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from("actions")
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq("id", actionId);

      if (error) {
        console.error("Error updating action:", error);
        return;
      }

      setActions(prev => 
        prev.map(action => 
          action.id === actionId 
            ? { ...action, is_completed: isCompleted }
            : action
        )
      );
    } catch (error) {
      console.error("Error updating action:", error);
    }
  };

  // Handle creating action for a specific dimension - FIXED
  const handleCreateActionForDimension = (dimension: string, status: 'critical' | 'at_risk') => {
    // Reset form first
    resetActionForm();
    // Set dimension and status
    setSelectedDimension(dimension);
    setSelectedStatus(status);
    // Open dialog last
    setIsActionDialogOpen(true);
  };

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>, sectionId: string) => {
    setActiveSection(sectionId);
    
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      setTimeout(() => {
        if (sectionRef.current) {
          const yOffset = -80;
          const element = sectionRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Add effect to handle dialog cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

  // Add effect to handle dialog state changes
  useEffect(() => {
    if (isActionDialogOpen) {
      // Ensure body is scrollable when dialog opens
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }
  }, [isActionDialogOpen]);

  
  useEffect(() => {
    const handleScroll = () => {
      const summaryTop = responseSummaryRef.current?.getBoundingClientRect().top || 0;
      setShowGoToTop(summaryTop < window.innerHeight * 0.3);

      const sections = navigationItems.map(item => ({
        id: item.id,
        element: item.ref.current,
        top: item.ref.current?.getBoundingClientRect().top || Infinity
      })).filter(section => section.element !== null);

      sections.sort((a, b) => a.top - b.top);

      let currentSection = 'selector';
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const nextSection = sections[i + 1];
        
        if (section.top <= 200) {
          if (!nextSection || nextSection.top > 200) {
            currentSection = section.id;
            break;
          } else {
            currentSection = section.id;
          }
        }
      }

      setActiveSection(currentSection);
    };

    handleScroll();
  
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  useEffect(() => {
    if (!selectedSurvey) return;
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("id, question_text, dimension")
        .eq("survey_id", selectedSurvey.id)
        .order("order_index", { ascending: true });
      if (!error && data) setQuestions(data);
    };
    fetchQuestions();
    fetchSurveyStats(selectedSurvey.id, selectedSurvey.target_company);
    fetchComparisonData(selectedSurvey.id);
    fetchActions(selectedSurvey.id); // Fetch actions when survey changes
  }, [selectedSurvey]);

  const getScoreFromTemplate = async (answer: string): Promise<number | null> => {
    const { data, error } = await supabase
      .from("option_templates")
      .select("options, scores");
  
    if (error || !data) return null;
  
    for (const template of data) {
      const idx = template.options?.findIndex(
        (opt: string) => opt.trim().toLowerCase() === answer.trim().toLowerCase()
      );
      if (idx !== -1 && template.scores && template.scores[idx] !== undefined) {
        return template.scores[idx];
      }
    }
  
    return null;
  };

  const fetchComparisonData = async (currentSurveyId: string) => {
    try {
      const { data: otherSurveys, error: surveysError } = await supabase
        .from("surveys")
        .select("id")
        .neq("id", currentSurveyId);

      if (surveysError || !otherSurveys || otherSurveys.length === 0) {
        setComparisonRadarData([]);
        return;
      }

      const otherSurveyIds = otherSurveys.map(s => s.id);

      const { data: allQuestions, error: questionsError } = await supabase
        .from("survey_questions")
        .select("id, dimension, scoring_type, max_score, min_score, reverse_score, template_id, survey_id")
        .in("survey_id", otherSurveyIds);

      if (questionsError || !allQuestions) {
        setComparisonRadarData([]);
        return;
      }

      const questionIds = allQuestions.map(q => q.id);

      const { data: allResponses, error: responsesError } = await supabase
        .from("responses")
        .select("user_id, question_id, answer")
        .in("question_id", questionIds);

      if (responsesError || !allResponses) {
        setComparisonRadarData([]);
        return;
      }

      const templateIds = [...new Set(allQuestions.map((q) => q.template_id).filter(Boolean))];
      const { data: templates, error: templatesError } = await supabase
        .from("option_templates")
        .select("id, options, scores")
        .in("id", templateIds);

      if (templatesError || !templates) {
        setComparisonRadarData([]);
        return;
      }

      const templateMap: Record<string, { options: string[]; scores: number[] }> = {};
      for (const t of templates) {
        templateMap[t.id] = { options: t.options, scores: t.scores };
      }

      const dimensionScores: Record<string, number[]> = {};

      for (const r of allResponses) {
        const question = allQuestions.find((q) => q.id === r.question_id);
        if (!question) continue;

        let score: number | null = null;

        const template = question.template_id ? templateMap[question.template_id] : null;
        if (template) {
          const idx = template.options.findIndex(
            (opt) => opt.trim().toLowerCase() === r.answer.trim().toLowerCase()
          );
          if (idx !== -1 && template.scores[idx] !== undefined) {
            score = template.scores[idx];
          }
        }

        if (score === null || isNaN(score)) continue;

        const { scoring_type, max_score, min_score, reverse_score } = question;
        if (scoring_type === "likert" && reverse_score) {
          score = (max_score ?? 5) + 1 - score;
        } else if (scoring_type === "binary") {
          score = score ? max_score : min_score;
        }

        if (!dimensionScores[question.dimension]) dimensionScores[question.dimension] = [];
        dimensionScores[question.dimension].push(score);
      } 

      const comparisonData = Object.entries(dimensionScores).map(([dim, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          subject: dim,
          average: Math.min(avg, 5)
        };
      });

      const extractNumber = (dim: string) => {
        const match = dim.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : Infinity;
      };

      const sortedComparisonData = comparisonData.sort(
        (a, b) => extractNumber(a.subject) - extractNumber(b.subject)
      );

      const mergedData = sortedComparisonData.map(item => {
        const currentItem = radarData.find(r => r.subject === item.subject);
        return {
          subject: item.subject,
          current: currentItem ? toPercentage(currentItem.you) : 0,
          average: toPercentage(item.average)
        };
      });

      setComparisonRadarData(mergedData);

    } catch (error) {
      console.error("Error fetching comparison data:", error);
      setComparisonRadarData([]);
    }
  };

  useEffect(() => {
    if (selectedSurvey && radarData.length > 0) {
      fetchComparisonData(selectedSurvey.id);
    }
  }, [selectedSurvey, radarData]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsCompact(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchSurveyStats = async (surveyId: string, company: string) => {
    const { data: questions, error: qError } = await supabase
      .from("survey_questions")
      .select("id, dimension, scoring_type, max_score, min_score, reverse_score, template_id")
      .eq("survey_id", surveyId);

    if (qError || !questions) return;
  
    const calculateMinAcceptableScore = () => {
      if (questions.length === 0) return 2.0;
      
      const minScores = questions.map(q => q.min_score || 1);
      const maxScores = questions.map(q => q.max_score || 5);
      
      const avgMin = minScores.reduce((a, b) => a + b, 0) / minScores.length;
      const avgMax = maxScores.reduce((a, b) => a + b, 0) / maxScores.length;
      
      return 2.6;
    };

    const calculatedMinScore = calculateMinAcceptableScore();
    setMinAcceptableScore(calculatedMinScore);

    const questionIds = questions.map((q) => q.id);

    const { data: responses, error: rError } = await supabase
      .from("responses")
      .select("user_id, question_id, answer")
      .in("question_id", questionIds);

    if (rError || !responses) return;

    const templateIds = [...new Set(questions.map((q) => q.template_id).filter(Boolean))];

    const { data: templates, error: tError } = await supabase
      .from("option_templates")
      .select("id, options, scores")
      .in("id", templateIds);

    if (tError || !templates) return;

    const templateMap: Record<string, { options: string[]; scores: number[] }> = {};
    for (const t of templates) {
      templateMap[t.id] = { options: t.options, scores: t.scores };
    }

    const uniqueRespondents = new Set(responses.map((r) => r.user_id));
    setRespondentCount(uniqueRespondents.size);
  
    const dimensionScores: Record<string, number[]> = {};
    let normalizedScores: number[] = [];
  
    for (const r of responses) {
      const question = questions.find((q) => q.id === r.question_id);
      if (!question) continue;
    
      let score: number | null = null;
    
      const template = question.template_id ? templateMap[question.template_id] : null;
      if (template) {
        const idx = template.options.findIndex(
          (opt) => opt.trim().toLowerCase() === r.answer.trim().toLowerCase()
        );
        if (idx !== -1 && template.scores[idx] !== undefined) {
          score = template.scores[idx];
        }
      }
    
      if (score === null || isNaN(score)) continue;
    
      const { scoring_type, max_score, min_score, reverse_score } = question;
      if (scoring_type === "likert" && reverse_score) {
        score = (max_score ?? 5) + 1 - score;
      } else if (scoring_type === "binary") {
        score = score ? max_score : min_score;
      }
    
      if (!dimensionScores[question.dimension]) dimensionScores[question.dimension] = [];
      dimensionScores[question.dimension].push(score);
    
      const normalized = (score - min_score) / (max_score - min_score);
      normalizedScores.push(normalized);
    }
    
    const analyzeDimensions = (dimensionScores: Record<string, number[]>) => {
      const belowMin: string[] = [];
      const atRisk: string[] = [];
      const strong: string[] = [];
      
      Object.entries(dimensionScores).forEach(([dim, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const clampedAvg = Math.min(avg, 5);
        
        if (clampedAvg <= calculatedMinScore) {
          belowMin.push(dim);
        } else if (clampedAvg <= calculatedMinScore + 0.5) {
          atRisk.push(dim);
        } else {
          strong.push(dim);
        }
      });
      
      setBelowMinimumDimensions(belowMin);
      setAtRiskDimensions(atRisk);
      setStrongDimensions(strong);
    };

    analyzeDimensions(dimensionScores);
  
    if (normalizedScores.length > 0) {
      setReliability(
        Math.round(
          (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length) * 100
        )
      );
    } else {
      setReliability(0);
    }
      
    let tempBar = Object.entries(dimensionScores).map(([dim, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const score = Math.min(avg, 5);
      return {
        name: dim,
        score,
        scorePercent: toPercentage(score)
      };
    });
    
    const lowest = tempBar.reduce(
      (min, curr) => (curr.scorePercent < min ? curr.scorePercent : min),
      100
    );
    setLowestDimensionPercent(lowest);
    
    const bar = tempBar.map(item => ({
      ...item,
      fill: item.scorePercent <= lowest ? "#EF4444" : "#4A90E2"
    }));
    
    setBarData(bar);

    const extractNumber = (dim: string) => {
      const match = dim.match(/^(\d+)\./);
      return match ? parseInt(match[1], 10) : Infinity;
    };

    setBarData(bar);
    setRadarData(bar.map((b) => ({ subject: b.name, you: b.score })));
  
    const allScores = Object.values(dimensionScores).flat();
    const currentAvgRaw = allScores.reduce((a, b) => a + b, 0) / allScores.length || 0;
    const currentAvg = Math.min(currentAvgRaw, 5);
    setAvgScore(currentAvg);
    setTotalAvg(currentAvg);

    const { data: pastSurveys } = await supabase
      .from("surveys")
      .select("id")
      .eq("target_company", company)
      .order("created_at", { ascending: false })
      .limit(2);
    if (pastSurveys && pastSurveys.length === 2) {
      const prevSurveyId = pastSurveys[1].id;
      const { data: prevQuestions } = await supabase
        .from("survey_questions")
        .select("id")
        .eq("survey_id", prevSurveyId);
      const prevQIds = prevQuestions?.map((q) => q.id) || [];
      const { data: prevResponses } = await supabase
        .from("responses")
        .select("answer")
        .in("question_id", prevQIds);
      const prevScores = prevResponses
        ?.map((r) => parseFloat(r.answer))
        .filter((n) => !isNaN(n)) || [];
      const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length || 0;
      setTrend(currentAvg - prevAvg);
    }

    type RoleResponse = {
      user_id: string;
      question_id: string;
      answer: string | number;
      users: {
        role: string | null;
      } | null;
    };

    const { data: roleResponses, error: roleError } = await supabase
      .from("responses")
      .select(`
        user_id,
        question_id,
        answer,
        users:users (
          role
        )
      `)
      .in("question_id", questionIds) as { data: RoleResponse[] | null, error: any };

    if (roleError) {
      console.error("Error fetching role responses:", roleError);
      return;
    }

    const roleDimensionScores: Record<string, Record<string, number[]>> = {};

    for (const r of roleResponses || []) {
      const question = questions.find((q) => q.id === r.question_id);
      if (!question) continue;

      let score: number | null = null;

      if (typeof r.answer === "string") {
        const match = r.answer.match(/\((\d+)\)$/);
        if (match) {
          score = parseInt(match[1], 10);
        } else {
          const parsed = parseFloat(r.answer);
          if (!isNaN(parsed)) {
            score = parsed;
          } else {
            const cleanAnswer = r.answer.replace(/\s*\(\d+\)$/, "").trim();
            const templateScore = await getScoreFromTemplate(cleanAnswer);
            if (templateScore !== null) score = templateScore;
          }
        }
      } else if (typeof r.answer === "number") {
        score = r.answer;
      }

      if (score === null || isNaN(score)) continue;

      const { scoring_type, max_score, min_score, reverse_score } = question;
      if (scoring_type === "likert" && reverse_score) {
        score = (max_score ?? 5) + 1 - score;
      } else if (scoring_type === "binary") {
        score = score ? max_score : min_score;
      }

      const role = r.users?.role || "Unknown";
      const dimension = question.dimension || "Unknown";

      if (!roleDimensionScores[dimension]) roleDimensionScores[dimension] = {};
      if (!roleDimensionScores[dimension][role]) roleDimensionScores[dimension][role] = [];

      roleDimensionScores[dimension][role].push(score);
    }

    const roleChartData = Object.entries(roleDimensionScores).map(([dimension, roles]) => {
      const row: Record<string, any> = { dimension };
      for (const [role, scores] of Object.entries(roles)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        row[role] = Math.min(avg, 5);
      }
      return row;
    });

    setRoleData(roleChartData);

    const sortedBar = [...bar].sort((a, b) => extractNumber(a.name) - extractNumber(b.name));

    setBarData(sortedBar);

    setRadarData(
      sortedBar.map((b) => ({ subject: b.name, you: b.score }))
    );

    const sortedRoleData = roleChartData.sort(
      (a, b) => extractNumber(a.dimension) - extractNumber(b.dimension)
    );

    setRoleData(sortedRoleData);
  };

  useEffect(() => {
    const fetchSurveys = async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, target_company")
        .order("created_at", { ascending: false });
      if (!error && data) setSurveys(data);
      if (data.length > 0) {
        setSelectedSurvey(data[0]);
      }
    };
    fetchSurveys();
  }, []);

  // Render clickable dimension item
  const renderDimensionItem = (dimension: string, status: 'critical' | 'at_risk') => {
    const statusColor = status === 'critical' ? 'red' : 'yellow';
    const dimensionActions = actions.filter(a => a.dimension === dimension && a.status === status);
    
    return (
      <div key={dimension} className="space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between text-left p-2 h-auto border border-${statusColor}-200 dark:border-${statusColor}-800 hover:bg-${statusColor}-50 dark:hover:bg-${statusColor}-950/20`}
            >
              <span className="text-sm">• {dimension}</span>
              <div className="flex items-center gap-2">
                {dimensionActions.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    {dimensionActions.length} action{dimensionActions.length > 1 ? 's' : ''}
                  </span>
                )}
                <ChevronDown className="w-4 h-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{dimension}</span>
                <Button
                  size="sm"
                  onClick={() => handleCreateActionForDimension(dimension, status)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Action
                </Button>
              </div>
              
              {dimensionActions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dimensionActions.map((action) => (
                    <div
                      key={action.id}
                      className={`p-2 border rounded text-xs space-y-1 ${
                        action.is_completed 
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`font-medium ${action.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {action.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAction(action.id)}
                          className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {action.description && (
                        <p className="text-muted-foreground">{action.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {action.priority && (
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              action.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400' :
                              action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
                            }`}>
                              {action.priority}
                            </span>
                          )}
                          {action.target_date && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(action.target_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActionCompletion(action.id, !action.is_completed)}
                          className="h-5 px-1 text-xs"
                        >
                          {action.is_completed ? 'Reopen' : 'Complete'}
                        </Button>
                      </div>
                      
                      {action.assigned_to && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{action.assigned_to}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No actions created yet</p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };
  
  return (
    <div ref={topRef} className="min-h-screen px-2 space-y-2">
      {/* Floating Navigation Menu */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-transparent backdrop-blur-sm border-0 border-border/50 rounded-2xl p-2 shadow-2xl">
          <div className="flex flex-col space-y-2">
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
                      ? 'bg-primary text-primary-foreground shadow-md scale-110' 
                      : 'hover:bg-muted hover:scale-105'
                    }
                  `}
                  title={item.label}
                >
                  <IconComponent className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
          
          <div className="absolute left-1/2 top-2 bottom-2 w-0.5 bg-border/30 transform -translate-x-1/2 -z-10 rounded-full" />
          
          <div 
            className="absolute left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 transition-all duration-300 ease-out"
            style={{
              top: `${8 + navigationItems.findIndex(item => item.id === activeSection) * 48}px`
            }}
          />
        </div>
      </div>

      {/* Survey Selector */}
      <div ref={selectorRef} className="inline-flex gap-2 dark:bg-card bg-zinc-800 p-1 pl-2 rounded-3xl shadow-xl">
        <div className="flex items-center text-sm text-white">
          <h1>Select survey</h1>
        </div>
        <Select
          value={selectedSurvey?.id || ""}
          onValueChange={(val) => {
            const surveyObj = surveys.find((s) => s.id === val);
            setSelectedSurvey(surveyObj || null);
          }}
        >
          <SelectTrigger className="bg-card rounded-2xl border-0">
            <SelectValue placeholder="Select a Survey" />
          </SelectTrigger>
          <SelectContent>
            {surveys.map((survey) => (
              <SelectItem key={survey.id} value={survey.id}>
                {survey.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Survey Summary */}
      <div className="w-full">
        <ProfessionalSurveySummaryCard 
            selectedSurvey={selectedSurvey}
            respondentCount={respondentCount}
            avgScore={avgScore}
            trend={trend}
          />
      </div>
  
      {/* Grid Layout */}
      <div ref={overviewRef} className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Gauge Chart */}
        <Card className="w-full shadow-lg border-0">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Gauge</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenChart("gauge")}>
              <Maximize2 className="w-2 h-2" />
            </Button>
          </CardHeader>
          <CardContent>
            <GaugeChart score={avgScore} />
          </CardContent>
        </Card>
  
        {/* Comparison Radar Chart */}
        <Card className="w-full border-0 shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Survey vs Average</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpenChart("comparison")}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="h-[550px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="40%" outerRadius="80%" data={comparisonRadarData}>
                  <PolarGrid opacity={0.4} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    fontSize={11} 
                    tick={{ fill: theme === "dark" ? "#fff" : "#000" }} 
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[20, 100]}
                    tickCount={5}
                    tickFormatter={(val) => `${val}%`}
                    fontSize={14}
                    stroke={theme === "dark" ? "#ccc" : "#000"}
                    strokeWidth={0.5}
                    tick={{ fill: theme === "dark" ? "#fff" : "#000", fontSize: 10, fontWeight: "bold" }}
                    axisLine={{ stroke: theme === "dark" ? "#888" : "#000", strokeWidth: 0.5 }}
                  />

                  <Radar
                    name="Your score"
                    dataKey="current"
                    stroke="#FF7A40"
                    fill="#FF7A40"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="Industry Average"
                    dataKey="average"
                    stroke="#4A90E2"
                    fill="#4A90E2"
                    fillOpacity={0.2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "14px", color: theme === "dark" ? "#fff" : "#000" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-1 gap-2">
          {/* Bar Chart */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Bar Chart</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenChart("bar")}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 50, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  angle={-20}
                  textAnchor="end"
                  fontSize={12}
                  interval={0}
                  height={100}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(val) => `${val}%`} 
                />

                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="scorePercent" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>

                <ReferenceLine
                  y={lowestDimensionPercent ?? 0}
                  stroke="red"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  ifOverflow="visible"
                  label={{
                    position: "insideTopRight",
                    value: `Lowest Dimension (${(lowestDimensionPercent ?? 0).toFixed(1)}%)`,
                    fill: "red",
                    fontSize: 12
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
  
        {/* Role Area Chart */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Scores by Role</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenChart("role")}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <RoleAreaChart data={roleData} />
          </CardContent>
        </Card>
        </div>

      {/* Summary Section */}
      <div ref={summaryRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Total Responses Summary */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Response Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{respondentCount}</div>
                <div className="text-sm text-muted-foreground">Total Responses</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {toPercentage(avgScore).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Dimension Status</span>
                <span>Dimension Count</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Critical (≤ {minAcceptableScore.toFixed(1)})
                </span>
                <span className="font-semibold">{belowMinimumDimensions.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  At Risk ({minAcceptableScore.toFixed(1)} - {(minAcceptableScore + 0.5).toFixed(1)})
                </span>
                <span className="font-semibold">{atRiskDimensions.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Strong (&gt; {(minAcceptableScore + 0.5).toFixed(1)})
                </span>
                <span className="font-semibold">{strongDimensions.length}</span>
              </div>
            </div>

            {/* Interactive Dimension Lists */}
            <div className="space-y-4 pt-4">
              {belowMinimumDimensions.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Areas
                  </h4>
                  <div className="space-y-2">
                    {belowMinimumDimensions.map((dim) => renderDimensionItem(dim, 'critical'))}
                  </div>
                </div>
              )}

              {atRiskDimensions.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="flex items-center gap-2 font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
                    <Target className="w-4 h-4" />
                    At Risk Areas
                  </h4>
                  <div className="space-y-2">
                    {atRiskDimensions.map((dim) => renderDimensionItem(dim, 'at_risk'))}
                  </div>
                </div>
              )}

              {strongDimensions.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Strengths
                  </h4>
                  <div className="space-y-1">
                    {strongDimensions.map((dim) => (
                      <div key={dim} className="text-sm text-green-600 dark:text-green-400">
                        • {dim}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Action Plan */}
        <Card ref={actionPlanRef} className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Action Plan
            </CardTitle>
            <CardDescription>
              {actions.length > 0 
                ? `${actions.filter(a => !a.is_completed).length} active actions, ${actions.filter(a => a.is_completed).length} completed`
                : 'Create actions for critical and at-risk dimensions'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>No actions created yet</p>
                <p className="text-sm mt-1">Click on dimensions in the summary above to create actions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Actions */}
                {actions.filter(a => !a.is_completed).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Active Actions ({actions.filter(a => !a.is_completed).length})
                    </h4>
                    
                    {actions
                      .filter(a => !a.is_completed)
                      .sort((a, b) => {
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      })
                      .map((action) => (
                        <div key={action.id} className={`p-4 border rounded-lg ${
                          action.status === 'critical' 
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' 
                            : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium">{action.title}</h5>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  action.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                  action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}>
                                  {action.priority} priority
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Dimension: {action.dimension}
                              </div>
                              {action.description && (
                                <p className="text-sm mb-2">{action.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActionCompletion(action.id, true)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteAction(action.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {action.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {action.assigned_to}
                              </span>
                            )}
                            {action.target_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due: {new Date(action.target_date).toLocaleDateString()}
                              </span>
                            )}
                            <span>
                              Created: {new Date(action.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Completed Actions */}
                {actions.filter(a => a.is_completed).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Completed Actions ({actions.filter(a => a.is_completed).length})
                    </h4>
                    
                    {actions
                      .filter(a => a.is_completed)
                      .map((action) => (
                        <div key={action.id} className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg opacity-75">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium line-through">{action.title}</h5>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Dimension: {action.dimension}
                              </div>
                              {action.description && (
                                <p className="text-sm mb-2 line-through">{action.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActionCompletion(action.id, false)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                Reopen
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteAction(action.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {action.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {action.assigned_to}
                              </span>
                            )}
                            <span>
                              Completed: {new Date(action.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Creation Dialog - FIXED */}
      <Dialog 
        open={isActionDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            closeActionDialog();
          } else {
            setIsActionDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Action</DialogTitle>
            <DialogDescription>
              Create an action plan for {selectedDimension} ({selectedStatus} status)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Action Title *</Label>
              <Input
                id="title"
                value={actionForm.title}
                onChange={(e) => setActionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter action title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={actionForm.description}
                onChange={(e) => setActionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the action plan..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={actionForm.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setActionForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_date">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={actionForm.target_date}
                  onChange={(e) => setActionForm(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Input
                id="assigned_to"
                value={actionForm.assigned_to}
                onChange={(e) => setActionForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                placeholder="Enter assignee name..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={closeActionDialog}
            >
              Cancel
            </Button>
            <Button
              onClick={createAction}
              disabled={!actionForm.title.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Action
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chart Modals */}
      <ChartModal open={openChart === "gauge"} onClose={() => setOpenChart(null)} title="Gauge Chart">
        <GaugeChart score={avgScore} />
      </ChartModal>
  
      <ChartModal open={openChart === "radar"} onClose={() => setOpenChart(null)} title="Radar Chart">
        <ResponsiveContainer width="100%" height={450}>
          <RadarChart cx="50%" cy="30%" outerRadius="50%" data={radarData}>
            <PolarGrid opacity={0.4} />
            <PolarAngleAxis dataKey="subject" fontSize={12} />
            <PolarRadiusAxis angle={30} domain={[0, 4]} />
            <Radar name="You" dataKey="you" stroke="#FF7A40" fill="#FF7A40" fillOpacity={0.4} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartModal>
  
      <ChartModal open={openChart === "bar"} onClose={() => setOpenChart(null)} title="Bar Chart">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 50, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              angle={-20}
              textAnchor="end"
              fontSize={12}
              interval={0}
              height={100}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(val) => `${val}%`} 
            />

            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="scorePercent" fill="#4A90E2" radius={[4, 4, 0, 0]} />
            <ReferenceLine
              y={lowestDimensionPercent ?? 0}
              stroke="red"
              strokeDasharray="6 6"
              strokeWidth={2}
              ifOverflow="visible"
              label={{
                position: "insideTopRight",
                value: `Lowest Dimension (${(lowestDimensionPercent ?? 0).toFixed(1)}%)`,
                fill: "red",
                fontSize: 12
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartModal>
  
      <ChartModal
        open={openChart === "role"}
        onClose={() => setOpenChart(null)}
        title="Scores by Role"
      >
        <RoleAreaChart data={roleData} bare />
      </ChartModal>

      <ChartModal open={openChart === "comparison"} onClose={() => setOpenChart(null)} title="Survey vs Average Comparison">
        <ResponsiveContainer width="100%" height={450}>
          <RadarChart cx="50%" cy="30%" outerRadius="50%" data={comparisonRadarData}>
            <PolarGrid opacity={0.4} />
            <PolarAngleAxis dataKey="subject" fontSize={12} />
            <PolarRadiusAxis angle={30} domain={[0, 4]} />
            <Radar
              name="Current Survey"
              dataKey="current"
              stroke="#FF7A40"
              fill="#FF7A40"
              fillOpacity={0.4}
            />
            <Radar
              name="Average"
              dataKey="average"
              stroke="#4A90E2"
              fill="#4A90E2"
              fillOpacity={0.2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartModal>
    </div>
  );
}