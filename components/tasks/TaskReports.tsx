"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../../@/components/ui/badge";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, ExternalLink, Calendar as CalendarIcon, Filter, Image as ImageIcon, Maximize2, Trash2 } from "lucide-react";
import { format, isToday, isYesterday, isWithinInterval, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, subMonths, isAfter } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../@/components/ui/alert-dialog";
import { Input } from "../ui/input";
import { toast } from "sonner";

interface TaskReportsProps {
  orgId: string;
  userId?: string;
  isPlatformAdmin: boolean;
  onRefresh?: () => void;
}

interface Session {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  task_template_id: string;
  checklist_id: string;
  user_id: string;
  task_templates?: { title: string; icon: string };
  checklist_templates?: { title: string };
  stats?: { yes: number; no: number; n_a: number; total: number };
}

interface ResponseWithEvidence {
  id: string;
  answer: string;
  notes: string | null;
  answered_at: string;
  item_id: string;
  checklist_items?: { text: string; order_index: number };
  task_evidence?: { file_url: string; file_name: string; file_type: string }[];
  stats?: { yes: number; no: number; n_a: number; total: number };
}

type DateFilter = "all" | "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month";

export default function TaskReports({ orgId, userId, isPlatformAdmin, onRefresh }: TaskReportsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetails, setSessionDetails] = useState<ResponseWithEvidence[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Session | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [orgId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      if (!orgId) {
        setSessions([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("task_sessions")
        .select("*, task_templates(title, icon), checklist_templates(title)")
        .eq("status", "completed")
        .eq("org_id", orgId);

      if (!isPlatformAdmin && userId) {
        query = query.eq("user_id", userId);
      }

      query = query.order("completed_at", { ascending: false });

      const { data: sessionData, error } = await query;
      if (error) throw error;

      if (sessionData && sessionData.length > 0) {
        // Fetch answer counts for these sessions
        const sessionIds = sessionData.map(s => s.id);
        const { data: responseData, error: respErr } = await supabase
          .from("task_responses")
          .select("session_id, answer")
          .in("session_id", sessionIds);

        if (!respErr && responseData) {
          const statsMap: Record<string, any> = {};
          responseData.forEach(r => {
            if (!statsMap[r.session_id]) {
              statsMap[r.session_id] = { yes: 0, no: 0, n_a: 0, total: 0 };
            }
            statsMap[r.session_id].total++;
            if (r.answer === "yes") statsMap[r.session_id].yes++;
            else if (r.answer === "no") statsMap[r.session_id].no++;
            else statsMap[r.session_id].n_a++;
          });

          const enrichedSessions = sessionData.map(s => ({
            ...s,
            stats: statsMap[s.id] || { yes: 0, no: 0, n_a: 0, total: 0 }
          }));
          setSessions(enrichedSessions);
        } else {
          setSessions(sessionData);
        }
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (session: Session) => {
    setSelectedSession(session);
    setDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_responses")
        .select("*, checklist_items(text, order_index), task_evidence(file_url, file_name, file_type)")
        .eq("session_id", session.id)
        .order("answered_at", { ascending: true });

      if (error) throw error;
      setSessionDetails(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    if (deleteConfirmation !== "delete this report") {
      toast.error("Please type the confirmation message exactly.");
      return;
    }

    setIsDeleting(true);
    try {
      // Deleting the session should cascade to responses and evidence if RLS/Foreign Keys are set correctly
      // But we'll do it explicitly if needed. Most Supabase setups use cascade.
      const { error } = await supabase
        .from("task_sessions")
        .delete()
        .eq("id", reportToDelete.id)
        .eq("org_id", orgId);

      if (error) throw error;

      toast.success("Report deleted successfully");
      setSessions(sessions.filter(s => s.id !== reportToDelete.id));
      if (selectedSession?.id === reportToDelete.id) {
        setSelectedSession(null);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete report: " + err.message);
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
      setDeleteConfirmation("");
    }
  };

  // Detail view
  if (selectedSession) {
    const yesCount = sessionDetails.filter((r) => r.answer === "yes").length;
    const noCount = sessionDetails.filter((r) => r.answer === "no").length;
    const naCount = sessionDetails.filter((r) => r.answer === "n_a").length;

  const chartData = [
    { name: "Yes", value: yesCount, color: "#22c55e" },
    { name: "No", value: noCount, color: "#ef4444" },
    { name: "N/A", value: naCount, color: "#94a3b8" },
  ];

    return (
      <>
        <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setSelectedSession(null)} className="gap-2 h-8 px-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">
              {selectedSession.task_templates?.title || "Report"}
            </h3>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              {selectedSession.completed_at
                ? format(new Date(selectedSession.completed_at), "PPPP 'at' p")
                : "Unknown date"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border/50 h-8 gap-2"
            onClick={() => setReportToDelete(selectedSession)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>

        {/* Improved Summary Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1 border-border/50 bg-muted/20">
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[160px]">
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.filter(d => d.value > 0)}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground mt-[-10px]">COMPLIANCE</p>
            </CardContent>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Yes</p>
                  <p className="text-3xl font-black text-green-600 leading-none mt-1">{yesCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">No</p>
                  <p className="text-3xl font-black text-red-600 leading-none mt-1">{noCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                  <XCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-muted/10">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">N/A</p>
                  <p className="text-3xl font-black text-muted-foreground leading-none mt-1">{naCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <span className="text-xs font-bold">N/A</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {detailLoading ? (
          <div className="text-center text-muted-foreground py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            Loading compliance data...
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" />
              Checklist Items
            </h4>
            <div className="grid gap-3">
              {sessionDetails.map((r, idx) => (
                <Card key={r.id} className="border-border/30 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      <div className={`w-1.5 ${
                        r.answer === "yes" ? "bg-green-500" : r.answer === "no" ? "bg-red-500" : "bg-slate-300"
                      }`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded mb-2 inline-block">
                              ITEM #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {r.checklist_items?.text || "Unknown question"}
                            </p>
                            {r.notes && (
                              <div className="mt-3 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-md border border-blue-100/50 dark:border-blue-900/20">
                                <p className="text-xs italic text-blue-900/80 dark:text-blue-200">
                                  <span className="font-semibold not-italic">Notes:</span> {r.notes}
                                </p>
                              </div>
                            )}
                          </div>
                          <Badge
                            className={`flex-shrink-0 text-[10px] font-black h-6 px-3 ${
                              r.answer === "yes"
                                ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                                : r.answer === "no"
                                ? "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200"
                            }`}
                            variant="outline"
                          >
                            {r.answer.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Image Previews */}
                        {r.task_evidence && r.task_evidence.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                              <ImageIcon className="w-3 h-3" />
                              Captured Evidence
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {r.task_evidence.map((ev, ei) => (
                                <Dialog key={ei}>
                                  <DialogTrigger asChild>
                                    <div className="relative group w-20 h-20 rounded-md overflow-hidden border border-border cursor-pointer hover:border-primary transition-colors">
                                      <Image
                                        src={ev.file_url}
                                        alt={ev.file_name || "Evidence"}
                                        fill
                                        className="object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none">
                                    <div className="relative aspect-auto max-h-[80vh] flex items-center justify-center">
                                      <img
                                        src={ev.file_url}
                                        alt={ev.file_name}
                                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white backdrop-blur-sm">
                                        <p className="text-sm font-medium">{ev.file_name}</p>
                                        <p className="text-xs text-white/70">{r.checklist_items?.text}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog (Detail View) */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => {
        if (!open) {
          setReportToDelete(null);
          setDeleteConfirmation("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report
              and all associated media evidence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <p className="text-sm font-medium">To confirm, type <span className="font-bold text-foreground">delete this report</span> below:</p>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type confirmation here"
              className="border-destructive/30 focus-visible:ring-destructive"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteReport();
              }}
              disabled={deleteConfirmation !== "delete this report" || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // List view
  const filteredSessions = sessions.filter(s => {
    if (dateFilter === "all") return true;
    if (!s.completed_at) return false;
    const date = new Date(s.completed_at);
    const now = new Date();
    
    switch (dateFilter) {
      case "today":
        return isToday(date);
      case "yesterday":
        return isYesterday(date);
      case "this_week":
        return isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
      case "last_week":
        const lwStart = startOfWeek(subDays(now, 7));
        const lwEnd = endOfWeek(subDays(now, 7));
        return isWithinInterval(date, { start: lwStart, end: lwEnd });
      case "this_month":
        return isWithinInterval(date, { start: startOfMonth(now), end: now });
      case "last_month":
        const lmStart = startOfMonth(subMonths(now, 1));
        const lmEnd = startOfMonth(now);
        return isAfter(date, lmStart) && !isAfter(date, lmEnd);
      default:
        return true;
    }
  });

  const groupedSessions: Record<string, Session[]> = filteredSessions.reduce((acc, s) => {
    if (!s.completed_at) return acc;
    const date = new Date(s.completed_at);
    let group = "Older";
    
    if (isToday(date)) group = "Today";
    else if (isYesterday(date)) group = "Yesterday";
    else if (isWithinInterval(date, { start: startOfWeek(new Date()), end: endOfWeek(new Date()) })) group = "This Week";
    else if (isWithinInterval(date, { start: startOfWeek(subDays(new Date(), 7)), end: endOfWeek(subDays(new Date(), 7)) })) group = "Last Week";
    else group = format(date, "MMMM yyyy");

    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {} as Record<string, Session[]>);

  const groupOrder = ["Today", "Yesterday", "This Week", "Last Week"];

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading reports...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No completed inspections yet.</p>
        <p className="text-sm">Complete a task to see reports here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4 text-muted-foreground" />
          Filter by Date
        </div>
        <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
          <SelectTrigger className="w-[180px] h-9 bg-background">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="last_week">Last Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reports found for this period.</p>
          <button onClick={() => setDateFilter("all")} className="text-primary text-sm hover:underline mt-2">
            Show all reports
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSessions)
            .sort((a, b) => {
              const idxA = groupOrder.indexOf(a[0]);
              const idxB = groupOrder.indexOf(b[0]);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            })
            .map(([group, groupSessions]) => (
              <div key={group} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-1">
                  {group}
                </h4>
                <div className="space-y-2">
                  {groupSessions.map((s) => (
                    <Card
                      key={s.id}
                      className="hover:shadow-md transition-all cursor-pointer border-border/50 group overflow-hidden"
                      onClick={() => fetchSessionDetails(s)}
                    >
                      <CardContent className="p-0 flex items-center h-16">
                        <div className="w-1 bg-primary/20 h-full group-hover:bg-primary transition-colors" />
                        <div className="flex-1 flex items-center gap-4 px-4 py-2">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {s.task_templates?.title || "Unknown Template"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {s.checklist_templates?.title || "Standard Checklist"} · {s.completed_at ? format(new Date(s.completed_at), "p") : ""}
                            </p>
                          </div>
                          
                          {/* Mini Stats Chart */}
                          {s.stats && (
                            <div className="hidden sm:flex items-center gap-2 w-24 flex-shrink-0">
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full bg-green-500" 
                                  style={{ width: `${(s.stats.yes / s.stats.total) * 100}%` }} 
                                  title={`Yes: ${s.stats.yes}`}
                                />
                                <div 
                                  className="h-full bg-red-500" 
                                  style={{ width: `${(s.stats.no / s.stats.total) * 100}%` }} 
                                  title={`No: ${s.stats.no}`}
                                />
                                <div 
                                  className="h-full bg-muted-foreground/30" 
                                  style={{ width: `${(s.stats.n_a / s.stats.total) * 100}%` }} 
                                  title={`N/A: ${s.stats.n_a}`}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {Math.round((s.stats.yes / s.stats.total) * 100)}%
                              </span>
                            </div>
                          )}

                          <Badge variant="outline" className="hidden xs:flex text-green-600 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/30 text-[10px] py-0 h-5">
                            PASSED
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportToDelete(s);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog (List View) */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => {
        if (!open) {
          setReportToDelete(null);
          setDeleteConfirmation("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report
              and all associated media evidence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <p className="text-sm font-medium">To confirm, type <span className="font-bold text-foreground">delete this report</span> below:</p>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type confirmation here"
              className="border-destructive/30 focus-visible:ring-destructive"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteReport();
              }}
              disabled={deleteConfirmation !== "delete this report" || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }
