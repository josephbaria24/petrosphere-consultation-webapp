"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  CircleAlert,
  FileDown,
  History,
  RotateCcw,
  ChevronDown,
} from "@/components/icons";
import { Button } from "../ui/button";
import { Badge } from "../../@/components/ui/badge";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../../@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { UNMATCHED_DEST } from "../../lib/migrate-survey-responses";

type OrgOption = { id: string; name: string };
type SurveyOption = { id: string; title: string; org_id?: string | null };

type CompareReport = {
  sourceSurvey: { id: string; title: string };
  destSurvey: { id: string; title: string };
  summary: {
    sourceQuestionCount: number;
    destQuestionCount: number;
    exactMatches: number;
    strongMatches: number;
    weakMatches: number;
    manualMatches?: number;
    unmatchedQuestions: number;
    sourceResponseCount: number;
    uniqueRespondents: number;
    migratableResponses: number;
    conflictingResponses: number;
    duplicateSourceResponses?: number;
    responsesOnUnmatchedQuestions: number;
  };
  dimensions: {
    sourceCodes: string[];
    destSurveyCodes: string[];
    destOrgCatalogCodes: string[];
    missingOnDestSurvey: string[];
    missingInDestOrgCatalog: string[];
  };
  matches: Array<{
    sourceQuestionId: string;
    sourceText: string;
    sourceDimensionCode: string | null;
    sourceDimension?: string | null;
    sourceOrder: number | null;
    sourceOptions?: string[] | null;
    sourceReverseScore?: boolean;
    sourceScoringType?: string | null;
    destQuestionId: string | null;
    destText: string | null;
    destDimensionCode: string | null;
    destDimension?: string | null;
    destOrder?: number | null;
    destOptions?: string[] | null;
    destReverseScore?: boolean;
    destScoringType?: string | null;
    status: "exact" | "strong" | "weak" | "unmatched" | "manual";
    warnings: string[];
  }>;
  destQuestionOptions?: Array<{
    id: string;
    text: string;
    dimension: string | null;
    dimensionCode: string | null;
    order: number | null;
    options?: string[] | null;
    reverseScore?: boolean;
    scoringType?: string | null;
  }>;
  sourceAnswerStats?: Record<
    string,
    {
      responseCount: number;
      averageScore: number | null;
      averageLabel: string | null;
      topLabel: string | null;
      topPct: number | null;
      counts: Array<{ option: string; count: number; pct: number }>;
    }
  >;
  blockingIssues: string[];
  softWarnings: string[];
  canMigrate: boolean;
};

type MigrationRecord = {
  id: string;
  created_at: string;
  created_by_email: string | null;
  source_org_name: string | null;
  dest_org_name: string | null;
  source_survey_title: string | null;
  dest_survey_title: string | null;
  status: string;
  copied_count: number;
  skipped_conflict: number;
  skipped_unmatched: number;
  failed_count: number;
  restored_at: string | null;
  restored_by_email: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrgOption[];
  initialSourceOrgId?: string | null;
};

function statusBadge(status: string) {
  if (status === "exact")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700">Exact</Badge>;
  if (status === "strong")
    return <Badge className="bg-blue-600 hover:bg-blue-700">Strong</Badge>;
  if (status === "weak")
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Weak</Badge>;
  if (status === "manual")
    return <Badge className="bg-violet-600 hover:bg-violet-700">Manual</Badge>;
  return <Badge variant="destructive">Unmatched</Badge>;
}

function optionChipClass(index: number, total: number) {
  const t = total <= 1 ? 1 : index / Math.max(total - 1, 1);
  if (t <= 0.01) return "bg-rose-700 text-white";
  if (t < 0.3) return "bg-orange-500 text-white";
  if (t < 0.55) return "bg-amber-500 text-white";
  if (t < 0.8) return "bg-lime-600 text-white";
  return "bg-emerald-600 text-white";
}

