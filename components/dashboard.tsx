"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Separator } from "../@/components/ui/separator";
import { Progress } from "../@/components/ui/progress";
import { Badge } from "../@/components/ui/badge";
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
import EnlargedBarChartModal from "./chart-modal";
import ChartModal from "./chart-modal";
import { RoleAreaChart } from "./chart/area-chart";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openChart, setOpenChart] = useState<
  "bar" | "radar" | "gauge" | "role" | null
>(null);
  const [roleData, setRoleData] = useState<any[]>([]);

  
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
  }, [selectedSurvey]);

  const fetchSurveyStats = async (surveyId: string, company: string) => {
    // Step 1: get all question details
    const { data: questions, error: qError } = await supabase
      .from("survey_questions")
      .select("id, dimension, scoring_type, max_score, min_score, reverse_score")
      .eq("survey_id", surveyId);
    if (qError || !questions) return;
  
    const questionIds = questions.map((q) => q.id);
  
    // Step 2: get responses
    const { data: responses, error: rError } = await supabase
      .from("responses")
      .select("user_id, question_id, answer")
      .in("question_id", questionIds);
    if (rError || !responses) return;
  
    // Count respondents
    const uniqueRespondents = new Set(responses.map((r) => r.user_id));
    setRespondentCount(uniqueRespondents.size);
  
    // Step 3: aggregate scores + normalized reliability
    const dimensionScores: Record<string, number[]> = {};
    let normalizedScores: number[] = [];
  
    responses.forEach((r) => {
      const question = questions.find((q) => q.id === r.question_id);
      if (!question) return;
  
      let score: number | null = null;
      if (typeof r.answer === "string") {
        const match = r.answer.match(/\((\d+)\)$/);
        if (match) {
          score = parseInt(match[1], 10);
        } else {
          const parsed = parseFloat(r.answer);
          if (!isNaN(parsed)) score = parsed;
        }
      } else if (typeof r.answer === "number") {
        score = r.answer;
      }
      if (score === null || isNaN(score)) return;
  
      const { scoring_type, max_score, min_score, reverse_score } = question;
      if (scoring_type === "likert" && reverse_score) {
        score = max_score + 1 - score;
      } else if (scoring_type === "binary") {
        score = score ? max_score : min_score;
      }
  
      // Dimension scores
      if (!dimensionScores[question.dimension]) {
        dimensionScores[question.dimension] = [];
      }
      dimensionScores[question.dimension].push(score);
  
      // Normalized scores for reliability
      const normalized = (score - min_score) / (max_score - min_score);
      normalizedScores.push(normalized);
    });
  
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
    const bar = Object.entries(dimensionScores).map(([dim, scores]) => ({
      name: dim,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    // Helper to extract numeric prefix
    const extractNumber = (dim: string) => {
      const match = dim.match(/^(\d+)\./);
      return match ? parseInt(match[1], 10) : Infinity;
    };

    

    setBarData(bar);
    setRadarData(bar.map((b) => ({ subject: b.name, you: b.score })));
  
    const allScores = Object.values(dimensionScores).flat();
    const currentAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length || 0;
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

roleResponses?.forEach((r) => {
  let score: number | null = null;

  if (typeof r.answer === "string") {
    const match = r.answer.match(/\((\d+)\)$/);
    if (match) score = parseInt(match[1], 10);
    else {
      const parsed = parseFloat(r.answer);
      if (!isNaN(parsed)) score = parsed;
    }
  } else if (typeof r.answer === "number") {
    score = r.answer;
  }

  if (score !== null && !isNaN(score)) {
    const role = r.users?.role || "Unknown";
    const dimension = questions.find((q) => q.id === r.question_id)?.dimension || "Unknown";

    if (!roleDimensionScores[dimension]) roleDimensionScores[dimension] = {};
    if (!roleDimensionScores[dimension][role]) roleDimensionScores[dimension][role] = [];

    roleDimensionScores[dimension][role].push(score);
  }
});

// Convert into chart data
const roleChartData = Object.entries(roleDimensionScores).map(([dimension, roles]) => {
  const row: Record<string, any> = { dimension };
  for (const [role, scores] of Object.entries(roles)) {
    row[role] = scores.reduce((a, b) => a + b, 0) / scores.length;
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
        <Card className="w-full border-0 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Survey Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              <span className="font-medium">Respondents:</span> {respondentCount}
            </div>
            <div className="flex items-center gap-2">
              <GaugeCircle className="w-4 h-4" />
              <span className="font-medium">Avg Score:</span> {avgScore.toFixed(2)}
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">Trending Direction:</span>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(2)}
            </div>
            <Progress value={Math.abs(trend * 100)} className="h-2" />
          </CardContent>
        </Card>
  
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
        <Card className="w-full border-0 shadow-lg">
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
                <YAxis domain={[0, 4]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="#FF7A40" radius={[4, 4, 0, 0]} />
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
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
            <XAxis
              dataKey="name"
              angle={-20}
              textAnchor="end"
              fontSize={12}
              interval={0}
              height={200}
            />
            <YAxis domain={[0, 4]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" fill="#FF7A40" radius={[4, 4, 0, 0]} />
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
    </div>
  );
  
}