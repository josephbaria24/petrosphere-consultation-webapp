"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../../@/components/ui/badge";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, ExternalLink, Calendar as CalendarIcon, Filter, Image as ImageIcon, Maximize2, Trash2, MoreVertical, FileDown, Edit2, MapPin } from "lucide-react";
import { Map, MapTileLayer, MapMarker, MapPopup } from "../ui/map";
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
import { sanitizeDomForPdf } from "../../lib/export-utils";

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
  task_evidence?: { file_url: string; file_name: string; file_type: string; latitude?: number; longitude?: number }[];
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
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteValue, setEditNoteValue] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

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
        .select("*, checklist_items(text, order_index), task_evidence(file_url, file_name, file_type, latitude, longitude)")
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
  
  const handleExportPDF = async () => {
    if (!reportRef.current || !selectedSession) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeDomForPdf(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const totalPdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, totalPdfHeight);
      pdf.save(`Report-${selectedSession.task_templates?.title || "Task"}-${format(new Date(selectedSession.completed_at || ""), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF generated successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveNote = async (responseId: string) => {
    setSavingNoteId(responseId);
    try {
      const { error } = await supabase
        .from("task_responses")
        .update({ notes: editNoteValue })
        .eq("id", responseId);

      if (error) throw error;

      // Update local state
      setSessionDetails(prev => prev.map(r => 
        r.id === responseId ? { ...r, notes: editNoteValue } : r
      ));
      toast.success("Note updated");
      setEditingNoteId(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update note: " + err.message);
    } finally {
      setSavingNoteId(null);
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting} className="gap-2">
                <FileDown className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Export as PDF"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setReportToDelete(selectedSession)} 
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div ref={reportRef} className="space-y-6">

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
            <div className="grid gap-4 sm:grid-cols-2">
              {sessionDetails.map((r, idx) => {
                const hasImages = r.task_evidence && r.task_evidence.length > 0;
                const isEditingThis = editingNoteId === r.id;

                return (
                  <Card key={r.id} className="border-border/30 shadow-sm overflow-hidden flex flex-col group">
                    {/* Large Image Section */}
                    {hasImages && r.task_evidence && (
                      <div className="relative w-full aspect-square border-b border-border/10 bg-muted/50 overflow-hidden">
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="w-full h-full cursor-pointer relative">
                              <Image 
                                src={r.task_evidence[0].file_url} 
                                alt={r.task_evidence[0].file_name || "Evidence"} 
                                fill 
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                 <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md scale-75 group-hover:scale-100 transition-all duration-300" />
                              </div>
                              {r.task_evidence.length > 1 && (
                                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm font-medium border border-white/20 shadow-xl">
                                  + {r.task_evidence.length - 1} more
                                </div>
                              )}
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
                            <DialogTitle className="sr-only">Evidence Images</DialogTitle>
                            <div className="flex flex-col gap-6 max-h-[90vh] overflow-y-auto pb-4 custom-scrollbar items-center">
                              {r.task_evidence.map((ev, ei) => (
                                <div key={ei} className="relative aspect-auto bg-black/80 rounded-xl overflow-hidden flex flex-col items-center justify-center w-full max-w-3xl border border-white/10 shadow-2xl">
                                  <img
                                    src={ev.file_url}
                                    alt={ev.file_name}
                                    className="max-w-full max-h-[85vh] object-contain"
                                  />
                                  <div className="w-full bg-gradient-to-t from-black/90 to-transparent p-6 text-white absolute bottom-0 left-0">
                                    <p className="text-sm font-medium drop-shadow-lg">{ev.file_name}</p>
                                    <p className="text-xs text-white/80 drop-shadow-lg">{r.checklist_items?.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded mb-2 inline-block">
                            ITEM #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <p className="text-[15px] font-semibold text-foreground leading-snug">
                            {r.checklist_items?.text || "Unknown question"}
                          </p>
                        </div>
                        <Badge
                          className={`flex-shrink-0 text-[10px] font-black h-6 px-3 ${
                            r.answer === "yes"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : r.answer === "no"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                          variant="outline"
                        >
                          {r.answer.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex-1" />

                      {/* Location Map */}
                      {hasImages && r.task_evidence && r.task_evidence.some(ev => ev.latitude && ev.longitude) && (() => {
                        const locatedEvidence = r.task_evidence!.find(ev => ev.latitude && ev.longitude);
                        if (!locatedEvidence || !locatedEvidence.latitude || !locatedEvidence.longitude) return null;
                        return (
                          <div className="mt-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                              <MapPin className="w-3 h-3" /> Pinned Location
                            </p>
                            <div className="rounded-lg overflow-hidden border border-border/30 shadow-sm">
                              <div className="h-[150px] w-full">
                                <Map center={[locatedEvidence.latitude, locatedEvidence.longitude]} zoom={15} className="h-full w-full rounded-none min-h-0">
                                  <MapTileLayer />
                                  <MapMarker position={[locatedEvidence.latitude, locatedEvidence.longitude]}>
                                    <MapPopup>
                                      <p className="text-xs font-semibold">{r.checklist_items?.text}</p>
                                      <p className="text-[10px] text-muted-foreground">{locatedEvidence.latitude.toFixed(6)}, {locatedEvidence.longitude.toFixed(6)}</p>
                                    </MapPopup>
                                  </MapMarker>
                                </Map>
                              </div>
                              <div className="bg-muted/50 px-3 py-1.5 text-[10px] text-muted-foreground font-mono">
                                {locatedEvidence.latitude.toFixed(6)}, {locatedEvidence.longitude.toFixed(6)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Editable Note Section */}
                      <div className="mt-4 pt-4 border-t border-border/40">
                         {isEditingThis ? (
                           <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 block">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Edit Note</span>
                             </div>
                             <textarea 
                               value={editNoteValue}
                               onChange={(e) => setEditNoteValue(e.target.value)}
                               className="w-full text-sm p-3 rounded-lg border-2 border-primary/20 bg-primary/5 min-h-[100px] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-y transition-all"
                               placeholder="Add a detailed note..."
                               autoFocus
                             />
                             <div className="flex items-center justify-end gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(null)} disabled={savingNoteId === r.id} className="text-muted-foreground hover:text-foreground">
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleSaveNote(r.id)} disabled={savingNoteId === r.id} className="shadow-md">
                                  {savingNoteId === r.id ? "Saving..." : "Save Note"}
                                </Button>
                             </div>
                           </div>
                         ) : (
                           <div 
                             className="group/note relative bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 p-3.5 rounded-lg border border-transparent hover:border-blue-200/50 dark:hover:border-blue-800/50 transition-all cursor-text min-h-[70px]"
                             onClick={() => {
                               setEditingNoteId(r.id);
                               setEditNoteValue(r.notes || "");
                             }}
                           >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-blue-900/50 dark:text-blue-200/50 uppercase tracking-widest block">Note</span>
                                <Edit2 className="w-3.5 h-3.5 text-blue-900/40 opacity-0 group-hover/note:opacity-100 transition-opacity drop-shadow-sm" />
                              </div>
                              <p className="text-sm text-blue-950/90 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
                                {r.notes || <span className="text-blue-900/40 italic">Click to add a note...</span>}
                              </p>
                           </div>
                         )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        </div>
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