function dimensionLooksDifferent(
  sourceCode?: string | null,
  destCode?: string | null,
  sourceDimension?: string | null,
  destDimension?: string | null
) {
  const sourceLabel = (sourceDimension || "")
    .replace(/^\d+\.\s*/, "")
    .trim()
    .toLowerCase();
  const destLabel = (destDimension || "")
    .replace(/^\d+\.\s*/, "")
    .trim()
    .toLowerCase();
  if (sourceLabel && destLabel && sourceLabel === destLabel) return false;
  const sourceStem = (sourceCode || "").replace(/\d+$/, "").trim().toLowerCase();
  const destStem = (destCode || "").replace(/\d+$/, "").trim().toLowerCase();
  if (sourceStem && destStem && sourceStem === destStem) return false;
  return !!(sourceStem && destStem && sourceStem !== destStem);
}

function polarityBadge(negative?: boolean) {
  return negative ? (
    <span className="rounded bg-rose-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      Negative
    </span>
  ) : (
    <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      Positive
    </span>
  );
}

function AnswerMix({
  counts,
}: {
  counts: Array<{ option: string; count: number; pct: number }>;
}) {
  if (!counts.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {counts.map((row, i) => (
        <span
          key={`${row.option}-${i}`}
          title={`${row.option}: ${row.count} (${row.pct}%)`}
          className={`inline-flex max-w-[10rem] items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm ${optionChipClass(i, counts.length)}`}
        >
          <span className="truncate">{row.option}</span>
          <span className="opacity-90">{row.count}</span>
        </span>
      ))}
    </div>
  );
}

function mappedAnswerCounts(
  sourceCounts: Array<{ option: string; count: number; pct: number }> | undefined,
  sourceOptions: string[],
  destOptions: string[],
  reverse: boolean
): Array<{ option: string; count: number; pct: number }> {
  const dest = destOptions.length ? destOptions : sourceOptions;
  const src = sourceOptions.length ? sourceOptions : dest;
  if (!dest.length) return sourceCounts || [];

  const bySource = new Map(
    (sourceCounts || []).map((row) => [row.option.trim().toLowerCase(), row])
  );

  return dest.map((option, destIdx) => {
    const srcIdx =
      reverse && src.length === dest.length ? dest.length - 1 - destIdx : destIdx;
    const sourceOption = src[srcIdx] ?? option;
    const hit =
      bySource.get(sourceOption.trim().toLowerCase()) ||
      bySource.get(option.trim().toLowerCase());
    return {
      option,
      count: hit?.count ?? 0,
      pct: hit?.pct ?? 0,
    };
  });
}

type DestQuestionOption = NonNullable<CompareReport["destQuestionOptions"]>[number];
type MappedFromInfo = {
  sourceQuestionId: string;
  sourceOrder: number | null;
  sourceCode: string | null;
  sourceText: string;
};

