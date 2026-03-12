"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../../@/components/ui/badge";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface TaskReportsProps {
  orgId: string;
  userId?: string;
  isPlatformAdmin: boolean;
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
}

interface ResponseWithEvidence {
  id: string;
  answer: string;
  notes: string | null;
  answered_at: string;
  item_id: string;
  checklist_items?: { text: string; order_index: number };
  task_evidence?: { file_url: string; file_name: string; file_type: string }[];
}

export default function TaskReports({ orgId, userId, isPlatformAdmin }: TaskReportsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetails, setSessionDetails] = useState<ResponseWithEvidence[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [orgId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("task_sessions")
        .select("*, task_templates(title, icon), checklist_templates(title)")
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (!isPlatformAdmin && orgId) {
        query = query.eq("org_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data || []);
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

  // Detail view
  if (selectedSession) {
    const yesCount = sessionDetails.filter((r) => r.answer === "yes").length;
    const noCount = sessionDetails.filter((r) => r.answer === "no").length;
    const naCount = sessionDetails.filter((r) => r.answer === "n_a").length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setSelectedSession(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> All Reports
          </Button>
          <div>
            <h3 className="font-semibold">
              {selectedSession.task_templates?.title || "Report"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedSession.completed_at
                ? format(new Date(selectedSession.completed_at), "PPpp")
                : "Unknown date"}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{yesCount}</p>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Yes</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{noCount}</p>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">No</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{naCount}</p>
              <p className="text-xs text-muted-foreground font-medium">N/A</p>
            </CardContent>
          </Card>
        </div>

        {detailLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading responses...</div>
        ) : (
          <div className="space-y-3">
            {sessionDetails.map((r, idx) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        r.answer === "yes"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                          : r.answer === "no"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      {r.answer === "yes" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : r.answer === "no" ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-[10px] font-bold">N/A</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {idx + 1}. {r.checklist_items?.text || "Unknown question"}
                      </p>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground mt-1">📝 {r.notes}</p>
                      )}
                      {/* Evidence */}
                      {r.task_evidence && r.task_evidence.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.task_evidence.map((ev, ei) => (
                            <a
                              key={ei}
                              href={ev.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {ev.file_name || "Evidence"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] flex-shrink-0 ${
                        r.answer === "yes"
                          ? "border-green-400 text-green-600"
                          : r.answer === "no"
                          ? "border-red-400 text-red-600"
                          : "border-gray-300 text-gray-500"
                      }`}
                    >
                      {r.answer.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view
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
    <div className="space-y-3">
      {sessions.map((s) => {
        const date = s.completed_at
          ? format(new Date(s.completed_at), "PP")
          : s.started_at
          ? format(new Date(s.started_at), "PP")
          : "—";

        return (
          <Card
            key={s.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => fetchSessionDetails(s)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {s.task_templates?.title || "Unknown Template"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.checklist_templates?.title || ""} · {date}
                </p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-400 flex-shrink-0">
                Completed
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
