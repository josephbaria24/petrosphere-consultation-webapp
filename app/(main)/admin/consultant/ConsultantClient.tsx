"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileUp,
  FolderOpen,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "@/components/icons";
import Link from "next/link";
import { useApp } from "../../../../components/app/AppProvider";
import { supabase } from "../../../../lib/supabaseClient";
import { getClientCookie } from "../../../../lib/cookies-client";
import {
  ensureSafetyVitalsDimensionSet,
  fetchSafetyVitalsScoringCsv,
  parseSafetyVitalsScoringCsv,
  SAFETY_VITALS_DIMENSION_SET_NAME,
  uniqueDimensionsFromDrafts,
} from "../../../../lib/safety-vitals-scoring-csv";
import { buildPublicSurveyUrl } from "../../../../lib/public-survey-url";
import { requestDeleteSurvey } from "../../../../lib/delete-survey-client";
import { readCsvFileText, type ImportQuestionDraft } from "../../../../lib/survey-csv";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../@/components/ui/alert-dialog";

const STORAGE_KEY = "safety-vitals-consultant-draft-v2";

type OrgOption = { id: string; name: string };

type CreatedSurveyState = {
  id: string;
  slug: string | null;
};

type OrgSurveyOption = {
  id: string;
  slug: string | null;
  title: string;
  created_at: string;
  is_published: boolean;
  respondentCount: number;
};

type SurveyStartMode = "existing" | "new";

type DimensionSetSynced = {
  setId: string;
  dimensionCount: number;
};

type QuestionBank = {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  company_label?: string | null;
  questions: ImportQuestionDraft[];
  created_at?: string;
  updated_at?: string;
  organizations?: { name: string } | { name: string }[] | null;
};

