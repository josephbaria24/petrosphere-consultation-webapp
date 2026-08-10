"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Camera,
  Check,
  FileText,
  Info,
  Loader2,
  Paperclip,
  UploadCloud,
  X,
} from "@/components/icons";
import { toast } from "sonner";
import CameraCapture from "./CameraCapture";
import ImageAnnotator from "./ImageAnnotator";
import Link from "next/link";
import type { FieldWorkflowConfig } from "../../lib/field-workflows";

type Answer = "yes" | "no" | "n_a";

interface ItemResponse {
  answer: Answer | null;
  notes: string;
  evidenceFile: File | null;
  previewUrl: string | null;
}

interface PremisesInspectionFormProps {
  session: { id: string; checklist_id: string; org_id: string };
  template: { title: string; description?: string };
  workflow: FieldWorkflowConfig;
  reportsHref: string;
  onFinish: () => void;
  onCancel: () => void;
}

export default function PremisesInspectionForm({
  session,
  template,
  workflow,
  reportsHref,
  onFinish,
  onCancel,
}: PremisesInspectionFormProps) {
  const [items, setItems] = useState<
    { id: string; text: string; order_index: number; requires_media_on_no: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraItemId, setCameraItemId] = useState<string | null>(null);
  const [annotateItemId, setAnnotateItemId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", session.checklist_id)
        .order("order_index", { ascending: true });
      if (error) {
        toast.error("Failed to load checklist.");
      } else {
        setItems(data || []);
        const init: Record<string, ItemResponse> = {};
        (data || []).forEach((item) => {
          init[item.id] = {
            answer: null,
            notes: "",
            evidenceFile: null,
            previewUrl: null,
          };
        });
        setResponses(init);
      }
      setLoading(false);
    };
    load();
  }, [session.checklist_id]);

  const setItemResponse = (itemId: string, patch: Partial<ItemResponse>) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  };

  const setEvidenceForItem = (itemId: string, file: File | null) => {
    const prev = responses[itemId];
    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    setItemResponse(itemId, {
      evidenceFile: file,
      previewUrl: file ? URL.createObjectURL(file) : null,
    });
  };

  const validate = (): boolean => {
    for (const item of items) {
      const r = responses[item.id];
      if (!r?.answer) {
        toast.error(`Please answer question ${item.order_index}.`);
        return false;
      }
      if (
        r.answer === "no" &&
        item.requires_media_on_no &&
        !r.evidenceFile
      ) {
        toast.error(
          `Photo evidence required for question ${item.order_index}.`
        );
        return false;
      }
    }
    return true;
  };

  const submitAll = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      for (const item of items) {
        const resp = responses[item.id];
        if (!resp?.answer) continue;

        const { data: responseData, error: responseErr } = await supabase
          .from("task_responses")
          .insert({
            session_id: session.id,
            item_id: item.id,
            answer: resp.answer,
            notes: resp.notes || null,
          })
          .select()
          .single();

        if (responseErr) throw responseErr;

        if (resp.evidenceFile) {
          const formData = new FormData();
          formData.append("file", resp.evidenceFile);
          const uploadRes = await fetch("/api/tasks/upload", {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error || "Upload failed");
          }
          const { url, fileName } = await uploadRes.json();
          const { error: evidenceErr } = await supabase
            .from("task_evidence")
            .insert({
              response_id: responseData.id,
              file_url: url,
              file_name: fileName,
              file_type: resp.evidenceFile.type,
            });
          if (evidenceErr) throw evidenceErr;
        }
      }

      await supabase
        .from("task_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .eq("org_id", session.org_id);

      setIsFinished(true);
      toast.success("Inspection submitted successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passedCount = Object.values(responses).filter(
    (r) => r.answer === "yes"
  ).length;
  const issuesCount = Object.values(responses).filter(
    (r) => r.answer === "no"
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        No checklist items configured for this template.
      </p>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Inspection complete</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-3xl font-bold text-green-600">{passedCount}</p>
            <p className="text-xs font-semibold uppercase text-green-800">
              Passed
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-3xl font-bold text-red-600">{issuesCount}</p>
            <p className="text-xs font-semibold uppercase text-red-800">
              Issues
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onFinish}>
            New inspection
          </Button>
          <Button className="flex-1" asChild>
            <Link href={reportsHref}>View reports</Link>
          </Button>
        </div>
      </div>
    );
  }

  const headerTitle = workflow.title.toUpperCase();

  return (
    <div className="w-full max-w-3xl mx-auto pb-28">
      {/* Navy header */}
      <div className="bg-[#1e3a5f] text-white px-4 sm:px-6 py-5 rounded-t-lg shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] sm:text-xs font-medium tracking-widest opacity-80 uppercase">
              {template.description || workflow.subtitle}
            </p>
            <h1 className="text-lg sm:text-xl font-bold tracking-wide mt-1">
              {headerTitle}
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white hover:bg-white/15 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Form body */}
      <div className="bg-white dark:bg-zinc-950 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-lg shadow-sm">
        {items.map((item, idx) => {
          const r = responses[item.id];
          const isImage = r?.evidenceFile?.type.startsWith("image/");

          return (
            <div
              key={item.id}
              className={`px-4 sm:px-6 py-5 ${idx > 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""}`}
            >
              <div className="flex gap-2 items-start mb-3">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 shrink-0">
                  {item.order_index}.
                </span>
                <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex-1 leading-snug">
                  {item.text}
                </p>
                <button
                  type="button"
                  className="shrink-0 text-zinc-400 hover:text-zinc-600"
                  title="Guidance"
                  aria-label="More information"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* YES / NO / N/A */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(["yes", "no", "n_a"] as Answer[]).map((val) => {
                  const active = r?.answer === val;
                  const styles =
                    val === "yes"
                      ? active
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-zinc-800 border-zinc-300 hover:border-green-500"
                      : val === "no"
                        ? active
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-zinc-800 border-zinc-300 hover:border-red-500"
                        : active
                          ? "bg-zinc-600 text-white border-zinc-600"
                          : "bg-white text-zinc-800 border-zinc-300 hover:border-zinc-500";
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setItemResponse(item.id, {
                          answer: val,
                          ...(val === "yes"
                            ? { evidenceFile: null, previewUrl: null }
                            : {}),
                        })
                      }
                      className={`min-w-[72px] px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide border-2 rounded-sm transition-colors ${styles}`}
                    >
                      {val === "n_a" ? "N/A" : val}
                    </button>
                  );
                })}
              </div>

              {/* Media + comments */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/*,video/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEvidenceForItem(item.id, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setCameraItemId(item.id);
                      setIsCameraOpen(true);
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRefs.current[item.id]?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach
                  </Button>
                  {r?.evidenceFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setEvidenceForItem(item.id, null)}
                    >
                      Remove file
                    </Button>
                  )}
                </div>

                {r?.previewUrl && isImage && (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-200 max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.previewUrl}
                      alt="Evidence"
                      className="w-full max-h-48 object-contain bg-zinc-50"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 text-xs"
                      onClick={() => setAnnotateItemId(item.id)}
                    >
                      Draw on image
                    </Button>
                  </div>
                )}

                {r?.evidenceFile && !isImage && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {r.evidenceFile.name}
                  </p>
                )}

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Comments:
                  </label>
                  <Textarea
                    value={r?.notes || ""}
                    onChange={(e) =>
                      setItemResponse(item.id, { notes: e.target.value })
                    }
                    placeholder="Add observations or notes…"
                    rows={2}
                    className="mt-1 resize-none text-sm border-zinc-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <Button
            type="button"
            className="w-full py-6 text-base font-bold bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-md"
            disabled={isSubmitting}
            onClick={submitAll}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                Submitting inspection…
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5 mr-2 inline" />
                Submit inspection
              </>
            )}
          </Button>
        </div>
      </div>

      {isCameraOpen && cameraItemId && (
        <CameraCapture
          onCapture={(file) => {
            setEvidenceForItem(cameraItemId, file);
            setIsCameraOpen(false);
            setCameraItemId(null);
          }}
          onCancel={() => {
            setIsCameraOpen(false);
            setCameraItemId(null);
          }}
        />
      )}

      {annotateItemId && responses[annotateItemId]?.evidenceFile && (
        <ImageAnnotator
          open={!!annotateItemId}
          imageFile={responses[annotateItemId].evidenceFile}
          onClose={() => setAnnotateItemId(null)}
          onSave={(file) => {
            setEvidenceForItem(annotateItemId, file);
            setAnnotateItemId(null);
          }}
        />
      )}
    </div>
  );
}
