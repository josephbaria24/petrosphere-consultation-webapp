//dashboard.tsx
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
import GaugeChart from "./chart/gauge-chart";
import CustomTooltip from "./chart/custom-tooltip";
import { BarChart3, Building2, GaugeCircle, Maximize2, Minimize2, TrendingDown, TrendingUp, Users2, AlertTriangle, CheckCircle2, Target, Navigation, FileText, Activity, PieChart } from "lucide-react";
import ChartModal from "./chart-modal";
import { RoleAreaChart } from "./chart/area-chart";
import ProfessionalSurveySummaryCard from "./summary-card";

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
  // 🔹 NEW: Add state for minimum acceptable score
  const [minAcceptableScore, setMinAcceptableScore] = useState<number>(2.0);
  // 🔹 NEW: Add state for dimensions analysis
  const [belowMinimumDimensions, setBelowMinimumDimensions] = useState<string[]>([]);
  const [atRiskDimensions, setAtRiskDimensions] = useState<string[]>([]);
  const [strongDimensions, setStrongDimensions] = useState<string[]>([]);
  // 🔹 NEW: Add state for scroll-based compact mode
  const [, setIsCompact] = useState<boolean>(false);
  // 🔹 NEW: Add state for active section tracking
  const [activeSection, setActiveSection] = useState<string>('selector');

  const { theme } = useTheme(); 
  const responseSummaryRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [showGoToTop, setShowGoToTop] = useState(false);

  // 🔹 NEW: Add refs for all sections
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const actionPlanRef = useRef<HTMLDivElement | null>(null);
  const [lowestDimensionPercent, setLowestDimensionPercent] = useState<number | null>(null);


  const toPercentage = (score: number): number => {
    return (score / 5 ) * 100;
  };

  // 🔹 NEW: Navigation items configuration
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

  // 🔹 NEW: Scroll to section function
  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>, sectionId: string) => {
    // Immediately update active section for instant feedback
    setActiveSection(sectionId);
    
    if (sectionRef.current) {
      // Method 1: Try scrollIntoView first (most reliable)
      sectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      // Method 2: Fallback to manual calculation if needed
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

  // 🔹 NEW: Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const summaryTop = responseSummaryRef.current?.getBoundingClientRect().top || 0;
      setShowGoToTop(summaryTop < window.innerHeight * 0.3);

      // Find which section is currently in view
      const sections = navigationItems.map(item => ({
        id: item.id,
        element: item.ref.current,
        top: item.ref.current?.getBoundingClientRect().top || Infinity
      })).filter(section => section.element !== null);

      // Sort sections by their position from top
      sections.sort((a, b) => a.top - b.top);

      // Find the active section based on scroll position
      let currentSection = 'selector';
      
      // Check which section is currently most visible
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const nextSection = sections[i + 1];
        
        // If this section is above the fold (top <= 200px) and the next section is below
        // or if this is the last section and it's visible
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

    // Call once to set initial state
    handleScroll();
  
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // Remove navigationItems dependency to avoid stale closures
  
  // Fetch survey questions when survey changes
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

  // 🔹 NEW: Function to fetch comparison data
  const fetchComparisonData = async (currentSurveyId: string) => {
    try {
      // Get all surveys except the current one
      const { data: otherSurveys, error: surveysError } = await supabase
        .from("surveys")
        .select("id")
        .neq("id", currentSurveyId);

      if (surveysError || !otherSurveys || otherSurveys.length === 0) {
        setComparisonRadarData([]);
        return;
      }

      const otherSurveyIds = otherSurveys.map(s => s.id);

      // Get all questions from other surveys
      const { data: allQuestions, error: questionsError } = await supabase
        .from("survey_questions")
        .select("id, dimension, scoring_type, max_score, min_score, reverse_score, template_id, survey_id")
        .in("survey_id", otherSurveyIds);

      if (questionsError || !allQuestions) {
        setComparisonRadarData([]);
        return;
      }

      const questionIds = allQuestions.map(q => q.id);

      // Get responses for all other surveys
      const { data: allResponses, error: responsesError } = await supabase
        .from("responses")
        .select("user_id, question_id, answer")
        .in("question_id", questionIds);

      if (responsesError || !allResponses) {
        setComparisonRadarData([]);
        return;
      }

      // Get templates
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

      // Process scores by dimension
      const dimensionScores: Record<string, number[]> = {};

      for (const r of allResponses) {
        const question = allQuestions.find((q) => q.id === r.question_id);
        if (!question) continue;

        let score: number | null = null;

        // Get template mapping for this question
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

        // Apply reverse/binary rules if needed
        const { scoring_type, max_score, min_score, reverse_score } = question;
        if (scoring_type === "likert" && reverse_score) {
          score = (max_score ?? 5) + 1 - score;
        } else if (scoring_type === "binary") {
          score = score ? max_score : min_score;
        }

        // Store for dimension
        if (!dimensionScores[question.dimension]) dimensionScores[question.dimension] = [];
        dimensionScores[question.dimension].push(score);
      } 

      // Calculate averages and prepare comparison data
      const comparisonData = Object.entries(dimensionScores).map(([dim, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          subject: dim,
          average: Math.min(avg, 5)
        };
      });

      // Helper to extract numeric prefix for sorting
      const extractNumber = (dim: string) => {
        const match = dim.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : Infinity;
      };

      // Sort the comparison data
      const sortedComparisonData = comparisonData.sort(
        (a, b) => extractNumber(a.subject) - extractNumber(b.subject)
      );

      // Merge with current survey data for comparison
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

  // 🔹 NEW: Handle scroll for compact mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsCompact(scrollTop > 100); // Switch to compact after 100px scroll
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const fetchSurveyStats = async (surveyId: string, company: string) => {
    // Step 1: get all question details
// Get all questions WITH template_id
const { data: questions, error: qError } = await supabase
  .from("survey_questions")
  .select("id, dimension, scoring_type, max_score, min_score, reverse_score, template_id")
  .eq("survey_id", surveyId);

    if (qError || !questions) return;
  
    // 🔹 NEW: Calculate minimum acceptable score from questions
    const calculateMinAcceptableScore = () => {
      if (questions.length === 0) return 2.0; // fallback
      
      // Find the minimum score that would be considered "acceptable"
      // This could be based on your business logic
      // For example, if most questions have min_score of 1 and max_score of 5,
      // you might want the minimum acceptable to be 2.6 (Level 3 threshold)
      const minScores = questions.map(q => q.min_score || 1);
      const maxScores = questions.map(q => q.max_score || 5);
      
      // Calculate average range and set minimum acceptable as 60% of the range
      const avgMin = minScores.reduce((a, b) => a + b, 0) / minScores.length;
      const avgMax = maxScores.reduce((a, b) => a + b, 0) / maxScores.length;
      
      // Set minimum acceptable score (you can adjust this logic based on your needs)
      // Here I'm using 2.6 as it represents "Level 3 – Interdependent" from your getLevelLabel function
      return 2.6;
    };

    const calculatedMinScore = calculateMinAcceptableScore();
    setMinAcceptableScore(calculatedMinScore);

// 🔹 Add this line: Collect question IDs
const questionIds = questions.map((q) => q.id);

// Step 2: fetch responses
const { data: responses, error: rError } = await supabase
  .from("responses")
  .select("user_id, question_id, answer")
  .in("question_id", questionIds);

if (rError || !responses) return;

    const templateIds = [...new Set(questions.map((q) => q.template_id).filter(Boolean))];

// Get the option_templates for these questions
const { data: templates, error: tError } = await supabase
  .from("option_templates")
  .select("id, options, scores")
  .in("id", templateIds);

if (tError || !templates) return;

// Put into lookup map
const templateMap: Record<string, { options: string[]; scores: number[] }> = {};
for (const t of templates) {
  templateMap[t.id] = { options: t.options, scores: t.scores };
}

    // Count respondents
    const uniqueRespondents = new Set(responses.map((r) => r.user_id));
    setRespondentCount(uniqueRespondents.size);
  
    // Step 3: aggregate scores + normalized reliability
    const dimensionScores: Record<string, number[]> = {};
    let normalizedScores: number[] = [];
  

    for (const r of responses) {
      const question = questions.find((q) => q.id === r.question_id);
      if (!question) continue;
    
      let score: number | null = null;
    
      // Get template mapping for this question
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
    
      // Apply reverse/binary rules if needed
      const { scoring_type, max_score, min_score, reverse_score } = question;
      if (scoring_type === "likert" && reverse_score) {
        score = (max_score ?? 5) + 1 - score;
      } else if (scoring_type === "binary") {
        score = score ? max_score : min_score;
      }
    
      // Store for dimension & reliability
      if (!dimensionScores[question.dimension]) dimensionScores[question.dimension] = [];
      dimensionScores[question.dimension].push(score);
    
      const normalized = (score - min_score) / (max_score - min_score);
      normalizedScores.push(normalized);
    }
    
    // 🔹 NEW: Analyze dimensions
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
  
    // Step 4: reliability = average normalized score * 100
    if (normalizedScores.length > 0) {
      setReliability(
        Math.round(
          (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length) * 100
        )
      );
    } else {
      setReliability(0);
    }

    
  
      // Step 5: prepare charts
      let tempBar = Object.entries(dimensionScores).map(([dim, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const score = Math.min(avg, 5);
        return {
          name: dim,
          score,
          scorePercent: toPercentage(score)
        };
      });
      
      // ✅ Find lowest dimension in %
      const lowest = tempBar.reduce(
        (min, curr) => (curr.scorePercent < min ? curr.scorePercent : min),
        100
      );
      setLowestDimensionPercent(lowest);
      
      // ✅ Add dynamic fill
      const bar = tempBar.map(item => ({
        ...item,
        fill: item.scorePercent <= lowest ? "#EF4444" : "#4A90E2"
      }));
      
      setBarData(bar);

    // Helper to extract numeric <YAxis 
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
    // Step 6: calculate trend vs previous survey
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

// Step X: calculate average score per role
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
// Step X: calculate average score per role per dimension
const roleDimensionScores: Record<string, Record<string, number[]>> = {};

for (const r of roleResponses || []) {
  const question = questions.find((q) => q.id === r.question_id);
  if (!question) continue;

  let score: number | null = null;

  if (typeof r.answer === "string") {
    // Try (number) at end of string
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

  // Apply scoring type rules
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


// Convert into chart data
const roleChartData = Object.entries(roleDimensionScores).map(([dimension, roles]) => {
  const row: Record<string, any> = { dimension };
  for (const [role, scores] of Object.entries(roles)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    row[role] = Math.min(avg, 5);
  }
  return row;
});

setRoleData(roleChartData);
// Sort bar data
const sortedBar = [...bar].sort((a, b) => extractNumber(a.name) - extractNumber(b.name));

setBarData(sortedBar);

// Radar chart sorted too
setRadarData(
  sortedBar.map((b) => ({ subject: b.name, you: b.score }))
);

// Role data also sorted
const sortedRoleData = roleChartData.sort(
  (a, b) => extractNumber(a.dimension) - extractNumber(b.dimension)
);

setRoleData(sortedRoleData);
  };
 

  // Fetch surveys
  useEffect(() => {
    const fetchSurveys = async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, target_company")
        .order("created_at", { ascending: false });
      if (!error && data) setSurveys(data);
      if (data.length > 0) {
        setSelectedSurvey(data[0]); // select first survey by default
      }
    };
    fetchSurveys();
  }, []);
  

  
  return (
    <div ref={topRef} className="min-h-screen px-2 space-y-2">
      {/* 🔹 NEW: Floating Navigation Menu */}
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
          
          {/* Timeline connector */}
          <div className="absolute left-1/2 top-2 bottom-2 w-0.5 bg-border/30 transform -translate-x-1/2 -z-10 rounded-full" />
          
          {/* Active section indicator */}
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
  
      {/* Grid Layout */}
      <div ref={overviewRef} className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Survey Summary (no modal needed) */}
        <div className="w-full">
        <ProfessionalSurveySummaryCard 
            selectedSurvey={selectedSurvey}
            respondentCount={respondentCount}
            avgScore={avgScore}
            trend={trend}
          />
          
        </div>
  
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
  
        {/* 🔹 NEW: Comparison Radar Chart */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Survey vs Average</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenChart("comparison")}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonRadarData}>
          <PolarGrid opacity={0.4} />
          <PolarAngleAxis 
            dataKey="subject" 
            fontSize={10} 
            tick={{ fill: theme === "dark" ? "#fff" : "#000" }} 
          />
            <PolarRadiusAxis 
              angle={90} 
              domain={[20, 100]}   // ✅ matches Likert 1–5 → 20–100%
              tickCount={5}        // 20, 40, 60, 80, 100
              tickFormatter={(val) => `${val}%`} // ✅ show %
              fontSize={13}
              stroke={theme === "dark" ? "#ccc" : "#000"}
              strokeWidth={0.5}
              tick={{ fill: theme === "dark" ? "#fff" : "#000", fontSize: 13, fontWeight: "bold" }}
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
            height={1}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: theme === "dark" ? "#fff" : "#000" }}
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

                {/* 🔹 UPDATED: Dynamic reference line */}
                <ReferenceLine
                y={lowestDimensionPercent ?? 0}   // ✅ red line at lowest % score
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



      {/* 🔹 NEW: Summary Section */}
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

            {/* Dimension Status Lists */}
            <div className="space-y-4 pt-4">
              {belowMinimumDimensions.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Areas
                  </h4>
                  <div className="space-y-1">
                    {belowMinimumDimensions.map((dim) => (
                      <div key={dim} className="text-sm text-red-600 dark:text-red-400">
                        • {dim}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {atRiskDimensions.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="flex items-center gap-2 font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                    <Target className="w-4 h-4" />
                    At Risk Areas
                  </h4>
                  <div className="space-y-1">
                    {atRiskDimensions.map((dim) => (
                      <div key={dim} className="text-sm text-yellow-600 dark:text-yellow-400">
                        • {dim}
                      </div>
                    ))}
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

        {/* Action Plan */}
        <Card ref={actionPlanRef} className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Action Plan
            </CardTitle>
            <CardDescription>
              Recommended actions to address critical and at-risk dimensions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {belowMinimumDimensions.length === 0 && atRiskDimensions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Excellent! All dimensions are performing well.</p>
                <p className="text-sm mt-1">Continue monitoring and maintaining current practices.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Priority Actions</h4>
                
                {belowMinimumDimensions.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-red-600 dark:text-red-400"> Immediate Action Required:</h5>
                    {belowMinimumDimensions.map((dim, index) => (
                      <div key={dim} className="p-3 bg-card border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="font-medium text-sm">{index + 1}. {dim}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          • Conduct detailed assessment and root cause analysis
                          <br />
                          • Develop immediate improvement strategy
                          <br />
                          • Assign dedicated resources and timeline
                          <br />
                          • Implement weekly progress monitoring
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {atRiskDimensions.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-yellow-600 dark:text-yellow-400">Monitor & Improve:</h5>
                    {atRiskDimensions.map((dim, index) => (
                      <div key={dim} className="p-3 bg-card border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="font-medium text-sm">{belowMinimumDimensions.length + index + 1}. {dim}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          • Review current processes and identify gaps
                          <br />
                          • Implement preventive measures
                          <br />
                          • Establish regular monitoring schedule
                          <br />
                          • Consider additional training or resources
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Next Steps:</h5>
                  <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <div>1. Prioritize actions based on business impact and urgency</div>
                    <div>2. Assign responsible teams and set clear deadlines</div>
                    <div>3. Establish success metrics and monitoring processes</div>
                    <div>4. Schedule regular review meetings to track progress</div>
                    <div>5. Plan follow-up assessment in 3-6 months</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  


















  
      {/* 🔹 Modals */}
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
                {/* 🔹 UPDATED: Dynamic reference line */}
                <ReferenceLine
                y={lowestDimensionPercent ?? 0}   // ✅ red line at lowest % score
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

      {/* 🔹 NEW: Comparison Radar Modal */}
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