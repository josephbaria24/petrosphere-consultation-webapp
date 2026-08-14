"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  CircleAlert,
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
    unmatchedQuestions: number;
    sourceResponseCount: number;
    uniqueRespondents: number;
    migratableResponses: number;
    conflictingResponses: number;
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
    sourceOrder: number | null;
    destQuestionId: string | null;
    destText: string | null;
    destDimensionCode: string | null;
    status: "exact" | "strong" | "weak" | "unmatched";
    warnings: string[];
  }>;
  blockingIssues: string[];
  softWarnings: string[];
  canMigrate: boolean;
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
  return <Badge variant="destructive">Unmatched</Badge>;
}

export function MigrateResultsDialog({
  open,
  onOpenChange,
  organizations,
  initialSourceOrgId,
}: Props) {
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
  const [report, setReport] = useState<CompareReport | null>(null);
  const [skipConflicts, setSkipConflicts] = useState(true);
  const [confirmMigrate, setConfirmMigrate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReport(null);
    setConfirmMigrate(false);
    setSourceSurveyId("");
    setDestSurveyId("");
    if (initialSourceOrgId) setSourceOrgId(initialSourceOrgId);
  }, [open, initialSourceOrgId]);

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
        (data || []).map((s: any) => ({
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
    void loadSurveys(sourceOrgId, "source");
  }, [open, sourceOrgId, loadSurveys]);

  useEffect(() => {
    if (!open) return;
    setDestSurveyId("");
    setReport(null);
    void loadSurveys(destOrgId, "dest");
  }, [open, destOrgId, loadSurveys]);

  const destOrgOptions = useMemo(
    () => organizations.filter((o) => o.id !== sourceOrgId),
    [organizations, sourceOrgId]
  );

  const hardBlockCount = useMemo(() => {
    if (!report) return 0;
    return report.blockingIssues.filter((i) => !i.includes("already exist"))
      .length;
  }, [report]);

  const handleCompare = async () => {
    if (!sourceOrgId || !destOrgId || !sourceSurveyId || !destSurveyId) {
      toast.error("Select source/destination org and surveys");
      return;
    }
    setComparing(true);
    setReport(null);
    setConfirmMigrate(false);
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
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Compare failed");
      setReport(data);
      toast.success("Comparison ready — review conflicts before migrating");
    } catch (err: any) {
      toast.error(err.message || "Compare failed");
    } finally {
      setComparing(false);
    }
  };

  const handleMigrate = async () => {
    if (!report || !confirmMigrate) return;
    if (hardBlockCount > 0) {
      toast.error("Resolve blocking conflicts before migrating");
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
          skipConflicts,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Migration failed");
      toast.success(
        `Moved ${data.moved} response(s). Skipped conflicts: ${data.skippedConflict}. Unmatched skipped: ${data.skippedUnmatched}.`
      );
      if (data.failed) {
        toast.error(`${data.failed} update(s) failed`);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[min(56rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Migrate survey results
          </DialogTitle>
          <DialogDescription>
            Compare source and destination surveys first. Conflicts in questions,
            dimensions, and existing responses are flagged before anything moves.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Source
            </p>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select
                value={sourceOrgId}
                onValueChange={(v) => {
                  setSourceOrgId(v);
                  if (v === destOrgId) setDestOrgId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source org" />
                </SelectTrigger>
                <SelectContent className="z-[90]">
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
                <SelectContent className="z-[90]">
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
              Destination
            </p>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={destOrgId} onValueChange={setDestOrgId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination org" />
                </SelectTrigger>
                <SelectContent className="z-[90]">
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
                      loadingDestSurveys ? "Loading…" : "Select destination survey"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-[90]">
                  {destSurveys.map((s) => (
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
            onClick={handleCompare}
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
                  report.summary.weakMatches
                }
              />
              <Stat
                label="Unmatched Qs"
                value={report.summary.unmatchedQuestions}
                warn={report.summary.unmatchedQuestions > 0}
              />
              <Stat
                label="Migratable"
                value={report.summary.migratableResponses}
              />
              <Stat
                label="Conflicts"
                value={report.summary.conflictingResponses}
                warn={report.summary.conflictingResponses > 0}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {report.summary.sourceResponseCount} source responses ·{" "}
              {report.summary.uniqueRespondents} respondents · exact{" "}
              {report.summary.exactMatches} / strong {report.summary.strongMatches}{" "}
              / weak {report.summary.weakMatches}
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
                Source codes:{" "}
                {report.dimensions.sourceCodes.join(", ") || "—"}
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
              {report.dimensions.missingInDestOrgCatalog.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Missing in dest org catalog:{" "}
                  {report.dimensions.missingInDestOrgCatalog.join(", ")}
                </p>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/40 text-sm font-semibold">
                Question mapping
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {report.matches.map((m) => (
                  <div
                    key={m.sourceQuestionId}
                    className="px-3 py-2 text-sm grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-start"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate" title={m.sourceText}>
                        {m.sourceOrder != null ? `${m.sourceOrder + 1}. ` : ""}
                        {m.sourceText}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.sourceDimensionCode || "no code"}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {statusBadge(m.status)}
                      {m.warnings[0] && (
                        <span className="text-[10px] text-amber-600 text-center max-w-[140px]">
                          {m.warnings[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {m.destQuestionId ? (
                        <>
                          <p className="font-medium truncate" title={m.destText || ""}>
                            {m.destText}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.destDimensionCode || "no code"}
                          </p>
                        </>
                      ) : (
                        <p className="text-destructive text-xs font-medium">
                          No destination match
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={skipConflicts}
                  onCheckedChange={(v) => setSkipConflicts(Boolean(v))}
                />
                Skip responses that already exist on the destination (recommended)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={confirmMigrate}
                  onCheckedChange={(v) => setConfirmMigrate(Boolean(v))}
                  disabled={hardBlockCount > 0}
                />
                I reviewed the comparison and want to migrate responses
              </label>
              {hardBlockCount === 0 && report.summary.migratableResponses > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready to migrate {report.summary.migratableResponses} response(s)
                  {skipConflicts && report.summary.conflictingResponses > 0
                    ? ` (skipping ${report.summary.conflictingResponses} conflicts)`
                    : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={migrating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMigrate}
            disabled={
              migrating ||
              !report ||
              !confirmMigrate ||
              hardBlockCount > 0 ||
              (report.summary.migratableResponses === 0 &&
                !(report.summary.conflictingResponses > 0 && !skipConflicts))
            }
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrating…
              </>
            ) : (
              "Migrate results"
            )}
          </Button>
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
