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
import { BarChart3, Building2, GaugeCircle, TrendingDown, TrendingUp, Users2 } from "lucide-react";

export default function Dashboard() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [avgScore, setAvgScore] = useState<number>(0);
  const [totalAvg, setTotalAvg] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [reliability, setReliability] = useState<number>(0);
  const [respondentCount, setRespondentCount] = useState<number>(0);
  const [barData, setBarData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);

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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Survey Summary */}
        <Card className="w-full border border-muted shadow-lg bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Survey Summary
            </CardTitle>
            {selectedSurvey && (
              <CardDescription className="flex items-center gap-2 text-muted-foreground mt-1">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>
                  Company: <strong>{selectedSurvey.target_company || "N/A"}</strong>
                </span>
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Respondents:</span> {respondentCount}
            </div>

            <div className="flex items-center gap-2">
              <GaugeCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Avg Score:</span> {avgScore.toFixed(2)}
            </div>

            <div className="flex items-center gap-2">
              <GaugeCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Total Avg Score:</span> {totalAvg.toFixed(2)}
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
        <div className="w-full">
          <GaugeChart score={avgScore} />
        </div>

        

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>How You Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid opacity={0.4}/>
                <PolarAngleAxis dataKey="subject" fontSize={12}/>
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar name="You" dataKey="you" stroke="#FF7A40" fill="#FF7A40" fillOpacity={0.4} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Your Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <XAxis
                    dataKey="name"
                    angle={-20}
                    textAnchor="end"
                    fontSize={12}
                    interval={0}
                    height={60}
                  />
                  <YAxis domain={[0, 4]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" fill="#FF7A40" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between border-2 p-3 rounded-md">
              <span>Reliability Value:</span>
              <Badge variant="secondary">{reliability}% Excellent</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