const DestMapPicker = memo(function DestMapPicker({
  value,
  options,
  mappedFromByDest,
  sourceQuestionId,
  sourceDimensionCode,
  sourceDimension,
  disabled,
  onSelect,
}: {
  value?: string | null;
  options: DestQuestionOption[];
  mappedFromByDest: Map<string, MappedFromInfo>;
  sourceQuestionId: string;
  sourceDimensionCode: string | null;
  sourceDimension?: string | null;
  disabled?: boolean;
  onSelect: (destId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => (value ? options.find((o) => o.id === value) : undefined),
    [options, value]
  );

  const ranked = useMemo(() => {
    const sourceLabel = (sourceDimension || "")
      .replace(/^\d+\.\s*/, "")
      .trim()
      .toLowerCase();
    const sourceStem = (sourceDimensionCode || "")
      .replace(/\d+$/, "")
      .trim()
      .toLowerCase();
    const needle = query.trim().toLowerCase();
    const score = (o: DestQuestionOption) => {
      const label = (o.dimension || "").replace(/^\d+\.\s*/, "").trim().toLowerCase();
      const stem = (o.dimensionCode || "").replace(/\d+$/, "").trim().toLowerCase();
      if (sourceLabel && label === sourceLabel) return 2;
      if (sourceStem && stem === sourceStem) return 1;
      return 0;
    };
    return options
      .filter((o) => {
        if (!needle) return true;
        const mapped = mappedFromByDest.get(o.id);
        const hay = [
          String((o.order ?? 0) + 1),
          o.dimensionCode || "",
          o.dimension || "",
          o.text,
          mapped ? `Q${(mapped.sourceOrder ?? 0) + 1}` : "",
          mapped?.sourceCode || "",
          mapped?.sourceText || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        const diff = score(b) - score(a);
        if (diff) return diff;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [options, query, sourceDimension, sourceDimensionCode, mappedFromByDest]);

  const triggerLabel = selected
    ? `${selected.order != null ? `${selected.order + 1}. ` : ""}[${selected.dimensionCode || "—"}] ${selected.text}`
    : "Map to destination question…";

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          title={triggerLabel}
          className="h-8 w-full justify-between gap-2 bg-white px-2 py-1 text-left text-xs font-normal dark:bg-slate-900"
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[200] w-[min(40rem,calc(80vw-2rem))] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search dest #, dest dim, question, or mapped source…"
            className="h-8 text-xs"
          />
          <div className="grid grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_7.5rem] gap-1 border-b bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>#</span>
            <span>Dim</span>
            <span>Destination question</span>
            <span className="text-right">Mapped from</span>
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-xs">No questions match.</CommandEmpty>
            <CommandGroup className="p-0">
              {ranked.map((o) => {
                const mapped = mappedFromByDest.get(o.id);
                const mappedOther =
                  mapped && mapped.sourceQuestionId !== sourceQuestionId
                    ? mapped
                    : null;
                const mappedLabel = mappedOther
                  ? `Q${(mappedOther.sourceOrder ?? 0) + 1} [${mappedOther.sourceCode || "—"}]`
                  : o.id === value
                    ? "current"
                    : "";
                const mappedTitle = mappedOther
                  ? `Already mapped from source Q${(mappedOther.sourceOrder ?? 0) + 1} [${mappedOther.sourceCode || "—"}]: ${mappedOther.sourceText}`
                  : o.id === value
                    ? "Currently mapped from this source question"
                    : "Not mapped yet";
                return (
                  <CommandItem
                    key={o.id}
                    value={o.id}
                    onSelect={() => {
                      onSelect(o.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    title={`${(o.order ?? 0) + 1}. [${o.dimensionCode || "—"}] ${o.text}\n${mappedTitle}`}
                    className="grid h-7 grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_7.5rem] items-center gap-1 rounded-none px-2 py-0 text-xs"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {(o.order ?? 0) + 1}
                    </span>
                    <span
                      className="truncate font-semibold text-slate-700 dark:text-slate-200"
                      title={o.dimension || o.dimensionCode || ""}
                    >
                      {o.dimensionCode || "—"}
                    </span>
                    <span className="min-w-0 truncate">{o.text}</span>
                    <span
                      className={`truncate text-right text-[10px] ${
                        mappedOther
                          ? "text-amber-700 dark:text-amber-300"
                          : o.id === value
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground"
                      }`}
                      title={mappedTitle}
                    >
                      {mappedLabel || "—"}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

async function downloadExport(params: URLSearchParams) {
  const resp = await fetch(`/api/admin/migrate-responses/export?${params.toString()}`);
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Export failed");
  }
  const blob = await resp.blob();
  const match = resp.headers
    .get("Content-Disposition")
    ?.match(/filename="([^"]+)"/);
  const filename = match?.[1] || "survey-response-backup.xlsx";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function MigrateResultsDialog({
  open,
  onOpenChange,
  organizations,
  initialSourceOrgId,
}: Props) {
  const [tab, setTab] = useState<"copy" | "history">("copy");
  const [sourceOrgId, setSourceOrgId] = useState("");
  const [destOrgId, setDestOrgId] = useState("");
  const [sourceSurveyId, setSourceSurveyId] = useState("");
  const [destSurveyId, setDestSurveyId] = useState("");
  const [sourceSurveys, setSourceSurveys] = useState<SurveyOption[]>([]);
  const [destSurveys, setDestSurveys] = useState<SurveyOption[]>([]);
  const [loadingSourceSurveys, setLoadingSourceSurveys] = useState(false);
  const [loadingDestSurveys, setLoadingDestSurveys] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [confirmMigrate, setConfirmMigrate] = useState(false);
  const [lastMigrationId, setLastMigrationId] = useState<string | null>(null);
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [questionOverrides, setQuestionOverrides] = useState<
    Record<string, string>
  >({});
  const [remappingIds, setRemappingIds] = useState<Record<string, boolean>>(
    {}
  );
  const [answerReverse, setAnswerReverse] = useState<Record<string, boolean>>(
    {}
  );

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const resp = await fetch("/api/admin/migrate-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to load history");
      setMigrations(data.migrations || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setReport(null);
    setConfirmMigrate(false);
    setSourceSurveyId("");
    setDestSurveyId("");
    setLastMigrationId(null);
    setQuestionOverrides({});
    setRemappingIds({});
    setAnswerReverse({});
    setTab("copy");
    if (initialSourceOrgId) {
      setSourceOrgId(initialSourceOrgId);
      setDestOrgId((prev) => prev || initialSourceOrgId);
    }
    void loadHistory();
  }, [open, initialSourceOrgId, loadHistory]);

  const loadSurveys = useCallback(async (orgId: string, which: "source" | "dest") => {
    if (!orgId) {
      if (which === "source") setSourceSurveys([]);
      else setDestSurveys([]);
      return;
    }
    const setLoading =
      which === "source" ? setLoadingSourceSurveys : setLoadingDestSurveys;
    const setSurveys = which === "source" ? setSourceSurveys : setDestSurveys;
    setLoading(true);
    try {
      const resp = await fetch(
        `/api/admin/all-surveys?orgId=${encodeURIComponent(orgId)}`
      );
      if (!resp.ok) throw new Error("Failed to load surveys");
      const data = await resp.json();
      setSurveys(
        (data || []).map((s: SurveyOption) => ({
          id: s.id,
          title: s.title,
          org_id: s.org_id,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load surveys");
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSourceSurveyId("");
    setReport(null);
    setQuestionOverrides({});
    setRemappingIds({});
    setAnswerReverse({});
    void loadSurveys(sourceOrgId, "source");
  }, [open, sourceOrgId, loadSurveys]);

  useEffect(() => {
    if (!open) return;
    setDestSurveyId("");
    setReport(null);
    setQuestionOverrides({});
    setRemappingIds({});
    setAnswerReverse({});
    void loadSurveys(destOrgId, "dest");
  }, [open, destOrgId, loadSurveys]);

  const destOrgOptions = organizations;
  const destSurveyOptions = useMemo(
    () => destSurveys.filter((s) => s.id !== sourceSurveyId),
    [destSurveys, sourceSurveyId]
  );

  const hardBlockCount = useMemo(() => {
    if (!report) return 0;
    return report.blockingIssues.length;
  }, [report]);

  const destById = useMemo(() => {
    const map = new Map<string, DestQuestionOption>();
    for (const o of report?.destQuestionOptions || []) map.set(o.id, o);
    return map;
  }, [report]);

  const mappedFromByDest = useMemo(() => {
    const map = new Map<string, MappedFromInfo>();
    for (const m of report?.matches || []) {
      if (!m.destQuestionId) continue;
      map.set(m.destQuestionId, {
        sourceQuestionId: m.sourceQuestionId,
        sourceOrder: m.sourceOrder,
        sourceCode: m.sourceDimensionCode,
        sourceText: m.sourceText,
      });
    }
    return map;
  }, [report]);

  const applyOverride = async (sourceId: string, destId: string | null) => {
    const next = { ...questionOverrides };
    if (!destId) next[sourceId] = UNMATCHED_DEST;
    else next[sourceId] = destId;
    setQuestionOverrides(next);
    setAnswerReverse((prev) => {
      const nextRev = { ...prev };
      if (!destId) {
        delete nextRev[sourceId];
        return nextRev;
      }
      const src = report?.matches.find((m) => m.sourceQuestionId === sourceId);
      const dest = report?.destQuestionOptions?.find((o) => o.id === destId);
      nextRev[sourceId] = !!src?.sourceReverseScore !== !!dest?.reverseScore;
      return nextRev;
    });
    setConfirmMigrate(false);
    await handleCompare(next, { silent: true });
  };

  const exportParams = useCallback(
    (format: "xlsx" | "csv", kind: "preview" | "migration", migrationId?: string) => {
      const params = new URLSearchParams({ format, kind });
      if (kind === "migration" && migrationId) {
        params.set("migrationId", migrationId);
        return params;
      }
      params.set("sourceOrgId", sourceOrgId);
      params.set("destOrgId", destOrgId);
      params.set("sourceSurveyId", sourceSurveyId);
      params.set("destSurveyId", destSurveyId);
      return params;
    },
    [sourceOrgId, destOrgId, sourceSurveyId, destSurveyId]
  );

  const handleExport = async (
    format: "xlsx" | "csv",
    kind: "preview" | "migration",
    migrationId?: string
  ) => {
    const key = `${kind}-${format}-${migrationId || "preview"}`;
    setExporting(key);
    try {
      await downloadExport(exportParams(format, kind, migrationId));
      toast.success(format === "xlsx" ? "Excel downloaded" : "CSV downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleCompare = async (
    overrides?: Record<string, string>,
    opts?: { silent?: boolean }
  ) => {
    if (!sourceOrgId || !destOrgId || !sourceSurveyId || !destSurveyId) {
      toast.error("Select source/destination org and surveys");
      return;
    }
    const isPlainOverrides =
      !!overrides &&
      typeof overrides === "object" &&
      !Array.isArray(overrides) &&
      !("nativeEvent" in overrides);
    const nextOverrides = isPlainOverrides
      ? overrides
      : opts?.silent
        ? questionOverrides
        : {};
    if (!opts?.silent) {
      setQuestionOverrides({});
      setRemappingIds({});
      setAnswerReverse({});
      setReport(null);
      setConfirmMigrate(false);
      setLastMigrationId(null);
    }
    setComparing(true);
    try {
      const resp = await fetch("/api/admin/migrate-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compare",
          sourceOrgId,
          destOrgId,
          sourceSurveyId,
          destSurveyId,
          questionOverrides: nextOverrides,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Compare failed");
      setReport(data);
      if (!opts?.silent) {
        toast.success("Comparison ready — map unmatched questions or download a backup");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Compare failed");
    } finally {
      setComparing(false);
    }
  };

  const handleMigrate = async () => {
    if (!report || !confirmMigrate) return;
    if (hardBlockCount > 0) {
      toast.error("Resolve blocking conflicts before copying");
      return;
    }
    setMigrating(true);
    try {
      const resp = await fetch("/api/admin/migrate-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          sourceOrgId,
          destOrgId,
          sourceSurveyId,
          destSurveyId,
          questionOverrides,
          answerReverse,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Copy failed");
      setLastMigrationId(data.migrationId || null);
      toast.success(
        `Copied ${data.copied} answer(s). Source survey left untouched. Already on dest skipped: ${data.skippedConflict}. Duplicate source rows skipped: ${data.skippedDuplicate || 0}. Unmatched skipped: ${data.skippedUnmatched}.`
      );
      if (data.failed) toast.error(`${data.failed} copy(ies) failed`);
      await loadHistory();
      setTab("history");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Copy failed");
    } finally {
      setMigrating(false);
    }
  };

  const handleRestore = async (migrationId: string) => {
    if (
      !window.confirm(
        "Restore this copy? Destination rows created by this migration will be deleted. Original Safety Vitals / source answers stay as they are."
      )
    ) {
      return;
    }
    setRestoringId(migrationId);
    try {
      const resp = await fetch("/api/admin/migrate-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", migrationId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Restore failed");
      toast.success(
        data.alreadyRestored
          ? "This migration was already restored"
          : `Restored. Removed ${data.deleted} copied destination answer(s).`
      );
      await loadHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[calc(100vw-2rem)] w-[80vw] min-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Copy survey answers
          </DialogTitle>
          <DialogDescription>
            Copies matching answers onto the destination survey. The source
            (including default Safety Vitals) is never updated or deleted.
            Conflicts skip the destination row. Every copy is stored in history
            and can be restored.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "copy" ? "default" : "ghost"}
            onClick={() => setTab("copy")}
          >
            Copy answers
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "history" ? "default" : "ghost"}
            onClick={() => {
              setTab("history");
              void loadHistory();
            }}
          >
            <History className="h-4 w-4 mr-1.5" />
            History & restore
          </Button>
        </div>

        {tab === "copy" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-3 rounded-xl border p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Source (left untouched)
                </p>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select
                    value={sourceOrgId}
                    onValueChange={(v) => {
                      setSourceOrgId(v);
                      if (!destOrgId) setDestOrgId(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select source org" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Survey</Label>
                  <Select
                    value={sourceSurveyId}
                    onValueChange={setSourceSurveyId}
                    disabled={!sourceOrgId || loadingSourceSurveys}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingSourceSurveys ? "Loading…" : "Select source survey"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {sourceSurveys.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Destination (new copies only)
                </p>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={destOrgId} onValueChange={setDestOrgId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select destination org" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {destOrgOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Survey</Label>
                  <Select
                    value={destSurveyId}
                    onValueChange={setDestSurveyId}
                    disabled={!destOrgId || loadingDestSurveys}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingDestSurveys
                            ? "Loading…"
                            : "Select destination survey"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {destSurveyOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleCompare()}
                disabled={
                  comparing ||
                  !sourceOrgId ||
                  !destOrgId ||
                  !sourceSurveyId ||
                  !destSurveyId
                }
              >
                {comparing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Comparing…
                  </>
                ) : (
                  "Compare surveys"
                )}
              </Button>
            </div>

            {report && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat
                    label="Matched Qs"
                    value={
                      report.summary.exactMatches +
                      report.summary.strongMatches +
                      report.summary.weakMatches +
                      (report.summary.manualMatches || 0)
                    }
                  />
                  <Stat
                    label="Unmatched Qs"
                    value={report.summary.unmatchedQuestions}
                    warn={report.summary.unmatchedQuestions > 0}
                  />
                  <Stat
                    label="Will copy"
                    value={report.summary.migratableResponses}
                  />
                  <Stat
                    label="Already on dest"
                    value={report.summary.conflictingResponses}
                    warn={report.summary.conflictingResponses > 0}
                  />
                  <Stat
                    label="Duplicate source rows"
                    value={report.summary.duplicateSourceResponses || 0}
                    warn={(report.summary.duplicateSourceResponses || 0) > 0}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  {report.summary.sourceResponseCount} source answers ·{" "}
                  {report.summary.uniqueRespondents} respondents · exact{" "}
                  {report.summary.exactMatches} / strong {report.summary.strongMatches}{" "}
                  / weak {report.summary.weakMatches}
                  {report.summary.manualMatches
                    ? ` / manual ${report.summary.manualMatches}`
                    : ""}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!exporting}
                    onClick={() => handleExport("xlsx", "preview")}
                  >
                    {exporting === "preview-xlsx-preview" ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-1.5" />
                    )}
                    Backup Excel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!exporting}
                    onClick={() => handleExport("csv", "preview")}
                  >
                    {exporting === "preview-csv-preview" ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-1.5" />
                    )}
                    Backup CSV
                  </Button>
                </div>

                {report.blockingIssues.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                      <CircleAlert className="h-4 w-4" />
                      Conflicts / blockers
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {report.blockingIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.softWarnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {report.softWarnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-semibold">Dimensions</p>
                  <p className="text-xs text-muted-foreground">
                    Source codes: {report.dimensions.sourceCodes.join(", ") || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dest survey codes:{" "}
                    {report.dimensions.destSurveyCodes.join(", ") || "—"}
                  </p>
                  {report.dimensions.missingOnDestSurvey.length > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Missing on dest survey:{" "}
                      {report.dimensions.missingOnDestSurvey.join(", ")}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <div className="px-3 py-2 border-b bg-muted/40 text-sm font-semibold">
                    Question mapping
                  </div>
                  <p className="px-3 py-2 text-xs text-muted-foreground border-b">
                    Search by destination number, dimension, or question text.
                    Each row shows the dest dimension and which source question
                    already maps there (for example Q16 [SC]). Same-dimension
                    questions are listed first. Auto-matches stay collapsed until
                    you click Change mapping.
                  </p>
                  <div className="max-h-[28rem] overflow-y-auto divide-y">
                    {report.matches.map((m) => {
                      const dimMismatch = dimensionLooksDifferent(
                        m.sourceDimensionCode,
                        m.destDimensionCode,
                        m.sourceDimension,
                        m.destDimension
                      );
                      const showMapper =
                        m.status === "unmatched" ||
                        m.status === "manual" ||
                        dimMismatch ||
                        !!remappingIds[m.sourceQuestionId];
                      const destMeta = m.destQuestionId
                        ? destById.get(m.destQuestionId)
                        : undefined;
                      const stats = report.sourceAnswerStats?.[m.sourceQuestionId];
                      const avg =
                        stats?.averageScore != null
                          ? stats.averageScore.toFixed(1)
                          : null;
                      const sourceOpts = showMapper
                        ? (m.sourceOptions || []).filter(Boolean)
                        : [];
                      const destOpts = showMapper
                        ? (m.destOptions || destMeta?.options || []).filter(Boolean)
                        : [];
                      const copyOpts = destOpts.length ? destOpts : sourceOpts;
                      const reverseOn = !!answerReverse[m.sourceQuestionId];
                      const destNegative =
                        m.destReverseScore ?? destMeta?.reverseScore ?? false;
                      const originalCounts = showMapper
                        ? mappedAnswerCounts(
                            stats?.counts,
                            sourceOpts,
                            sourceOpts,
                            false
                          )
                        : [];
                      const copiedCounts = showMapper
                        ? mappedAnswerCounts(
                            stats?.counts,
                            sourceOpts,
                            copyOpts,
                            reverseOn
                          )
                        : [];
                      return (
                      <div
                        key={m.sourceQuestionId}
                        className="px-3 py-2 text-sm grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] gap-2 items-start"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium whitespace-normal break-words">
                            {m.sourceOrder != null ? `${m.sourceOrder + 1}. ` : ""}
                            {m.sourceText}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {m.sourceDimensionCode || "no code"}
                            </span>
                            {polarityBadge(m.sourceReverseScore)}
                            {stats && stats.responseCount > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                Avg {avg || "—"} · n={stats.responseCount}
                              </span>
                            )}
                          </div>
                          {showMapper && stats && stats.responseCount > 0 && (
                            <AnswerMix counts={stats.counts} />
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          {statusBadge(m.status)}
                          {m.warnings[0] && (
                            <span className="text-[10px] text-amber-600 text-center max-w-[140px]">
                              {m.warnings[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 space-y-2">
                          {m.destQuestionId && m.status !== "unmatched" && (
                            <>
                              <p className="font-medium whitespace-normal break-words">
                                {m.destOrder != null ? `${m.destOrder + 1}. ` : ""}
                                {m.destText}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {m.destDimensionCode || "no code"}
                                </span>
                                {dimMismatch && (
                                  <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    Different dimension
                                  </span>
                                )}
                                {!showMapper && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    disabled={comparing}
                                    onClick={() =>
                                      setRemappingIds((prev) => ({
                                        ...prev,
                                        [m.sourceQuestionId]: true,
                                      }))
                                    }
                                  >
                                    Change mapping
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                          {showMapper && (
                          <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-800/80">
                              <DestMapPicker
                                value={m.destQuestionId}
                                options={report.destQuestionOptions || []}
                                mappedFromByDest={mappedFromByDest}
                                sourceQuestionId={m.sourceQuestionId}
                                sourceDimensionCode={m.sourceDimensionCode}
                                sourceDimension={m.sourceDimension}
                                disabled={comparing}
                                onSelect={(destId) => {
                                  void applyOverride(m.sourceQuestionId, destId);
                                }}
                              />
                              {originalCounts.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                    Original answers
                                  </p>
                                  <AnswerMix counts={originalCounts} />
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                  Polarity
                                </span>
                                {polarityBadge(m.sourceReverseScore)}
                                {m.destQuestionId && (
                                  <>
                                    <span className="text-[10px] text-slate-500">→</span>
                                    {polarityBadge(destNegative)}
                                  </>
                                )}
                                <div className="ml-auto inline-flex overflow-hidden rounded-md border border-slate-300 text-[11px] font-medium dark:border-slate-600">
                                  <button
                                    type="button"
                                    disabled={comparing || !m.destQuestionId}
                                    className={`px-2 py-1 ${
                                      !reverseOn
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                    } disabled:opacity-50`}
                                    onClick={() =>
                                      setAnswerReverse((prev) => ({
                                        ...prev,
                                        [m.sourceQuestionId]: false,
                                      }))
                                    }
                                  >
                                    Keep
                                  </button>
                                  <button
                                    type="button"
                                    disabled={comparing || !m.destQuestionId}
                                    className={`px-2 py-1 ${
                                      reverseOn
                                        ? "bg-rose-600 text-white"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                    } disabled:opacity-50`}
                                    onClick={() =>
                                      setAnswerReverse((prev) => ({
                                        ...prev,
                                        [m.sourceQuestionId]: true,
                                      }))
                                    }
                                  >
                                    Reverse
                                  </button>
                                </div>
                              </div>
                              {m.destQuestionId && copiedCounts.length > 0 && (
                                <div className="space-y-1">
                                  <p
                                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                                      reverseOn
                                        ? "text-rose-700 dark:text-rose-300"
                                        : "text-slate-600 dark:text-slate-300"
                                    }`}
                                  >
                                    {reverseOn ? "Copied as (reversed)" : "Will copy as"}
                                  </p>
                                  <AnswerMix counts={copiedCounts} />
                                </div>
                              )}
                              {m.destQuestionId && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 self-start text-xs"
                                  disabled={comparing}
                                  onClick={() =>
                                    void applyOverride(m.sourceQuestionId, null)
                                  }
                                >
                                  Clear mapping
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked disabled />
                    Conflicts never overwrite destination answers. Source answers
                    stay on Safety Vitals / the source survey.
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={confirmMigrate}
                      onCheckedChange={(v) => setConfirmMigrate(Boolean(v))}
                      disabled={hardBlockCount > 0}
                    />
                    I reviewed the comparison and backup, and want to copy answers
                  </label>
                  {hardBlockCount === 0 &&
                    report.summary.migratableResponses > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready to copy {report.summary.migratableResponses} answer(s)
                        {report.summary.conflictingResponses > 0
                          ? ` · ${report.summary.conflictingResponses} already on dest`
                          : ""}
                        {(report.summary.duplicateSourceResponses || 0) > 0
                          ? ` · ${report.summary.duplicateSourceResponses} extra source rows skipped`
                          : ""}
                      </p>
                    )}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Restore deletes only the copied destination rows. Source answers
                are never changed.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadHistory()}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
            {loadingHistory && migrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : migrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No copies yet. Compare and copy answers first.
              </p>
            ) : (
              <div className="space-y-2">
                {migrations.map((m) => (
                  <div key={m.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {m.source_survey_title} → {m.dest_survey_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.source_org_name} → {m.dest_org_name} ·{" "}
                          {new Date(m.created_at).toLocaleString()}
                          {m.created_by_email ? ` · ${m.created_by_email}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          m.status === "restored"
                            ? "secondary"
                            : m.status === "completed"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {m.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Copied {m.copied_count} · skipped conflicts {m.skipped_conflict}{" "}
                      · unmatched {m.skipped_unmatched}
                      {m.failed_count ? ` · failed ${m.failed_count}` : ""}
                    </p>
                    {m.restored_at && (
                      <p className="text-xs text-muted-foreground">
                        Restored {new Date(m.restored_at).toLocaleString()}
                        {m.restored_by_email ? ` · ${m.restored_by_email}` : ""}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!!exporting}
                        onClick={() => handleExport("xlsx", "migration", m.id)}
                      >
                        {exporting === `migration-xlsx-${m.id}` ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-1.5" />
                        )}
                        Excel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!!exporting}
                        onClick={() => handleExport("csv", "migration", m.id)}
                      >
                        {exporting === `migration-csv-${m.id}` ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-1.5" />
                        )}
                        CSV
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          m.status === "restored" || restoringId === m.id
                        }
                        onClick={() => void handleRestore(m.id)}
                      >
                        {restoringId === m.id ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                        )}
                        Restore
                      </Button>
                    </div>
                    {lastMigrationId === m.id && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Latest copy — source survey was not modified.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={migrating}
          >
            Close
          </Button>
          {tab === "copy" && (
            <Button
              type="button"
              onClick={handleMigrate}
              disabled={
                migrating ||
                !report ||
                !confirmMigrate ||
                hardBlockCount > 0 ||
                report.summary.migratableResponses === 0
              }
            >
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying…
                </>
              ) : (
                "Copy answers"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          warn ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
