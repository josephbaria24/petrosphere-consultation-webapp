"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../ui/button";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  XCircle,
} from "@/components/icons";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { sanitizeDomForPdf } from "../../lib/export-utils";
import { FIELD_WORKFLOW_BY_KIND, type FieldWorkflowKind } from "../../lib/field-workflows";
import Link from "next/link";

interface SessionRow {
  id: string;
  completed_at: string | null;
  task_template_id: string;
  task_templates?: {
    title: string;
    template_kind?: FieldWorkflowKind;
  };
}

interface ResponseRow {
  session_id: string;
  answer: string;
}

interface InspectionReportDashboardProps {
  orgId: string;
  userId?: string;
  isPlatformAdmin: boolean;
  basePath: string;
}

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const SCORE_COLORS: Record<string, string> = {
  scheduled_inspection: "#22c55e",
  safety_walk: "#f97316",
  audit: "#ef4444",
};

export default function InspectionReportDashboard({
  orgId,
  userId,
  isPlatformAdmin,
  basePath,
}: InspectionReportDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("task_sessions")
          .select("id, completed_at, task_template_id, task_templates(title, template_kind)")
          .eq("org_id", orgId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });
        if (!isPlatformAdmin && userId) q = q.eq("user_id", userId);
        const { data: sess, error } = await q;
        if (error) throw error;
        const normalized: SessionRow[] = (sess || []).map((s) => {
          const tpl = s.task_templates;
          const template = Array.isArray(tpl) ? tpl[0] : tpl;
          return {
            id: s.id,
            completed_at: s.completed_at,
            task_template_id: s.task_template_id,
            task_templates: template
              ? {
                  title: template.title as string,
                  template_kind: template.template_kind as
                    | FieldWorkflowKind
                    | undefined,
                }
              : undefined,
          };
        });
        setSessions(normalized);

        if (sess?.length) {
          const ids = sess.map((s) => s.id);
          const { data: resp } = await supabase
            .from("task_responses")
            .select("session_id, answer")
            .in("session_id", ids);
          setResponses((resp as ResponseRow[]) || []);
        } else {
          setResponses([]);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load inspection reports.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId, userId, isPlatformAdmin]);

  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const count = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const cd = new Date(s.completed_at);
      return isWithinInterval(cd, { start, end });
    }).length;
    return {
      month: MONTH_LABELS[d.getMonth()],
      count,
      fill: "#1e3a5f",
    };
  });

  const kindScores = (["scheduled_inspection", "safety_walk", "audit"] as FieldWorkflowKind[]).map(
    (kind) => {
      const kindSessions = sessions.filter(
        (s) => s.task_templates?.template_kind === kind
      );
      const sessionIds = new Set(kindSessions.map((s) => s.id));
      const kindResponses = responses.filter((r) => sessionIds.has(r.session_id));
      const total = kindResponses.length;
      const yes = kindResponses.filter((r) => r.answer === "yes").length;
      const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
      const cfg = FIELD_WORKFLOW_BY_KIND[kind];
      return {
        kind,
        name: cfg.title.split(" ")[0],
        label: cfg.title,
        value: pct,
        color: SCORE_COLORS[kind],
      };
    }
  );

  const totalAnswers = responses.length;
  const passRate =
    totalAnswers > 0
      ? Math.round(
          (responses.filter((r) => r.answer === "yes").length / totalAnswers) * 100
        )
      : 0;
  const failCount = responses.filter((r) => r.answer === "no").length;

  const recentLineItems = sessions.slice(0, 8).map((s) => {
    const sessResp = responses.filter((r) => r.session_id === s.id);
    const fails = sessResp.filter((r) => r.answer === "no").length;
    const pass = fails === 0 && sessResp.length > 0;
    return {
      id: s.id,
      title: s.task_templates?.title || "Inspection",
      date: s.completed_at
        ? format(new Date(s.completed_at), "MMM d, yyyy")
        : "—",
      pass,
      score:
        sessResp.length > 0
          ? Math.round(
              (sessResp.filter((r) => r.answer === "yes").length / sessResp.length) *
                100
            )
          : 0,
    };
  });

  const summaryText =
    sessions.length === 0
      ? "No completed inspections yet. Complete a scheduled inspection, safety walk, or audit to see analytics here."
      : `Across ${sessions.length} completed inspection${sessions.length === 1 ? "" : "s"}, the overall pass rate is ${passRate}%. ${failCount > 0 ? `${failCount} item${failCount === 1 ? "" : "s"} flagged as non-compliant require follow-up.` : "No failed items were recorded in the latest period."}`;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (doc) => sanitizeDomForPdf(doc),
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`Inspection-Report-${format(now, "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded.");
    } catch (err) {
      console.error(err);
      toast.error("PDF export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Inspection report
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            History, scores, and compliance summary across all field work.
          </p>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting || sessions.length === 0}
          className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download PDF
        </Button>
      </div>

      <div
        ref={reportRef}
        className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-8"
      >
        {/* History chart */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
            History
          </h3>
          <div className="h-40 sm:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthBuckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {monthBuckets.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Donut scores */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
            Scores by workflow
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {kindScores.map((score) => (
              <div
                key={score.kind}
                className="flex flex-col items-center text-center"
              >
                <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: score.value },
                          { value: 100 - score.value },
                        ]}
                        dataKey="value"
                        innerRadius="68%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill={score.color} />
                        <Cell fill="#e4e4e7" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-xl font-bold"
                      style={{ color: score.color }}
                    >
                      {score.value}%
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold mt-2">{score.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Summary
          </h3>
          <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {summaryText}
          </p>
        </section>

        {/* Detailed scores */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
            Recent inspections
          </h3>
          <div className="mb-4">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Overall compliance</span>
              <span>{passRate}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>
          <ul className="space-y-3">
            {recentLineItems.length === 0 ? (
              <li className="text-sm text-muted-foreground py-4 text-center">
                No completed inspections yet.
              </li>
            ) : (
              recentLineItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-zinc-500">
                      {item.score}%
                    </span>
                    {item.pass ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                        <XCircle className="w-4 h-4" /> FAIL
                      </span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Start a new inspection from{" "}
        <Link href={`${basePath}/scheduled-inspection`} className="underline font-medium">
          Scheduled Inspection
        </Link>
        ,{" "}
        <Link href={`${basePath}/safety-walk`} className="underline font-medium">
          Safety Walk
        </Link>
        , or{" "}
        <Link href={`${basePath}/audits`} className="underline font-medium">
          Audits
        </Link>
        .
      </p>
    </div>
  );
}
