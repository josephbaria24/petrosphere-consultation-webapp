"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ClipboardCheck,
  HardHat,
  ShieldCheck,
  Eye,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../../@/components/ui/switch";
import { Label } from "../../@/components/ui/label";
import { getClientCookie } from "../../lib/cookies-client";
import { ImagePlus, X, Loader2, Trash2 as TrashIcon } from "lucide-react";
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

const ICON_OPTIONS = [
  { id: "ClipboardCheck", label: "Clipboard", icon: ClipboardCheck },
  { id: "HardHat", label: "Hard Hat", icon: HardHat },
  { id: "ShieldCheck", label: "Shield", icon: ShieldCheck },
  { id: "Eye", label: "Observation", icon: Eye },
];

interface ChecklistItem {
  id?: string;
  text: string;
  order_index: number;
  requires_media_on_no: boolean;
  isNew?: boolean;
}

interface TaskTemplateEditorProps {
  orgId: string;
  templateId?: string | null; // null = create new
  onBack: () => void;
  onSaved: () => void;
}

export default function TaskTemplateEditor({
  orgId,
  templateId,
  onBack,
  onSaved,
}: TaskTemplateEditorProps) {
  const isEditing = !!templateId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("ClipboardCheck");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [templateOrgId, setTemplateOrgId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  const isPlatformAdmin = !!getClientCookie("admin_id");

  const isGlobalTemplate = isEditing && !templateOrgId;
  const isOtherOrgTemplate = isEditing && templateOrgId && templateOrgId !== orgId;
  const isForcedNew = isGlobalTemplate || isOtherOrgTemplate;

  // Seed from a system template when creating new
  const [seedTemplates, setSeedTemplates] = useState<any[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      // Fetch system templates to use as seeds
      supabase
        .from("task_templates")
        .select("id, title")
        .is("org_id", null)
        .then(({ data }) => setSeedTemplates(data || []));
      addItem(); // start with one blank item
    }
  }, [isEditing]);

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      const { data: tpl } = await supabase
        .from("task_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (tpl) {
        setTitle(tpl.title);
        setDescription(tpl.description || "");
        setIcon(tpl.icon || "ClipboardCheck");
        setImageUrl(tpl.image_url || "");
        setTemplateOrgId(tpl.org_id);
      }

      const { data: checklists } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("task_template_id", templateId)
        .eq("is_active", true)
        .limit(1);

      if (checklists?.length) {
        const cl = checklists[0];
        setChecklistId(cl.id);
        setChecklistTitle(cl.title);
        const { data: fetchedItems } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("checklist_id", cl.id)
          .order("order_index", { ascending: true });
        setItems(fetchedItems || []);
      }
      setIsLoading(false);
    };
    load();
  }, [templateId]);

  const handleSeedChange = async (seedId: string) => {
    setSelectedSeed(seedId);
    if (!seedId) return;

    const { data: checklists } = await supabase
      .from("checklist_templates")
      .select("id, title")
      .eq("task_template_id", seedId)
      .eq("is_active", true)
      .limit(1);

    if (checklists?.length) {
      const { data: seedItems } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", checklists[0].id)
        .order("order_index", { ascending: true });

      setChecklistTitle(checklists[0].title);
      setItems(
        (seedItems || []).map((item, idx) => ({
          text: item.text,
          order_index: idx + 1,
          requires_media_on_no: item.requires_media_on_no,
          isNew: true,
        }))
      );
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        text: "",
        order_index: prev.length + 1,
        requires_media_on_no: true,
        isNew: true,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPlatformAdmin) {
      toast.error("Only platform admins can change cover images.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("/api/tasks/upload", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Upload failed");
      const { url } = await resp.json();
      setImageUrl(url);
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", templateId);
      
      if (error) throw error;
      
      toast.success("Template deleted successfully");
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Delete failed: " + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Template title is required.");
      return;
    }
    if (!checklistTitle.trim()) {
      toast.error("Checklist title is required.");
      return;
    }
    if (items.some((i) => !i.text.trim())) {
      toast.error("All checklist items must have text.");
      return;
    }

    setIsSaving(true);
    try {
      let tplId = templateId;

      if (isEditing && !isForcedNew) {
        // Update existing template
        await supabase
          .from("task_templates")
          .update({ title, description, icon, image_url: imageUrl })
          .eq("id", tplId!);
      } else {
        // Create new template (or clone)
        const { data: newTpl, error: tplErr } = await supabase
          .from("task_templates")
          .insert({ title, description, icon, image_url: imageUrl, org_id: orgId })
          .select()
          .single();
        if (tplErr) throw tplErr;
        tplId = newTpl.id;
      }

      // Upsert checklist template
      let clId = isForcedNew ? null : checklistId;
      if (clId) {
        await supabase
          .from("checklist_templates")
          .update({ title: checklistTitle })
          .eq("id", clId);
      } else {
        const { data: newCl, error: clErr } = await supabase
          .from("checklist_templates")
          .insert({ task_template_id: tplId, title: checklistTitle, is_active: true })
          .select()
          .single();
        if (clErr) throw clErr;
        clId = newCl.id;
        if (!isForcedNew) setChecklistId(clId);
      }

      // Delete all old items (for the existing checklist) and re-insert
      if (clId && isEditing && !isForcedNew) {
        await supabase.from("checklist_items").delete().eq("checklist_id", clId);
      }

      // Insert all current items
      const itemInserts = items.map((item, idx) => ({
        checklist_id: clId,
        text: item.text,
        order_index: idx + 1,
        requires_media_on_no: item.requires_media_on_no,
      }));

      if (itemInserts.length) {
        const { error: itemsErr } = await supabase
          .from("checklist_items")
          .insert(itemInserts);
        if (itemsErr) throw itemsErr;
      }

      toast.success(isEditing ? "Template updated!" : "Template created!");
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading template...</div>;
  }

  const SelectedIcon = ICON_OPTIONS.find((o) => o.id === icon)?.icon || ClipboardCheck;

  return (
    <div className="flex flex-col min-h-screen bg-transparent p-4 md:p-8 pt-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isForcedNew ? `Customize ${title}` : isEditing ? "Edit Template" : "Create New Template"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isForcedNew ? "Your changes will be saved as a new version for your organization." : isEditing ? "Update the template and its questions." : "Build a new checklist template."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Seed Selector (create mode only) */}
        {!isEditing && seedTemplates.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Start from a system template (optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedSeed(null); setItems([{ text: "", order_index: 1, requires_media_on_no: true, isNew: true }]); setChecklistTitle(""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${!selectedSeed ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  Start Blank
                </button>
                {seedTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSeedChange(t.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedSeed === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Monthly Safety Inspection"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of when to use this template..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex gap-3 flex-wrap">
                {ICON_OPTIONS.map((opt) => {
                  const Ico = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setIcon(opt.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${icon === opt.id ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted"}`}
                    >
                      <Ico className="w-5 h-5" />
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Cover Image</Label>
              {imageUrl ? (
                <div className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                  <img
                    src={imageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  {isPlatformAdmin && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setImageUrl("")}
                        className="h-8 gap-2"
                      >
                        <X className="w-4 h-4" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : isPlatformAdmin ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    id="cover-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="cover-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">Click to upload cover image</span>
                    <span className="text-xs text-muted-foreground">Recommended aspect ratio 16:9</span>
                  </label>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                  No cover image set for this template.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Checklist Name *</Label>
              <Input
                placeholder="e.g. Standard Safety Inspection"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3 mt-4">
              <Label>Questions ({items.length})</Label>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 group"
                >
                  <GripVertical className="w-4 h-4 mt-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder={`Question ${idx + 1}...`}
                      value={item.text}
                      onChange={(e) => updateItem(idx, "text", e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`media-${idx}`}
                        checked={item.requires_media_on_no}
                        onCheckedChange={(v) => updateItem(idx, "requires_media_on_no", v)}
                      />
                      <Label htmlFor={`media-${idx}`} className="text-xs cursor-pointer text-muted-foreground">
                        Require media on "No" answer
                      </Label>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="mt-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <Button variant="outline" onClick={addItem} className="w-full gap-2 border-dashed mt-2">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex gap-3 justify-between items-center">
          <div>
            {isEditing && !isForcedNew && (
              <Button 
                variant="outline" 
                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isDeleting}
              >
                <TrashIcon className="w-4 h-4" />
                Delete Template
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || isDeleting} className="gap-2 min-w-[120px]">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : isForcedNew ? "Save Custom Copy" : isEditing ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
                handleDelete();
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
