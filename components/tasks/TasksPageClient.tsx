"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useApp } from "../app/AppProvider";
import { supabase } from "../../lib/supabaseClient";
import { GatedFeature } from "../gated-feature";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { 
  ClipboardCheck, Play, Plus, Pencil, FileText, LayoutGrid, 
  HardHat, ShieldCheck, Eye, Trash2, MoreVertical, Bookmark, 
  MessageSquare, Paperclip, Clock, Link2, Lock, Sparkles, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ChecklistExecution from "./ChecklistExecution";
import TaskTemplateEditor from "./TaskTemplateEditor";
import TaskReports from "./TaskReports";
import { getClientCookie } from "../../lib/cookies-client";
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

interface TasksPageClientProps {
  isAdmin: boolean;
}

type ActiveView =
  | { type: "list" }
  | { type: "execute"; session: any; template: any }
  | { type: "editor"; templateId: string | null }
  | { type: "reports" };

function TasksPageContent({ isAdmin: isAdminProp }: TasksPageClientProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { org, user, membership, limits, subscription } = useApp();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"templates" | "reports">("templates");
  const [view, setView] = useState<ActiveView>({ type: "list" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  // Detect admin from cookie as well (consistent with rest of app)
  const isPlatformAdmin = !!getClientCookie("admin_id");
  const isOrgAdmin = membership?.role === "admin";
  const isDemoRole = membership?.role === "demo";
  const canManageTemplates = isPlatformAdmin || isOrgAdmin || isDemoRole || isAdminProp;

  useEffect(() => {
    if (tabParam === "reports") {
      setActiveTab("reports");
    }
  }, [tabParam]);

  useEffect(() => {
    fetchTemplates();
    fetchReportCount();
  }, [org?.id]);

  const fetchReportCount = async () => {
    if (!org?.id) return;
    try {
      let query = supabase
        .from("task_sessions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("status", "completed");
      
      if (!isPlatformAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }
      
      const { count, error } = await query;
      
      if (!error) setReportCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch report count:", err);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase.from("task_templates").select("*");
      if (org?.id) {
        query = query.or(`org_id.is.null,org_id.eq.${org.id}`);
      } else {
        query = query.is("org_id", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load task templates: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTemplate = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      if (!org?.id) throw new Error("No organization selected");
      let query = supabase
        .from("task_templates")
        .delete()
        .eq("id", deleteId)
        .eq("org_id", org.id);

      // Extra safety: only owner or platform admin can delete
      if (!isPlatformAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { error } = await query;
      
      if (error) throw error;
      
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete template: " + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStartTask = async (template: any) => {
    if (!org?.id || !user?.id) {
      toast.error("You must be logged in with an active organization to start a task.");
      return;
    }

    const { data: checklists, error: fetchErr } = await supabase
      .from("checklist_templates")
      .select("id, title")
      .eq("task_template_id", template.id)
      .eq("is_active", true)
      .limit(1);

    if (fetchErr || !checklists?.length) {
      toast.error("No active checklists found for this template.");
      return;
    }

    const checklistId = checklists[0].id;

    const { data: session, error: createErr } = await supabase
      .from("task_sessions")
      .insert({
        task_template_id: template.id,
        checklist_id: checklistId,
        org_id: org.id,
        user_id: user.id,
        status: "in_progress",
      })
      .select()
      .single();

    if (createErr) {
      console.error("DEBUG: Failed to create session", createErr);
      toast.error("Failed to start task session: " + createErr.message);
      return;
    }

    setView({ type: "execute", session, template });
  };

  const handleFinishTask = () => {
    setView({ type: "list" });
    toast.success("Task completed successfully!");
  };

  const handleGoToReports = () => {
    setView({ type: "list" });
    setActiveTab("reports");
    toast.success("Task completed successfully!");
  };

  // Route to ChecklistExecution
  if (view.type === "execute") {
    return (
      <ChecklistExecution
        session={view.session}
        template={view.template}
        onFinish={handleFinishTask}
        onCancel={() => setView({ type: "list" })}
        onGoToReports={handleGoToReports}
      />
    );
  }

  // Route to Template Editor
  if (view.type === "editor") {
    return (
      <TaskTemplateEditor
        orgId={org?.id || ""}
        templateId={view.templateId}
        onBack={() => setView({ type: "list" })}
        onSaved={() => {
          setView({ type: "list" });
          fetchTemplates();
        }}
      />
    );
  }

  // Main page
  return (
    <GatedFeature
      isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
      featureName="Work Tasks"
    >
      <div className="flex flex-col min-h-screen bg-transparent p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Work Tasks
          </h2>
          <p className="text-muted-foreground mt-1">
            Start scheduled inspections or compliance checklists.
          </p>
        </div>
        {canManageTemplates && activeTab === "templates" && (
          <Button
            onClick={() => setView({ type: "editor", templateId: null })}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Template
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "templates"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
            activeTab === "reports"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" />
          Reports
          {reportCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in">
              {reportCount}
            </span>
          )}
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {templates.map((t, index) => {
                const bgColors = [
                  "bg-[#FCE68E]", // light yellow
                  "bg-[#FAD074]", // peach/yellow
                  "bg-[#FFE9A6]", // paler yellow
                  "bg-[#FAD074]",
                ];
                const edgeColors = [
                  "bg-emerald-500",
                  "bg-violet-500",
                  "bg-orange-500",
                  "bg-blue-500",
                ];
                const bgColor = bgColors[index % bgColors.length];
                const edgeColor = edgeColors[index % edgeColors.length];
                const ownerName = t.created_by ? 'custom' : 'system';

                return (
                  <Card 
                    key={t.id} 
                    className={`${bgColor} relative overflow-hidden flex flex-col justify-between p-4 sm:p-5 rounded-[32px] border-none shadow-sm transition-all hover:shadow-md w-full group`}
                  >
                    {/* Left Edge Accent */}
                    <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${edgeColor}`}></div>
                    
                    <div className="pl-4 sm:pl-5 flex flex-col h-full">
                      {/* Top Row */}
                      <div className="flex justify-between items-start w-full mb-2">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-black/5 px-2 py-0.5 rounded-full text-black/70 cursor-default uppercase tracking-wider">
                              {ownerName === "system" ? "Global" : "Custom"}
                            </span>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {canManageTemplates ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-black/10 bg-transparent text-black">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 z-50">
                                    <DropdownMenuItem onClick={() => setView({ type: "editor", templateId: t.id })} className="cursor-pointer">
                                      <Pencil className="w-4 h-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    {t.created_by && (t.created_by === user?.id || isPlatformAdmin) && (
                                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="cursor-pointer text-destructive focus:text-destructive">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <div className="h-6 w-6"></div>
                              )}
                         </div>
                      </div>

                      {/* Title */}
                      <div className="mb-4 pr-12">
                         <h3 className="text-lg sm:text-[19px] font-bold leading-snug mb-0.5 text-black tracking-tight">{t.title}</h3>
                         <p className="text-[13px] font-medium text-black/60 line-clamp-1">{t.description || "General template"}</p>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex w-full mt-auto justify-end">
                         <div className="flex flex-col items-end gap-2">
                           <Button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleStartTask(t);
                             }}
                             className="rounded-full px-5 py-1.5 h-auto text-xs font-bold shadow-md bg-black text-white hover:bg-black/80 flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95"
                           >
                             Start
                           </Button>
                         </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No task templates available.</p>
                  {canManageTemplates && (
                    <p className="text-sm mt-1">
                      Click{" "}
                      <button
                        onClick={() => setView({ type: "editor", templateId: null })}
                        className="text-primary underline font-medium"
                      >
                        Create New Template
                      </button>{" "}
                      to add your first one.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <TaskReports
          orgId={org?.id || ""}
          userId={user?.id}
          isPlatformAdmin={isPlatformAdmin}
          onRefresh={fetchReportCount}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template and all its associated checklists. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTemplate();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </GatedFeature>
  );
}

export default function TasksPageClient(props: TasksPageClientProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading tasks dashboard...</div>}>
      <TasksPageContent {...props} />
    </Suspense>
  );
}