type ConsultantDraft = {
  questions: ImportQuestionDraft[];
  selectedOrgId: string;
  companyName: string;
  title: string;
  description: string;
  period: string;
  bankName: string;
  createdSurvey: CreatedSurveyState | null;
  dimensionSetSynced: DimensionSetSynced | null;
  savedAt: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function currentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function defaultDescription() {
  return "Safety culture assessment administered on-site by a Safety Vitals consultant.";
}

function normalizeQuestions(list: ImportQuestionDraft[]): ImportQuestionDraft[] {
  return (list || []).map((q, i) => ({
    ...q,
    localId: q.localId || `q-${i}-${Date.now()}`,
    options: Array.isArray(q.options) ? q.options : [],
    translated_options: Array.isArray(q.translated_options)
      ? q.translated_options
      : [],
    errors: Array.isArray(q.errors) ? q.errors : [],
    order_index: q.order_index ?? i,
    reverse_score: !!q.reverse_score,
    scoring_type: q.scoring_type || "positive",
    question_type: q.question_type || "radio",
  }));
}

function readDraft(): ConsultantDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsultantDraft;
    if (!Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function orgNameFromBank(bank: QuestionBank): string {
  const o = bank.organizations;
  if (!o) return "";
  if (Array.isArray(o)) return o[0]?.name || "";
  return o.name || "";
}

/** Solid card tones by dimension code — light + dark. */
const DIMENSION_BG_TONES = [
  "bg-orange-100 border-orange-200 dark:bg-orange-950/70 dark:border-orange-800",
  "bg-sky-100 border-sky-200 dark:bg-sky-950/70 dark:border-sky-800",
  "bg-emerald-100 border-emerald-200 dark:bg-emerald-950/70 dark:border-emerald-800",
  "bg-amber-100 border-amber-200 dark:bg-amber-950/70 dark:border-amber-800",
  "bg-teal-100 border-teal-200 dark:bg-teal-950/70 dark:border-teal-800",
  "bg-rose-100 border-rose-200 dark:bg-rose-950/70 dark:border-rose-800",
  "bg-indigo-100 border-indigo-200 dark:bg-indigo-950/70 dark:border-indigo-800",
  "bg-lime-100 border-lime-200 dark:bg-lime-950/70 dark:border-lime-800",
  "bg-cyan-100 border-cyan-200 dark:bg-cyan-950/70 dark:border-cyan-800",
  "bg-fuchsia-100 border-fuchsia-200 dark:bg-fuchsia-950/70 dark:border-fuchsia-800",
  "bg-yellow-100 border-yellow-200 dark:bg-yellow-950/70 dark:border-yellow-800",
  "bg-blue-100 border-blue-200 dark:bg-blue-950/70 dark:border-blue-800",
  "bg-green-100 border-green-200 dark:bg-green-950/70 dark:border-green-800",
  "bg-stone-100 border-stone-200 dark:bg-stone-900/80 dark:border-stone-700",
  "bg-zinc-100 border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-700",
] as const;

function dimensionTone(code?: string, fallbackIndex = 0): string {
  const key = (code || "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % 997;
  const idx = key ? hash % DIMENSION_BG_TONES.length : fallbackIndex % DIMENSION_BG_TONES.length;
  return DIMENSION_BG_TONES[idx];
}

function adminHeaders(extra?: HeadersInit): HeadersInit {
  const adminId = getClientCookie("admin_id");
  return {
    ...(extra || {}),
    ...(adminId ? { "x-admin-id": adminId } : {}),
  };
}

async function attachOrgNames(rows: QuestionBank[]): Promise<QuestionBank[]> {
  const orgIds = Array.from(new Set(rows.map((r) => r.org_id).filter(Boolean)));
  if (!orgIds.length) return rows;
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds);
  const nameById: Record<string, string> = {};
  (orgs || []).forEach((o: { id: string; name: string }) => {
    nameById[o.id] = o.name;
  });
  return rows.map((r) => ({
    ...r,
    organizations: nameById[r.org_id] ? { name: nameById[r.org_id] } : null,
  }));
}

export default function ConsultantClient() {
  const { user, org } = useApp();
  const [hydrated, setHydrated] = useState(false);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [questions, setQuestions] = useState<ImportQuestionDraft[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [expandingQuestions, setExpandingQuestions] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(defaultDescription());
  const [period, setPeriod] = useState(currentPeriod());
  const [createdSurvey, setCreatedSurvey] = useState<CreatedSurveyState | null>(
    null
  );
  const [orgSurveys, setOrgSurveys] = useState<OrgSurveyOption[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [surveyMode, setSurveyMode] = useState<SurveyStartMode>("existing");
  const [selectedExistingSurveyId, setSelectedExistingSurveyId] = useState("");
  const [deletingSurvey, setDeletingSurvey] = useState(false);
  const [dimensionSetSynced, setDimensionSetSynced] =
    useState<DimensionSetSynced | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) || null,
    [organizations, selectedOrgId]
  );

  const targetOrgId = selectedOrgId || org?.id || "";

  const liveSurveyUrl = useMemo(() => {
    if (!createdSurvey) return null;
    return buildPublicSurveyUrl({
      surveyId: createdSurvey.id,
      slug: createdSurvey.slug,
      period,
      orgId: targetOrgId || null,
    });
  }, [createdSurvey, period, targetOrgId]);

  const dimensionSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) {
      const key = `${q.dimension_code} · ${q.dimension || "Unassigned"}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions]);

  const uniqueDimensionCount = useMemo(
    () => uniqueDimensionsFromDrafts(questions).length,
    [questions]
  );

  const buildDraft = useCallback(
    (): ConsultantDraft => ({
      questions,
      selectedOrgId,
      companyName,
      title,
      description,
      period,
      bankName,
      createdSurvey,
      dimensionSetSynced,
      savedAt: new Date().toISOString(),
    }),
    [
      questions,
      selectedOrgId,
      companyName,
      title,
      description,
      period,
      bankName,
      createdSurvey,
      dimensionSetSynced,
    ]
  );

  const persistDraft = useCallback(
    (draft?: ConsultantDraft, silent = false) => {
      const payload = draft ?? buildDraft();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSavedAt(payload.savedAt);
        if (!silent) toast.success("Draft saved");
      } catch (err) {
        console.error(err);
        if (!silent) toast.error("Could not save draft to this browser");
      }
    },
    [buildDraft]
  );

  const fetchBanks = useCallback(async (orgId?: string) => {
    setLoadingBanks(true);
    try {
      // Prefer direct Supabase (RLS disabled on this table), same pattern as Dimensions.
      let query = supabase
        .from("consultant_question_banks")
        .select(
          "id, org_id, name, description, company_label, questions, created_at, updated_at"
        )
        .order("updated_at", { ascending: false });
      if (orgId) query = query.eq("org_id", orgId);

      const { data, error } = await query;
      if (!error && data) {
        const withNames = await attachOrgNames(
          (data as QuestionBank[]).map((b) => ({
            ...b,
            questions: normalizeQuestions(b.questions || []),
          }))
        );
        setBanks(withNames);
        return;
      }

      // Fallback to admin API (sends x-admin-id for cookie edge cases)
      const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
      const res = await fetch(`/api/admin/consultant-banks${qs}`, {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error ||
            error?.message ||
            "Failed to load question banks. Did you run the migration?"
        );
      }
      const apiData = (await res.json()) as QuestionBank[];
      setBanks(
        (apiData || []).map((b) => ({
          ...b,
          questions: normalizeQuestions(b.questions || []),
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load banks");
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setQuestions(normalizeQuestions(draft.questions || []));
      setSelectedOrgId(draft.selectedOrgId || "");
      setCompanyName(draft.companyName || "");
      setTitle(draft.title || "");
      setDescription(draft.description || defaultDescription());
      setPeriod(draft.period || currentPeriod());
      setBankName(draft.bankName || "");
      setCreatedSurvey(draft.createdSurvey || null);
      setDimensionSetSynced(draft.dimensionSetSynced || null);
      setLastSavedAt(draft.savedAt || null);
    }
    setHydrated(true);

    void (async () => {
      try {
        const res = await fetch("/api/admin/all-organizations", {
          credentials: "include",
          headers: adminHeaders(),
        });
        if (res.ok) {
          const data = (await res.json()) as OrgOption[];
          setOrganizations(data || []);
          if (!draft?.selectedOrgId && org?.id) {
            setSelectedOrgId(org.id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [org?.id]);

  useEffect(() => {
    if (!hydrated) return;
    void fetchBanks(selectedOrgId || undefined);
  }, [hydrated, selectedOrgId, fetchBanks]);

  const fetchOrgSurveys = useCallback(async (orgId: string) => {
    if (!orgId) {
      setOrgSurveys([]);
      setSelectedExistingSurveyId("");
      return;
    }
    setLoadingSurveys(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, slug, title, created_at, is_published")
        .eq("org_id", orgId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      const baseRows = (data || []) as Omit<OrgSurveyOption, "respondentCount">[];

      let countsBySurvey: Record<string, number> = {};
      if (baseRows.length > 0) {
        const surveyIds = baseRows.map((s) => s.id);
        const { data: questions, error: qErr } = await supabase
          .from("survey_questions")
          .select("id, survey_id")
          .in("survey_id", surveyIds);

        if (qErr) throw qErr;

        const questionToSurvey = new Map<string, string>();
        for (const q of questions || []) {
          questionToSurvey.set(q.id, q.survey_id);
        }

        const questionIds = Array.from(questionToSurvey.keys());
        if (questionIds.length > 0) {
          // Chunk to avoid URL/query limits with large instruments
          const chunkSize = 200;
          const usersBySurvey = new Map<string, Set<string>>();

          for (let i = 0; i < questionIds.length; i += chunkSize) {
            const chunk = questionIds.slice(i, i + chunkSize);
            const { data: responses, error: rErr } = await supabase
              .from("responses")
              .select("user_id, question_id")
              .in("question_id", chunk);

            if (rErr) throw rErr;

            for (const row of responses || []) {
              if (!row.user_id || !row.question_id) continue;
              const surveyId = questionToSurvey.get(row.question_id);
              if (!surveyId) continue;
              if (!usersBySurvey.has(surveyId)) {
                usersBySurvey.set(surveyId, new Set());
              }
              usersBySurvey.get(surveyId)!.add(row.user_id);
            }
          }

          for (const [surveyId, users] of usersBySurvey) {
            countsBySurvey[surveyId] = users.size;
          }
        }
      }

      const rows: OrgSurveyOption[] = baseRows.map((s) => ({
        ...s,
        respondentCount: countsBySurvey[s.id] || 0,
      }));
      setOrgSurveys(rows);

      setSelectedExistingSurveyId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        if (createdSurvey?.id && rows.some((r) => r.id === createdSurvey.id)) {
          return createdSurvey.id;
        }
        return rows[0]?.id || "";
      });
      setSurveyMode(rows.length > 0 ? "existing" : "new");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load org surveys"
      );
      setOrgSurveys([]);
    } finally {
      setLoadingSurveys(false);
    }
  }, [createdSurvey?.id]);

  useEffect(() => {
    if (!hydrated) return;
    void fetchOrgSurveys(targetOrgId);
  }, [hydrated, targetOrgId, fetchOrgSurveys]);

  const selectedExistingSurvey = useMemo(
    () => orgSurveys.find((s) => s.id === selectedExistingSurveyId) || null,
    [orgSurveys, selectedExistingSurveyId]
  );

  const syncDimensionSet = useCallback(
    async (drafts: ImportQuestionDraft[]) => {
      const result = await ensureSafetyVitalsDimensionSet(
        supabase,
        drafts,
        targetOrgId || null
      );
      setDimensionSetSynced(result);
      return result;
    },
    [targetOrgId]
  );

  const applyParsed = useCallback(
    async (drafts: ImportQuestionDraft[], sourceLabel: string) => {
      const normalized = normalizeQuestions(drafts);
      setQuestions(normalized);
      setCreatedSurvey(null);
      setShowQuestions(false);

      const nextTitle =
        title.trim() ||
        (companyName.trim()
          ? `${companyName.trim()} Safety Culture Survey`
          : selectedOrg
            ? `${selectedOrg.name} Safety Culture Survey`
            : "Safety Vitals On-site Survey");
      if (!title.trim()) setTitle(nextTitle);
      if (!bankName.trim()) {
        setBankName(
          companyName.trim()
            ? `${companyName.trim()} — Safety Vitals instrument`
            : selectedOrg
              ? `${selectedOrg.name} — Safety Vitals instrument`
              : "Safety Vitals Scoring instrument"
        );
      }

      let synced: DimensionSetSynced | null = null;
      try {
        synced = await syncDimensionSet(normalized);
        toast.success(
          `Loaded ${normalized.length} questions from ${sourceLabel}`
        );
      } catch (err) {
        console.error(err);
        toast.warning(
          `Questions loaded, but dimension sync failed: ${
            err instanceof Error ? err.message : "unknown error"
          }`
        );
      }

      const savedAt = new Date().toISOString();
      persistDraft(
        {
          questions: normalized,
          selectedOrgId,
          companyName,
          title: nextTitle,
          description,
          period,
          bankName:
            bankName.trim() ||
            (companyName.trim()
              ? `${companyName.trim()} — Safety Vitals instrument`
              : "Safety Vitals Scoring instrument"),
          createdSurvey: null,
          dimensionSetSynced: synced,
          savedAt,
        },
        true
      );
    },
    [
      companyName,
      title,
      description,
      period,
      bankName,
      selectedOrgId,
      selectedOrg,
      syncDimensionSet,
      persistDraft,
    ]
  );

  const loadBuiltInCsv = useCallback(async () => {
    setLoadingCsv(true);
    try {
      const text = await fetchSafetyVitalsScoringCsv();
      const drafts = parseSafetyVitalsScoringCsv(text);
      await applyParsed(drafts, "Safety Vitals Scoring CSV");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load CSV");
    } finally {
      setLoadingCsv(false);
    }
  }, [applyParsed]);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLoadingCsv(true);
      try {
        const text = await readCsvFileText(file);
        const drafts = parseSafetyVitalsScoringCsv(text);
        await applyParsed(drafts, file.name);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Failed to parse CSV");
      } finally {
        setLoadingCsv(false);
      }
    },
    [applyParsed]
  );

  const updateQuestion = (
    localId: string,
    patch: Partial<ImportQuestionDraft>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        const next = { ...q, ...patch };
        if (patch.scoring_type !== undefined) {
          next.reverse_score = patch.scoring_type === "negative";
        }
        return next;
      })
    );
  };

  const removeQuestion = (localId: string) => {
    setQuestions((prev) =>
      prev
        .filter((q) => q.localId !== localId)
        .map((q, i) => ({ ...q, order_index: i }))
    );
  };

  const toggleShowQuestions = () => {
    if (showQuestions || expandingQuestions) {
      setShowQuestions(false);
      setExpandingQuestions(false);
      return;
    }
    setExpandingQuestions(true);
    // Let the spinner paint before mounting the full editor list
    requestAnimationFrame(() => {
      setTimeout(() => {
        setShowQuestions(true);
        setExpandingQuestions(false);
      }, 50);
    });
  };

  const handleSaveDraft = () => {
    if (questions.length === 0 && !companyName.trim() && !title.trim()) {
      toast.error("Nothing to save yet — load questions first.");
      return;
    }
    persistDraft();
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "Reset loaded questions and form fields? Saved org question banks are kept."
      )
    ) {
      return;
    }
    setQuestions([]);
    setCompanyName("");
    setTitle("");
    setDescription(defaultDescription());
    setPeriod(currentPeriod());
    setBankName("");
    setCreatedSurvey(null);
    setDimensionSetSynced(null);
    setLastSavedAt(null);
    setShowQuestions(false);
    setExpandingQuestions(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast.success("Consultant draft reset");
  };

  const handleSaveToOrgBank = async () => {
    if (!targetOrgId) {
      toast.error("Select the organization that will own this question set.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Load or edit questions before saving to the org repo.");
      return;
    }
    const name =
      bankName.trim() ||
      `${selectedOrg?.name || "Org"} — ${new Date().toLocaleDateString()}`;
    setSavingBank(true);
    try {
      const payload = {
        org_id: targetOrgId,
        name,
        description: description.trim() || null,
        company_label: companyName.trim() || null,
        questions,
        created_by: getClientCookie("admin_id") || user?.id || null,
      };

      const { data, error } = await supabase
        .from("consultant_question_banks")
        .insert([payload])
        .select(
          "id, org_id, name, description, company_label, questions, created_at, updated_at"
        )
        .single();

      if (error) {
        // Fallback API if direct insert is blocked
        const res = await fetch("/api/admin/consultant-banks", {
          method: "POST",
          credentials: "include",
          headers: adminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            body.error ||
              error.message ||
              "Failed to save question set. Confirm the migration was applied."
          );
        }
        toast.success(`Saved “${name}” to ${selectedOrg?.name || "org"} repo`);
      } else if (data) {
        toast.success(`Saved “${name}” to ${selectedOrg?.name || "org"} repo`);
      }

      setBankName(name);
      await fetchBanks(selectedOrgId || undefined);
      persistDraft(undefined, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank");
    } finally {
      setSavingBank(false);
    }
  };

  const handleLoadBank = (bank: QuestionBank) => {
    const normalized = normalizeQuestions(bank.questions || []);
    setQuestions(normalized);
    setSelectedOrgId(bank.org_id);
    setCompanyName(bank.company_label || "");
    setBankName(bank.name);
    setTitle(
      bank.company_label
        ? `${bank.company_label} Safety Culture Survey`
        : `${orgNameFromBank(bank) || "Org"} Safety Culture Survey`
    );
    setCreatedSurvey(null);
    setExpandingQuestions(true);
    setShowQuestions(false);
    // Defer heavy editor mount so the loading spinner paints first
    requestAnimationFrame(() => {
      setTimeout(() => {
        setShowQuestions(true);
        setExpandingQuestions(false);
      }, 50);
    });
    toast.success(`Loaded ${normalized.length} questions from “${bank.name}”`);
  };

  const handleDeleteBank = async (bank: QuestionBank) => {
    if (!window.confirm(`Delete question set “${bank.name}”?`)) return;
    try {
      const { error } = await supabase
        .from("consultant_question_banks")
        .delete()
        .eq("id", bank.id);

      if (error) {
        const res = await fetch(
          `/api/admin/consultant-banks?id=${encodeURIComponent(bank.id)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: adminHeaders(),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || error.message || "Delete failed");
        }
      }

      toast.success("Question set deleted");
      await fetchBanks(selectedOrgId || undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const formatDbError = (err: unknown): string => {
    if (!err) return "Unknown database error";
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "object") {
      const e = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      return [e.message, e.details, e.hint, e.code ? `(${e.code})` : ""]
        .filter(Boolean)
        .join(" — ");
    }
    return String(err);
  };

  const handleUseExistingSurvey = () => {
    if (!selectedExistingSurvey) {
      toast.error("Select an existing survey first.");
      return;
    }
    const next = {
      id: selectedExistingSurvey.id,
      slug: selectedExistingSurvey.slug,
    };
    setCreatedSurvey(next);
    persistDraft(
      {
        ...buildDraft(),
        createdSurvey: next,
        savedAt: new Date().toISOString(),
      },
      true
    );
    const url = buildPublicSurveyUrl({
      surveyId: next.id,
      slug: next.slug,
      period,
      orgId: targetOrgId,
    });
    toast.success(
      `Using existing survey — ${selectedExistingSurvey.title || "Untitled"}`
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDeleteExistingSurvey = async () => {
    if (!selectedExistingSurvey) {
      toast.error("Select a survey to delete.");
      return;
    }
    setDeletingSurvey(true);
    try {
      const surveyId = selectedExistingSurvey.id;
      await requestDeleteSurvey(surveyId);

      if (createdSurvey?.id === surveyId) {
        setCreatedSurvey(null);
        persistDraft(
          {
            ...buildDraft(),
            createdSurvey: null,
            savedAt: new Date().toISOString(),
          },
          true
        );
      }

      toast.success("Survey deleted");
      setSelectedExistingSurveyId("");
      await fetchOrgSurveys(targetOrgId);
    } catch (err) {
      toast.error(formatDbError(err) || "Failed to delete survey");
    } finally {
      setDeletingSurvey(false);
    }
  };

  const handleCreateAndStart = async () => {
    if (!targetOrgId) {
      toast.error(
        "Select the organization that will absorb these survey results."
      );
      return;
    }
    if (questions.length === 0) {
      toast.error("Load questions first (CSV or an org question set).");
      return;
    }
    const surveyTitle =
      title.trim() ||
      (companyName.trim()
        ? `${companyName.trim()} Safety Culture Survey`
        : selectedOrg
          ? `${selectedOrg.name} Safety Culture Survey`
          : "Safety Vitals On-site Survey");

    setSubmitting(true);
    try {
      try {
        await syncDimensionSet(questions);
      } catch (dimErr) {
        toast.warning(
          `Dimension set sync skipped: ${formatDbError(dimErr)}. Continuing…`
        );
      }

      const slugBase =
        slugify(companyName || selectedOrg?.name || surveyTitle) ||
        `consultant-${Date.now()}`;
      const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

      const basePayload: Record<string, unknown> = {
        title: surveyTitle,
        description: description.trim() || null,
        created_by: user?.id || null,
        slug,
        is_published: true,
        org_id: targetOrgId,
        target_company: companyName.trim() || selectedOrg?.name || null,
      };

      const attemptInsert = async (payload: Record<string, unknown>) =>
        supabase.from("surveys").insert([payload]).select("id, slug").single();

      let { data: survey, error: surveyError } = await attemptInsert(basePayload);

      if (
        surveyError &&
        formatDbError(surveyError).toLowerCase().includes("created_by")
      ) {
        ({ data: survey, error: surveyError } = await attemptInsert({
          ...basePayload,
          created_by: null,
        }));
      }

      if (
        surveyError &&
        formatDbError(surveyError).toLowerCase().includes("target_company")
      ) {
        const { target_company: _omit, ...withoutCompany } = basePayload;
        ({ data: survey, error: surveyError } = await attemptInsert({
          ...withoutCompany,
          created_by: null,
        }));
      }

      if (surveyError || !survey) {
        toast.error(formatDbError(surveyError) || "Failed to create survey");
        return;
      }

      const formattedQuestions = questions.map((q, i) => ({
        survey_id: survey.id,
        question_text: q.question_text.trim(),
        question_type: q.question_type || "radio",
        options: Array.isArray(q.options) ? q.options : null,
        order_index: q.order_index ?? i,
        is_required: q.is_required ?? true,
        dimension: q.dimension || null,
        dimension_code: q.dimension_code || null,
        translated_question: q.translated_question || null,
        scoring_type: q.scoring_type || null,
        max_score: q.max_score ?? 5,
        min_score: q.min_score ?? 1,
        reverse_score: !!q.reverse_score,
        translated_options:
          Array.isArray(q.translated_options) && q.translated_options.length
            ? q.translated_options
            : null,
        template_id: null,
      }));

      const chunkSize = 25;
      for (let i = 0; i < formattedQuestions.length; i += chunkSize) {
        const chunk = formattedQuestions.slice(i, i + chunkSize);
        const { error: questionError } = await supabase
          .from("survey_questions")
          .insert(chunk);

        if (questionError) {
          toast.error(
            `Survey created, but questions failed (${i}/${formattedQuestions.length} saved): ${formatDbError(questionError)}`
          );
          setCreatedSurvey({ id: survey.id, slug: survey.slug });
          return;
        }
      }

      setCreatedSurvey({ id: survey.id, slug: survey.slug });
      setSelectedExistingSurveyId(survey.id);
      setSurveyMode("existing");
      await fetchOrgSurveys(targetOrgId);
      persistDraft(
        {
          ...buildDraft(),
          createdSurvey: { id: survey.id, slug: survey.slug },
          savedAt: new Date().toISOString(),
        },
        true
      );

      const url = buildPublicSurveyUrl({
        surveyId: survey.id,
        slug: survey.slug,
        period,
        orgId: targetOrgId,
      });
      toast.success(
        `Survey ready for ${selectedOrg?.name || "org"} — opening take survey`
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(formatDbError(err) || "Unexpected error while starting survey");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!liveSurveyUrl) return;
    try {
      await navigator.clipboard.writeText(liveSurveyUrl);
      toast.success("Survey link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading consultant workspace…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultant</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bridge consultations to an organization: load or reuse an instrument,
            save it to that org&apos;s question repo, then publish a survey whose
            results land under the selected org.
          </p>
          {lastSavedAt && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Browser draft saved {new Date(lastSavedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="outline" className="gap-2" onClick={handleSaveDraft}>
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* 1. Target org */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            1. Organization (absorbs results)
          </CardTitle>
          <CardDescription>
            Choose the company org this consultation is for. New surveys and
            question banks are stored under this org.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-md">
            <Label>Target organization</Label>
            <Select
              value={selectedOrgId || undefined}
              onValueChange={(v) => {
                setSelectedOrgId(v);
                setCreatedSurvey(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedOrg && (
            <p className="text-xs text-muted-foreground">
              Results for surveys you start will be attributed to{" "}
              <span className="font-medium text-foreground">{selectedOrg.name}</span>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Org question repo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            2. Org question repo
          </CardTitle>
          <CardDescription>
            Saved instruments for consultation orgs. Switch org above to revisit
            previous consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="bankName">Set name</Label>
              <Input
                id="bankName"
                placeholder="e.g. Acme — Mar 2026 Safety Vitals"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="gap-2"
              disabled={savingBank || questions.length === 0 || !targetOrgId}
              onClick={() => void handleSaveToOrgBank()}
            >
              {savingBank ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save questions to org
            </Button>
          </div>

          {loadingBanks ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sets…
            </p>
          ) : banks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved question sets{selectedOrg ? ` for ${selectedOrg.name}` : ""} yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {banks.map((bank) => (
                <div
                  key={bank.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border p-3 bg-muted/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{bank.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {orgNameFromBank(bank) || "Org"} ·{" "}
                      {Array.isArray(bank.questions) ? bank.questions.length : 0}{" "}
                      questions
                      {bank.company_label ? ` · ${bank.company_label}` : ""}
                      {bank.updated_at
                        ? ` · ${new Date(bank.updated_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadBank(bank)}
                    >
                      Load
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void handleDeleteBank(bank)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Load / edit questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            3. Load &amp; edit questions
          </CardTitle>
          <CardDescription>
            Import the built-in Safety Vitals CSV, or edit the currently loaded
            set. Dimensions sync to{" "}
            <strong>{SAFETY_VITALS_DIMENSION_SET_NAME}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              onClick={() => void loadBuiltInCsv()}
              disabled={loadingCsv}
              className="gap-2"
            >
              {loadingCsv ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Load Safety Vitals Scoring CSV
            </Button>
            <div className="relative flex-1">
              <Input
                type="file"
                accept=".csv,text/csv"
                className="cursor-pointer"
                disabled={loadingCsv}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handleFileSelected(file);
                  e.target.value = "";
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <FileUp className="h-3 w-3" />
                Optional upload of the same scoring CSV format
              </p>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3 dark:border-orange-900 dark:bg-orange-950/40">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge
                    variant="secondary"
                    className="bg-white border border-orange-200 dark:bg-zinc-900 dark:border-orange-800 dark:text-orange-100"
                  >
                    {questions.length} questions
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-white/80 border-orange-200 dark:bg-zinc-900/80 dark:border-orange-800 dark:text-orange-100"
                  >
                    {uniqueDimensionCount} dimensions
                  </Badge>
                  {dimensionSetSynced && (
                    <Badge className="bg-orange-500 text-white border-orange-600 hover:bg-orange-500 dark:bg-orange-600 dark:border-orange-500">
                      Set: {SAFETY_VITALS_DIMENSION_SET_NAME}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white border-orange-200 hover:bg-orange-100 dark:bg-zinc-900 dark:border-orange-800 dark:hover:bg-orange-950 dark:text-orange-100"
                  disabled={expandingQuestions}
                  onClick={toggleShowQuestions}
                >
                  {expandingQuestions ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {expandingQuestions
                    ? "Loading questions…"
                    : showQuestions
                      ? "Hide questions"
                      : "Show / edit all questions"}
                  {!expandingQuestions &&
                    (showQuestions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </Button>
              </div>

              {expandingQuestions && (
                <div className="flex items-center justify-center gap-2 rounded-md border border-orange-200 bg-white py-10 text-sm text-muted-foreground dark:border-orange-900 dark:bg-zinc-950">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  Preparing {questions.length} questions for editing…
                </div>
              )}

              {!showQuestions && !expandingQuestions && (
                <div className="grid sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto text-sm">
                  {dimensionSummary.map(([name, count], i) => {
                    const code = name.split(" · ")[0] || "";
                    return (
                      <div
                        key={name}
                        className={`flex justify-between gap-2 rounded-md border px-3 py-1.5 ${dimensionTone(code, i)}`}
                      >
                        <span className="truncate font-medium text-foreground/90">{name}</span>
                        <span className="text-foreground/60 shrink-0 tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {showQuestions && !expandingQuestions && (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {questions.map((q, index) => (
                    <div
                      key={q.localId}
                      className={`rounded-md border p-3 space-y-2 shadow-sm ${dimensionTone(q.dimension_code, index)}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground/70 dark:text-foreground/80">
                          #{index + 1} · {q.dimension_code || "—"} ·{" "}
                          {q.dimension || "No dimension"}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive h-8 hover:bg-white/70 dark:hover:bg-black/30"
                          onClick={() => removeQuestion(q.localId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Question (EN)</Label>
                        <Textarea
                          className="min-h-[60px] text-sm bg-white/90 border-white/60 dark:bg-zinc-950/80 dark:border-zinc-700"
                          value={q.question_text}
                          onChange={(e) =>
                            updateQuestion(q.localId, {
                              question_text: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Translated (FIL)</Label>
                        <Textarea
                          className="min-h-[48px] text-sm bg-white/90 border-white/60 dark:bg-zinc-950/80 dark:border-zinc-700"
                          value={q.translated_question || ""}
                          onChange={(e) =>
                            updateQuestion(q.localId, {
                              translated_question: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Dimension code</Label>
                          <Input
                            className="bg-white/90 border-white/60 dark:bg-zinc-950/80 dark:border-zinc-700"
                            value={q.dimension_code}
                            onChange={(e) =>
                              updateQuestion(q.localId, {
                                dimension_code: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Dimension name</Label>
                          <Input
                            className="bg-white/90 border-white/60 dark:bg-zinc-950/80 dark:border-zinc-700"
                            value={q.dimension}
                            onChange={(e) =>
                              updateQuestion(q.localId, {
                                dimension: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Scoring</Label>
                          <Select
                            value={q.scoring_type || "positive"}
                            onValueChange={(v) =>
                              updateQuestion(q.localId, { scoring_type: v })
                            }
                          >
                            <SelectTrigger className="bg-white/90 border-white/60 dark:bg-zinc-950/80 dark:border-zinc-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="negative">
                                Negative (reverse)
                              </SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Survey details + start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Start survey for org</CardTitle>
          <CardDescription>
            Reuse a published survey already under this organization, or create
            a new one. Results always belong to the selected org.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={surveyMode === "existing" ? "default" : "outline"}
              onClick={() => setSurveyMode("existing")}
              disabled={!targetOrgId}
            >
              Use existing
            </Button>
            <Button
              type="button"
              size="sm"
              variant={surveyMode === "new" ? "default" : "outline"}
              onClick={() => setSurveyMode("new")}
              disabled={!targetOrgId}
            >
              Create new
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2"
              disabled={!targetOrgId || loadingSurveys}
              onClick={() => void fetchOrgSurveys(targetOrgId)}
            >
              {loadingSurveys ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh list
            </Button>
          </div>

          {surveyMode === "existing" ? (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Label>Published surveys for {selectedOrg?.name || "org"}</Label>
                  <Select
                    value={selectedExistingSurveyId || undefined}
                    onValueChange={setSelectedExistingSurveyId}
                    disabled={loadingSurveys || orgSurveys.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingSurveys
                            ? "Loading surveys…"
                            : orgSurveys.length
                              ? "Select a survey"
                              : "No published surveys yet"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {orgSurveys.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title || "Untitled"} ·{" "}
                          {new Date(s.created_at).toLocaleDateString()} ·{" "}
                          {s.respondentCount} respondent
                          {s.respondentCount === 1 ? "" : "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedExistingSurvey && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Selected:{" "}
                      <span className="font-medium text-foreground">
                        {selectedExistingSurvey.respondentCount}
                      </span>{" "}
                      answered respondent
                      {selectedExistingSurvey.respondentCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
              {orgSurveys.length === 0 && !loadingSurveys && (
                <p className="text-sm text-muted-foreground">
                  No published surveys for this org yet. Switch to{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => setSurveyMode("new")}
                  >
                    Create new
                  </button>
                  .
                </p>
              )}
              <div>
                <Label htmlFor="period-existing">Response period (for link)</Label>
                <Input
                  id="period-existing"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="gap-2"
                  disabled={!selectedExistingSurvey || !targetOrgId}
                  onClick={handleUseExistingSurvey}
                >
                  <Play className="h-4 w-4" />
                  Open selected survey
                  {selectedOrg ? ` for ${selectedOrg.name}` : ""}
                </Button>
                {selectedExistingSurvey ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    asChild
                  >
                    <Link href={`/admin/edit-survey/${selectedExistingSurvey.id}`}>
                      <Pencil className="h-4 w-4" />
                      Edit survey
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    disabled
                  >
                    <Pencil className="h-4 w-4" />
                    Edit survey
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      disabled={!selectedExistingSurvey || deletingSurvey}
                    >
                      {deletingSurvey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete survey
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this survey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes{" "}
                        <span className="font-medium text-foreground">
                          {selectedExistingSurvey?.title || "the selected survey"}
                        </span>
                        {selectedExistingSurvey
                          ? ` (${selectedExistingSurvey.respondentCount} respondent${
                              selectedExistingSurvey.respondentCount === 1
                                ? ""
                                : "s"
                            })`
                          : ""}
                        . Questions and responses tied to it may also be removed.
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => void handleDeleteExistingSurvey()}
                      >
                        Delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Site / consultation label</Label>
                  <Input
                    id="company"
                    placeholder="e.g. Acme Manufacturing — Site A"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="period">Response period</Label>
                  <Input
                    id="period"
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="title">Survey title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Safety Culture Survey"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button
                type="button"
                size="lg"
                className="gap-2 w-full sm:w-auto"
                disabled={submitting || questions.length === 0 || !targetOrgId}
                onClick={() => void handleCreateAndStart()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create new survey
                {selectedOrg ? ` for ${selectedOrg.name}` : ""}
              </Button>
            </div>
          )}

          {createdSurvey && liveSurveyUrl && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">Survey is live</p>
              <p className="text-xs break-all text-muted-foreground font-mono">
                {liveSurveyUrl}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Link uses this site&apos;s origin (works on deploy). Org id is
                included so responses attach to the selected organization.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void copyLink()}
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open(liveSurveyUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Open again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
