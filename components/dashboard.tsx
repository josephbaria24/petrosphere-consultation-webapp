//dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend,
  ReferenceLine
} from "recharts";
import { Separator } from "../@/components/ui/separator";
import { Progress } from "../@/components/ui/progress";
import { supabase } from "../lib/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import GaugeChart from "./chart/gauge-chart";
import CustomTooltip from "./chart/custom-tooltip";
import { BarChart3, Building2, GaugeCircle, Maximize2, Minimize2, TrendingDown, TrendingUp, Users2 } from "lucide-react";
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

  const getLevelLabel = (score: number) => {
    if (score >= 4.20 && score <= 5.0) return "Level 5 – Excellence (Resilient & Learning Culture)";
    if (score >= 3.40) return "Level 4 – Integrated (Cooperative Culture)";
    if (score >= 2.60) return "Level 3 – Interdependent (Engaged Workforce)";
    if (score >= 1.80) return "Level 2 – Independent (Managing Safely)";
    return "Level 1 – Dependent (Rules-Driven)";
  };
  
  // 🔹 NEW: Track expanded card
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleExpand = (card: string) => {
    setExpandedCard((prev) => (prev === card ? null : card));
  };

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
          current: currentItem ? currentItem.you : 0,
          average: item.average
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

    setMinAcceptableScore(calculateMinAcceptableScore());

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
    const bar = Object.entries(dimensionScores).map(([dim, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        name: dim,
        score: Math.min(avg, 5),
      };
    });
    

    // Helper to extract numeric prefix
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
    <div className="min-h-screen px-2 space-y-2">
      {/* Survey Selector */}
      <div className="inline-flex gap-2 dark:bg-card bg-zinc-800 p-1 pl-2 rounded-3xl shadow-md">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
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
  
        {/* Radar Chart */}
        {/* <Card className="w-full border-0 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Radar</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenChart("radar")}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid opacity={0.4} />
                <PolarAngleAxis dataKey="subject" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar
                  name="You"
                  dataKey="you"
                  stroke="#FF7A40"
                  fill="#FF7A40"
                  fillOpacity={0.4}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}

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
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar
                  name="Your score"
                  dataKey="current"
                  stroke="#FF7A40"
                  fill="#FF7A40"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Industry Average "
                  dataKey="average"
                  stroke="#4A90E2"
                  fill="#4A90E2"
                  fillOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom"
                  height={1}
                  iconType="circle" // "line", "circle", "square"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-2">
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
                <YAxis domain={[0, Math.max(5, Math.ceil(Math.max(...barData.map(d => d.score || 0)) + 0.5))]} />


                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="#FF7A40" radius={[4, 4, 0, 0]} />
                {/* 🔹 UPDATED: Dynamic reference line */}
                <ReferenceLine
  y={minAcceptableScore}
  stroke="red"
  strokeDasharray="6 6"
  strokeWidth={2}
  ifOverflow="visible"
  label={{
    position: "insideTopRight",
    value: `Minimum Level (${minAcceptableScore.toFixed(1)})`,
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
  <BarChart
    data={barData}
    margin={{ top: 50, right: 10, left: 0, bottom: 0 }}
  >
    <XAxis
      dataKey="name"
      angle={-20}
      textAnchor="end"
      fontSize={12}
      interval={0}
      height={100}
    />
    <YAxis domain={[0, Math.max(5, Math.ceil(Math.max(...barData.map(d => d.score || 0)) + 0.5))]} />

    <Tooltip content={<CustomTooltip />} />

    <Bar dataKey="score" fill="#FF7A40" radius={[4, 4, 0, 0]} />

    <ReferenceLine
      y={minAcceptableScore}
      stroke="red"
      strokeDasharray="6 6"
      strokeWidth={2}
      ifOverflow="visible"
      label={{
        position: "insideTopRight",
        value: `Minimum Level (${minAcceptableScore.toFixed(1)})`,
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