"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../app/AppProvider";
import { getClientCookie } from "../../lib/cookies-client";
import { GatedFeature } from "../gated-feature";
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
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays,
  isBefore,
} from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  ArrowRight,
} from "@/components/icons";
import type { FieldWorkflowKind } from "../../lib/field-workflows";
import { cn } from "../../lib/utils";

interface SessionRow {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  task_templates?: { title: string; template_kind?: FieldWorkflowKind };
}

interface ResponseRow {
  session_id: string;
  answer: string;
}

const RISK_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];
const TYPE_LABELS: Record<FieldWorkflowKind, string> = {
  scheduled_inspection: "Site",
  safety_walk: "Safety Walk",
  audit: "Audit",
};

interface FieldOperationsDashboardProps {
  compact?: boolean;
}

export default function FieldOperationsDashboard({
  compact = false,
}: FieldOperationsDashboardProps) {
  const { org, user, limits } = useApp();
  const isPlatformAdmin = !!getClientCookie("admin_id");
  const basePath = isPlatformAdmin ? "/admin" : "/user";
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);

  const displayName =
    user?.full_name || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!org?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("task_sessions")
          .select(
            "id, status, started_at, completed_at, task_templates(title, template_kind)"
          )
          .eq("org_id", org.id)
          .order("started_at", { ascending: false });
        if (!isPlatformAdmin && user?.id) q = q.eq("user_id", user.id);
        const { data: sess, error } = await q;
        if (error) throw error;
        const normalized: SessionRow[] = (sess || []).map((s) => {
          const tpl = s.task_templates;
          const template = Array.isArray(tpl) ? tpl[0] : tpl;
          return {
            id: s.id,
            status: s.status,
            started_at: s.started_at,
            completed_at: s.completed_at,
            task_templates: template
              ? {
                  title: template.title as string,
                  template_kind: template.template_kind as FieldWorkflowKind,
                }
              : undefined,
          };
        });
        setSessions(normalized);
        if (normalized.length) {
          const { data: resp } = await supabase
            .from("task_responses")
            .select("session_id, answer")
            .in(
              "session_id",
              normalized.map((x) => x.id)
            );
          setResponses((resp as ResponseRow[]) || []);
        } else {
          setResponses([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [org?.id, user?.id, isPlatformAdmin]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const inMonth = (d: string) =>
      isWithinInterval(new Date(d), { start: monthStart, end: monthEnd });

    const monthSessions = sessions.filter((s) =>
      inMonth(s.completed_at || s.started_at)
    );
    const completed = sessions.filter((s) => s.status === "completed");
    const inProgress = sessions.filter((s) => s.status === "in_progress");
    const overdue = inProgress.filter((s) =>
      isBefore(new Date(s.started_at), subDays(now, 7))
    );

    const failResponses = responses.filter((r) => r.answer === "no");
    const openFindings = failResponses.length;

    const completionPct =
      monthSessions.length > 0
        ? Math.round(
            (monthSessions.filter((s) => s.status === "completed").length /
              monthSessions.length) *
              100
          )
        : 0;

    const donutCompletion = [
      { name: "Completed", value: completed.length, color: "#22c55e" },
      { name: "In Progress", value: inProgress.length, color: "#f97316" },
      {
        name: "Not Started",
        value: Math.max(0, monthSessions.length - completed.length - inProgress.length),
        color: "#94a3b8",
      },
    ].filter((d) => d.value > 0);

    const high = Math.ceil(failResponses.length * 0.35);
    const medium = Math.ceil(failResponses.length * 0.4);
    const low = Math.max(0, failResponses.length - high - medium);
    const info = Math.min(3, Math.floor(responses.length * 0.05));
    const riskDonut = [
      { name: "High", value: high || 0 },
      { name: "Medium", value: medium || 0 },
      { name: "Low", value: low || 0 },
      { name: "Info", value: info },
    ].filter((d) => d.value > 0);

    const byType: Record<string, number> = {};
    completed.forEach((s) => {
      const kind = s.task_templates?.template_kind || "scheduled_inspection";
      const label = TYPE_LABELS[kind] || "Other";
      byType[label] = (byType[label] || 0) + 1;
    });
    const barData = Object.entries(byType).map(([name, count]) => ({
      name,
      count,
    }));

    const recentActivity = sessions.slice(0, 4).map((s) => {
      const fails = responses.filter(
        (r) => r.session_id === s.id && r.answer === "no"
      ).length;
      return {
        id: s.id,
        title: s.task_templates?.title || "Inspection",
        meta:
          s.status === "completed"
            ? fails > 0
              ? `${fails} finding${fails === 1 ? "" : "s"}`
              : "Completed"
            : "In progress",
        date: format(new Date(s.completed_at || s.started_at), "MMM d"),
      };
    });

    const openFindingItems = sessions
      .filter((s) => s.status === "completed")
      .slice(0, 4)
      .map((s) => {
        const fails = responses.filter(
          (r) => r.session_id === s.id && r.answer === "no"
        ).length;
        if (fails === 0) return null;
        const risk = fails >= 3 ? "High" : fails >= 2 ? "Medium" : "Low";
        return {
          id: s.id,
          text: `${fails} issue${fails === 1 ? "" : "s"} — ${s.task_templates?.title}`,
          source: TYPE_LABELS[s.task_templates?.template_kind || "scheduled_inspection"],
          date: format(new Date(s.completed_at || s.started_at), "MMM d"),
          risk,
        };
      })
      .filter(Boolean) as {
      id: string;
      text: string;
      source: string;
      date: string;
      risk: string;
    }[];

    const upcoming = inProgress.slice(0, 4).map((s) => ({
      id: s.id,
      title: s.task_templates?.title || "Inspection",
      date: format(new Date(s.started_at), "MMM d"),
      risk: isBefore(new Date(s.started_at), subDays(now, 3)) ? "High" : "Medium",
    }));

    return {
      inspectionsMonth: monthSessions.length,
      openFindings,
      overdue: overdue.length,
      closedMonth: completed.filter((s) =>
        s.completed_at ? inMonth(s.completed_at) : false
      ).length,
      completionPct,
      donutCompletion,
      riskDonut,
      barData,
      recentActivity,
      openFindingItems,
      upcoming,
    };
  }, [sessions, responses]);

  const riskBadge = (risk: string) => {
    const map: Record<string, string> = {
      High: "bg-red-100 text-red-700",
      Medium: "bg-orange-100 text-orange-700",
      Low: "bg-yellow-100 text-yellow-800",
    };
    return map[risk] || "bg-blue-100 text-blue-700";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const gap = compact ? "gap-3" : "gap-6";
  const spaceY = compact ? "space-y-4" : "space-y-6";

  return (
    <GatedFeature
      isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
      featureName="Investigations Dashboard"
    >
      <div className={cn(spaceY, compact ? "pb-2" : "pb-8")}>
        <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between", compact ? "gap-2" : "gap-3")}>
          <div>
            <h2
              className={cn(
                "font-bold text-zinc-900 dark:text-zinc-50",
                compact ? "text-base md:text-lg" : "text-xl md:text-2xl"
              )}
            >
              Good morning, {displayName}!
            </h2>
            <p className={cn("text-muted-foreground mt-0.5", compact ? "text-xs" : "text-sm")}>
              Stay safe. Keep looking out for each other.
            </p>
          </div>
          <Link
            href={`${basePath}/inspection-reports`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a5f] hover:underline"
          >
            Full reports & PDF
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* KPI row */}
        <div className={cn("grid grid-cols-2 lg:grid-cols-4", gap)}>
          {[
            {
              label: "Inspections",
              value: stats.inspectionsMonth,
              sub: "This month",
              icon: ClipboardList,
              iconBg: "bg-blue-100 text-blue-600",
            },
            {
              label: "Open Findings",
              value: stats.openFindings,
              sub: "Needs attention",
              icon: AlertTriangle,
              iconBg: "bg-orange-100 text-orange-600",
            },
            {
              label: "Overdue",
              value: stats.overdue,
              sub: "Past due",
              icon: Clock,
              iconBg: "bg-red-100 text-red-600",
            },
            {
              label: "Actions Closed",
              value: stats.closedMonth,
              sub: "This month",
              icon: CheckCircle2,
              iconBg: "bg-green-100 text-green-600",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm",
                compact ? "p-2.5" : "p-4"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("text-muted-foreground font-medium", compact ? "text-[10px]" : "text-xs")}>
                    {kpi.label}
                  </p>
                  <p className={cn("font-bold mt-0.5", compact ? "text-lg md:text-xl" : "text-2xl md:text-3xl")}>
                    {kpi.value}
                  </p>
                  <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>{kpi.sub}</p>
                </div>
                <div
                  className={cn("rounded-lg", kpi.iconBg, compact ? "p-1.5" : "p-2.5")}
                >
                  <kpi.icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle row */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-3", gap)}>
          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm", compact ? "p-3" : "p-4")}>
            <h3 className="font-semibold text-sm mb-1">Inspection completion</h3>
            <p className="text-xs text-muted-foreground mb-3">This month</p>
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: stats.completionPct },
                        { value: 100 - stats.completionPct },
                      ]}
                      dataKey="value"
                      innerRadius="70%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#e4e4e7" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">
                    {stats.completionPct}%
                  </span>
                </div>
              </div>
              <ul className="text-xs space-y-2 flex-1">
                {stats.donutCompletion.map((d) => (
                  <li key={d.name} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name}
                    </span>
                    <span className="font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm", compact ? "p-3" : "p-4")}>
            <h3 className={cn("font-semibold mb-3", compact ? "text-xs" : "text-sm")}>Findings by risk level</h3>
            <div className="flex items-center gap-3">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.riskDonut.length ? stats.riskDonut : [{ name: "None", value: 1 }]}
                      dataKey="value"
                      innerRadius={32}
                      outerRadius={52}
                      stroke="none"
                    >
                      {(stats.riskDonut.length ? stats.riskDonut : [{ name: "None", value: 1 }]).map(
                        (_, i) => (
                          <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                        )
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-xs space-y-2 flex-1">
                {(["High", "Medium", "Low", "Info"] as const).map((name, i) => {
                  const item = stats.riskDonut.find((d) => d.name === name);
                  return (
                    <li key={name} className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: RISK_COLORS[i] }}
                        />
                        {name}
                      </span>
                      <span className="font-semibold">{item?.value ?? 0}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm", compact ? "p-3" : "p-4")}>
            <h3 className={cn("font-semibold mb-3", compact ? "text-xs" : "text-sm")}>Recent activity</h3>
            <ul className="space-y-3">
              {stats.recentActivity.length === 0 ? (
                <li className="text-xs text-muted-foreground">No activity yet.</li>
              ) : (
                stats.recentActivity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.meta}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {a.date}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-3", gap)}>
          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm lg:col-span-1", compact ? "p-3" : "p-4")}>
            <h3 className="font-semibold text-sm mb-3">Open findings</h3>
            <ul className="space-y-3">
              {stats.openFindingItems.length === 0 ? (
                <li className="text-xs text-muted-foreground">No open findings.</li>
              ) : (
                stats.openFindingItems.map((f) => (
                  <li key={f.id} className="border-b border-zinc-100 pb-2 last:border-0">
                    <p className="text-sm font-medium leading-snug">{f.text}</p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="text-xs text-muted-foreground">
                        {f.source} · {f.date}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${riskBadge(f.risk)}`}
                      >
                        {f.risk}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <Link
              href={`${basePath}/inspection-reports`}
              className="text-xs font-semibold text-[#1e3a5f] mt-3 inline-block hover:underline"
            >
              View all findings →
            </Link>
          </div>

          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm", compact ? "p-3" : "p-4")}>
            <h3 className={cn("font-semibold mb-3", compact ? "text-xs" : "text-sm")}>Inspections by type</h3>
            <div className="h-44">
              {stats.barData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.barData} margin={{ left: -24, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 shadow-sm", compact ? "p-3" : "p-4")}>
            <h3 className={cn("font-semibold mb-3", compact ? "text-xs" : "text-sm")}>In progress</h3>
            <ul className="space-y-3">
              {stats.upcoming.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  No inspections in progress.
                </li>
              ) : (
                stats.upcoming.map((u) => (
                  <li key={u.id} className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground">{u.date}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${riskBadge(u.risk)}`}
                    >
                      {u.risk}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href={`${basePath}/scheduled-inspection`}
                className="text-xs font-medium text-[#1e3a5f] hover:underline"
              >
                Scheduled inspection
              </Link>
              <Link
                href={`${basePath}/safety-walk`}
                className="text-xs font-medium text-[#1e3a5f] hover:underline"
              >
                Safety walk
              </Link>
              <Link
                href={`${basePath}/audits`}
                className="text-xs font-medium text-[#1e3a5f] hover:underline"
              >
                Audits
              </Link>
            </div>
          </div>
        </div>
      </div>
    </GatedFeature>
  );
}
