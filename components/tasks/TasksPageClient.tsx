"use client";

import { useState, useEffect, Suspense } from "react";
import { useApp } from "../app/AppProvider";
import { supabase } from "../../lib/supabaseClient";
import { GatedFeature } from "../gated-feature";
import { Button } from "../ui/button";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Play,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import PremisesInspectionForm from "./PremisesInspectionForm";
import TaskTemplateEditor from "./TaskTemplateEditor";
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
import {
  FIELD_WORKFLOW_BY_KIND,
  type FieldWorkflowKind,
} from "../../lib/field-workflows";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface TasksPageClientProps {
  isAdmin: boolean;
  workflowKind: FieldWorkflowKind;
}

type ActiveView =
  | { type: "setup" }
  | { type: "execute"; session: { id: string; checklist_id: string; org_id: string }; template: { title: string; description?: string } }
  | { type: "editor"; templateId: string | null };

function TasksPageContent({
  isAdmin: isAdminProp,
  workflowKind,
}: TasksPageClientProps) {
  const workflow = FIELD_WORKFLOW_BY_KIND[workflowKind];
  const { org, user, membership, limits } = useApp();
  const [templates, setTemplates] = useState<
    { id: string; title: string; description?: string }[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ActiveView>({ type: "setup" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  const isPlatformAdmin = !!getClientCookie("admin_id");
  const basePath = isAdminProp || isPlatformAdmin ? "/admin" : "/user";
  const isOrgAdmin = membership?.role === "admin";
  const isDemoRole = membership?.role === "demo";
  const canManageTemplates =
    isPlatformAdmin || isOrgAdmin || isDemoRole || isAdminProp;

  useEffect(() => {
    fetchTemplates();
  }, [org?.id, workflowKind]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("task_templates")
        .select("id, title, description")
        .eq("template_kind", workflowKind);
      if (org?.id) {
        query = query.or(`org_id.is.null,org_id.eq.${org.id}`);
      } else {
        query = query.is("org_id", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = data || [];
      setTemplates(list);
      if (list.length) {
        setSelectedTemplateId((prev) => prev || list[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Load failed";
      toast.error("Failed to load templates: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteId || !org?.id) return;
    setIsDeleting(true);
    try {
      let query = supabase
        .from("task_templates")
        .delete()
        .eq("id", deleteId)
        .eq("org_id", org.id);
      if (!isPlatformAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }
      const { error } = await query;
      if (error) throw error;
      toast.success("Template deleted.");
      fetchTemplates();
      if (selectedTemplateId === deleteId) setSelectedTemplateId("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStartInspection = async () => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      toast.error("Select a template first.");
      return;
    }
    if (!org?.id || !user?.id) {
      toast.error("Sign in with an active organization.");
      return;
    }
    setStarting(true);
    try {
      const { data: checklists, error: fetchErr } = await supabase
        .from("checklist_templates")
        .select("id")
        .eq("task_template_id", template.id)
        .eq("is_active", true)
        .limit(1);
      if (fetchErr || !checklists?.length) {
        toast.error("No active checklist for this template.");
        return;
      }
      const { data: session, error: createErr } = await supabase
        .from("task_sessions")
        .insert({
          task_template_id: template.id,
          checklist_id: checklists[0].id,
          org_id: org.id,
          user_id: user.id,
          status: "in_progress",
        })
        .select()
        .single();
      if (createErr) throw createErr;
      setView({
        type: "execute",
        session,
        template,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start";
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (
      !autoStarted &&
      !loading &&
      templates.length === 1 &&
      selectedTemplateId &&
      org?.id &&
      user?.id &&
      view.type === "setup"
    ) {
      setAutoStarted(true);
      handleStartInspection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoStarted,
    loading,
    templates.length,
    selectedTemplateId,
    org?.id,
    user?.id,
    view.type,
  ]);

  if (view.type === "execute") {
    return (
      <GatedFeature
        isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
        featureName={workflow.gatedFeatureName}
      >
        <div className="p-3 sm:p-6 max-w-3xl mx-auto w-full">
          <PremisesInspectionForm
            session={view.session}
            template={view.template}
            workflow={workflow}
            reportsHref={`${basePath}/inspection-reports`}
            onFinish={() => setView({ type: "setup" })}
            onCancel={() => setView({ type: "setup" })}
          />
        </div>
      </GatedFeature>
    );
  }

  if (view.type === "editor") {
    return (
      <GatedFeature
        isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
        featureName={workflow.gatedFeatureName}
      >
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <TaskTemplateEditor
            orgId={org?.id || ""}
            templateId={view.templateId}
            workflowKind={workflowKind}
            onBack={() => setView({ type: "setup" })}
            onSaved={() => {
              setView({ type: "setup" });
              fetchTemplates();
            }}
          />
        </div>
      </GatedFeature>
    );
  }

  return (
    <GatedFeature
      isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
      featureName={workflow.gatedFeatureName}
    >
      <div className="flex flex-col min-h-[70vh] p-4 md:p-8 max-w-3xl mx-auto w-full">
        {/* Setup toolbar — not the old card grid */}
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a5f] dark:text-blue-400">
              {workflow.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {workflow.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {templates.length > 0 ? (
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger className="w-full sm:flex-1 bg-white">
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
              disabled={!selectedTemplateId || starting || loading}
              onClick={handleStartInspection}
            >
              <Play className="w-4 h-4" />
              {starting ? "Starting…" : "Begin inspection"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`${basePath}/inspection-reports`}>
                <BarChart3 className="w-4 h-4" />
                Inspection reports
              </Link>
            </Button>
            {canManageTemplates && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setView({ type: "editor", templateId: null })}
                >
                  <Plus className="w-4 h-4" />
                  New template
                </Button>
                {selectedTemplateId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setView({ type: "editor", templateId: selectedTemplateId })
                    }
                  >
                    <Pencil className="w-4 h-4" />
                    Edit template
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Preview of form chrome (matches premises layout) */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-lg">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{workflow.emptyMessage}</p>
            {canManageTemplates && (
              <Button
                className="mt-4"
                onClick={() => setView({ type: "editor", templateId: null })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create template
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-zinc-200 shadow-sm opacity-90 pointer-events-none select-none">
            <div className="bg-[#1e3a5f] text-white px-6 py-4">
              <p className="text-xs uppercase tracking-widest opacity-80">
                Preview
              </p>
              <h3 className="text-lg font-bold mt-1">
                {workflow.title.toUpperCase()}
              </h3>
            </div>
            <div className="bg-white p-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="border-b pb-4 last:border-0">
                  <p className="text-sm font-semibold mb-3">
                    {n}. Sample checklist question…
                  </p>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 border-2 border-zinc-300 text-xs font-bold">
                      YES
                    </span>
                    <span className="px-4 py-2 border-2 border-zinc-300 text-xs font-bold">
                      NO
                    </span>
                    <span className="px-4 py-2 border-2 border-zinc-300 text-xs font-bold">
                      N/A
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-3">Comments:</p>
                  <div className="h-8 bg-zinc-100 rounded mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Tap <strong>Begin inspection</strong> to open the full mobile-friendly
          form with photo markup and comments.
        </p>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
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
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GatedFeature>
  );
}

export default function TasksPageClient(props: TasksPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      }
    >
      <TasksPageContent {...props} />
    </Suspense>
  );
}
