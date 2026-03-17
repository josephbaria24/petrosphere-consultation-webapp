"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useApp } from "../app/AppProvider";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { ClipboardCheck, Play, Plus, Pencil, FileText, LayoutGrid, HardHat, ShieldCheck, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export default function TasksPageClient({ isAdmin: isAdminProp }: TasksPageClientProps) {
  const { org, user, membership } = useApp();
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
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", deleteId)
        .eq("org_id", org.id);
      
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

  // Route to ChecklistExecution
  if (view.type === "execute") {
    return (
      <ChecklistExecution
        session={view.session}
        template={view.template}
        onFinish={handleFinishTask}
        onCancel={() => setView({ type: "list" })}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => (
                <Card key={t.id} className="hover:shadow-lg transition-all flex flex-col overflow-hidden border-border/50 group">
                  {t.image_url ? (
                    <div className="relative h-40 w-full overflow-hidden bg-muted">
                      <Image
                        src={t.image_url}
                        alt={t.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <CardTitle className="text-white drop-shadow-sm">{t.title}</CardTitle>
                      </div>
                    </div>
                  ) : (
                    <CardHeader className="pb-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                        {t.icon === "HardHat" ? (
                          <HardHat className="w-6 h-6" />
                        ) : t.icon === "ShieldCheck" ? (
                          <ShieldCheck className="w-6 h-6" />
                        ) : t.icon === "Eye" ? (
                          <Eye className="w-6 h-6" />
                        ) : (
                          <ClipboardCheck className="w-6 h-6" />
                        )}
                      </div>
                      <CardTitle>{t.title}</CardTitle>
                    </CardHeader>
                  )}
                  <CardHeader className={`${t.image_url ? "pt-4" : "pt-0"} pb-3 flex-1`}>
                    {!t.image_url && <div className="hidden"><CardTitle>{t.title}</CardTitle></div>}
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {t.description || "Perform a standard inspection safety check."}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2 p-6 pt-0 mt-auto">
                    <Button
                      onClick={() => handleStartTask(t)}
                      className="flex-1 gap-2"
                    >
                      <Play className="w-4 h-4" /> Start
                    </Button>
                    {canManageTemplates && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setView({ type: "editor", templateId: t.id })}
                          title="Edit template"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent"
                          onClick={() => setDeleteId(t.id)}
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
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
  );
}
