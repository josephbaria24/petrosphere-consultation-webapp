"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Switch } from "../../@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../../@/components/ui/badge";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../app/AppProvider";
import {
  formatListField,
  type ImportQuestionDraft,
  parseListField,
} from "../../lib/survey-csv";
import {
  buildSurveyExcelTemplateBuffer,
  downloadExcel,
  parseSurveyFile,
} from "../../lib/survey-excel";
import {
  dimensionSelectLabel,
  fetchDimensionsForSurveys,
  type DimensionWithSet,
} from "../../lib/dimensions";

type SurveyImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new survey id after successful create. */
  onImported?: (surveyId: string) => void;
};

export function SurveyImportDialog({
  open,
  onOpenChange,
  onImported,
}: SurveyImportDialogProps) {
  const { user, org } = useApp();
  const [dimensions, setDimensions] = useState<DimensionWithSet[]>([]);
  const [questions, setQuestions] = useState<ImportQuestionDraft[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"pick" | "review">("pick");

  const applyDimensionNames = useCallback(
    (drafts: ImportQuestionDraft[], dims: DimensionWithSet[]) =>
      drafts.map((q) => {
        const matched = dims.find((d) => d.code === q.dimension_code);
        return {
          ...q,
          dimension: matched?.dimension_name || q.dimension || "",
          errors: validateDraft(
            {
              ...q,
              dimension: matched?.dimension_name || q.dimension || "",
            },
            dims
          ),
        };
      }),
    []
  );

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const dims = await fetchDimensionsForSurveys();
      setDimensions(dims);
      setQuestions((prev) =>
        prev.length ? applyDimensionNames(prev, dims) : prev
      );
    };
    void load();
  }, [open, applyDimensionNames]);

  const reset = useCallback(() => {
    setQuestions([]);
    setTitle("");
    setDescription("");
    setSlug("");
    setIsPublished(false);
    setFileName(null);
    setSubmitting(false);
    setStep("pick");
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = await parseSurveyFile(file);
      const withDims = applyDimensionNames(parsed, dimensions);
      setQuestions(withDims);
      setFileName(file.name);
      if (!title.trim()) {
        const base = file.name
          .replace(/\.(csv|xlsx|xls)$/i, "")
          .replace(/[_-]+/g, " ");
        setTitle(base || "Imported Survey");
      }
      setStep("review");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const updateQuestion = (localId: string, patch: Partial<ImportQuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        const next = { ...q, ...patch };
        if (patch.dimension_code !== undefined) {
          const matched = dimensions.find(
            (d) =>
              d.id === patch.dimension_code ||
              d.code === patch.dimension_code
          );
          next.dimension_code = matched?.code || patch.dimension_code || "";
          next.dimension = matched?.dimension_name || "";
        }
        next.errors = validateDraft(next, dimensions);
        return next;
      })
    );
  };

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  };

  const invalidCount = useMemo(
    () => questions.filter((q) => q.errors.length > 0).length,
    [questions]
  );

  const handleConfirmImport = async () => {
    if (!org?.id) {
      toast.error("Organization data not loaded. Please reload and try again.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a survey title");
      return;
    }
    if (questions.length === 0) {
      toast.error("Add at least one question before importing");
      return;
    }
    if (invalidCount > 0) {
      toast.error(`Fix ${invalidCount} invalid question(s) before importing`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            created_by: user?.id || null,
            slug: slug.trim() || null,
            is_published: isPublished,
            org_id: org.id,
          },
        ])
        .select()
        .single();

      if (surveyError || !survey) {
        console.error(surveyError);
        toast.error("Failed to create survey");
        return;
      }

      const formattedQuestions = questions.map((q, i) => ({
        survey_id: survey.id,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: ["multiple-choice", "radio", "likert"].includes(q.question_type)
          ? q.options
          : null,
        order_index: q.order_index ?? i,
        is_required: q.is_required,
        dimension: q.dimension || null,
        dimension_code: q.dimension_code || null,
        translated_question: q.translated_question || null,
        scoring_type: q.scoring_type || null,
        max_score: q.max_score,
        min_score: q.min_score,
        reverse_score: q.reverse_score,
        translated_options: q.translated_options.length
          ? q.translated_options
          : null,
        template_id: null,
      }));

      const { error: questionError } = await supabase
        .from("survey_questions")
        .insert(formattedQuestions);

      if (questionError) {
        console.error(questionError);
        toast.error(
          "Survey was created but questions failed to import. You can edit the survey manually."
        );
        onImported?.(survey.id);
        handleOpenChange(false);
        return;
      }

      toast.success(
        `Created survey with ${formattedQuestions.length} question(s)`
      );
      onImported?.(survey.id);
      handleOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error while importing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import survey from CSV</DialogTitle>
          <DialogDescription>
            Select a CSV file, review and edit every question, then confirm to
            create a new survey. Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-dashed p-6 space-y-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-medium text-sm">1. Download the template</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excel file with dropdowns for TRUE/FALSE, scoring type, and
                    question type, plus one sample row.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    const buffer = await buildSurveyExcelTemplateBuffer();
                    downloadExcel("survey-questions-template.xlsx", buffer);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Excel template
                </Button>
              </div>

              <div className="border-t border-dashed pt-4 space-y-2">
                <p className="font-medium text-sm">2. Choose your file</p>
                <p className="text-xs text-muted-foreground">
                  Use the Excel template so TRUE/FALSE and scoring type are
                  dropdowns. CSV also works. Nothing is saved until you confirm.
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {fileName && (
                <Badge variant="outline" className="font-normal">
                  <FileUp className="h-3 w-3 mr-1" />
                  {fileName}
                </Badge>
              )}
              <Badge variant="secondary" className="font-normal">
                {questions.length} question{questions.length === 1 ? "" : "s"}
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="font-normal">
                  {invalidCount} need attention
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => {
                  setStep("pick");
                  setQuestions([]);
                  setFileName(null);
                }}
              >
                Choose another file
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/20">
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">
                  Survey title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 2026 Safety Climate Survey"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="min-h-[64px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">URL slug (optional)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-survey-2026"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="import-published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="import-published">Publish immediately</Label>
              </div>
            </div>

            <div className="space-y-3">
              {questions.map((q, index) => (
                <ImportQuestionCard
                  key={q.localId}
                  index={index}
                  question={q}
                  dimensions={dimensions}
                  onChange={updateQuestion}
                  onRemove={removeQuestion}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          {step === "review" && (
            <Button
              type="button"
              onClick={() => void handleConfirmImport()}
              disabled={submitting || questions.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                `Confirm & create survey (${questions.length})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportQuestionCard({
  index,
  question,
  dimensions,
  onChange,
  onRemove,
}: {
  index: number;
  question: ImportQuestionDraft;
  dimensions: DimensionWithSet[];
  onChange: (localId: string, patch: Partial<ImportQuestionDraft>) => void;
  onRemove: (localId: string) => void;
}) {
  const needsOptions = ["radio", "multiple-choice", "likert"].includes(
    question.question_type
  );

  return (
    <div
      className={`border rounded-lg p-3 space-y-3 bg-card ${
        question.errors.length ? "border-destructive/50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mt-1">
          {index + 1}
        </span>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs">Question</Label>
              <Input
                value={question.question_text}
                onChange={(e) =>
                  onChange(question.localId, { question_text: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs">
                Translation (optional)
              </Label>
              <Input
                value={question.translated_question}
                onChange={(e) =>
                  onChange(question.localId, {
                    translated_question: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Question type</Label>
              <Select
                value={question.question_type}
                onValueChange={(value) =>
                  onChange(question.localId, {
                    question_type: value as ImportQuestionDraft["question_type"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radio">Radio</SelectItem>
                  <SelectItem value="likert">Likert</SelectItem>
                  <SelectItem value="multiple-choice">Multiple choice</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Dimension</Label>
              <Select
                value={
                  dimensions.find((d) => d.code === question.dimension_code)
                    ?.id ||
                  question.dimension_code ||
                  "__none__"
                }
                onValueChange={(value) =>
                  onChange(question.localId, {
                    dimension_code: value === "__none__" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No dimension</SelectItem>
                  {dimensions.map((d) => (
                    <SelectItem key={d.id || d.code} value={d.id || d.code}>
                      {dimensionSelectLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Scoring type</Label>
              <Select
                value={question.scoring_type || "positive"}
                onValueChange={(value) =>
                  onChange(question.localId, { scoring_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">positive</SelectItem>
                  <SelectItem value="negative">negative</SelectItem>
                  <SelectItem value="text">text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs">Min score</Label>
                <Input
                  type="number"
                  value={question.min_score ?? ""}
                  onChange={(e) =>
                    onChange(question.localId, {
                      min_score: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Max score</Label>
                <Input
                  type="number"
                  value={question.max_score ?? ""}
                  onChange={(e) =>
                    onChange(question.localId, {
                      max_score: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            </div>
            {needsOptions && (
              <>
                <div className="sm:col-span-2">
                  <Label className="mb-1 block text-xs">
                    Options (comma-separated)
                  </Label>
                  <Textarea
                    className="min-h-[60px] font-mono text-xs"
                    value={formatListField(question.options)}
                    onChange={(e) =>
                      onChange(question.localId, {
                        options: parseListField(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1 block text-xs">
                    Translated options (comma-separated, optional)
                  </Label>
                  <Textarea
                    className="min-h-[60px] font-mono text-xs"
                    value={formatListField(question.translated_options)}
                    onChange={(e) =>
                      onChange(question.localId, {
                        translated_options: parseListField(e.target.value),
                      })
                    }
                  />
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="w-[140px]">
                <Label className="mb-1 block text-xs">Required</Label>
                <Select
                  value={question.is_required ? "TRUE" : "FALSE"}
                  onValueChange={(value) =>
                    onChange(question.localId, {
                      is_required: value === "TRUE",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">TRUE</SelectItem>
                    <SelectItem value="FALSE">FALSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <Label className="mb-1 block text-xs">Reverse score</Label>
                <Select
                  value={question.reverse_score ? "TRUE" : "FALSE"}
                  onValueChange={(value) =>
                    onChange(question.localId, {
                      reverse_score: value === "TRUE",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">TRUE</SelectItem>
                    <SelectItem value="FALSE">FALSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {question.errors.length > 0 && (
              <ul className="text-xs text-destructive list-disc pl-4">
                {question.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive shrink-0"
          onClick={() => onRemove(question.localId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function validateDraft(
  q: ImportQuestionDraft,
  dimensions: DimensionWithSet[]
): string[] {
  const errors: string[] = [];
  if (!q.question_text.trim()) errors.push("Question text is required");
  if (
    ["radio", "multiple-choice", "likert"].includes(q.question_type) &&
    q.options.length === 0
  ) {
    errors.push("Options are required for this question type");
  }
  if (
    q.dimension_code &&
    dimensions.length > 0 &&
    !dimensions.some((d) => d.code === q.dimension_code)
  ) {
    errors.push(`Unknown dimension code: ${q.dimension_code}`);
  }
  return errors;
}
