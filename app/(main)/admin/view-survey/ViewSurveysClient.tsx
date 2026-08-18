'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from "../../../../lib/supabaseClient";
import { useApp } from "../../../../components/app/AppProvider";
import { Cookies } from "../../../../lib/cookies-client";
import {
  Card,
  CardContent,
} from '../../../../components/ui/card'
import { Badge } from '../../../../@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import {
  Trash2,
  Edit,
  FileText,
  User,
  Users,
  Calendar,
  HelpCircle,
  Link,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Search,
} from "@/components/icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../../@/components/ui/accordion'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../../@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '../../../../@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import HoldButton from '../../../../components/kokonutui/hold-button'
import { SurveyImportDialog } from '../../../../components/survey/SurveyImportDialog'
import { CloneSurveyButton } from '../../../../components/survey/CloneSurveyButton'
import {
  buildSurveyExcelTemplateBuffer,
  downloadExcel,
  questionsToExcelBuffer,
} from '../../../../lib/survey-excel'
import { buildPublicSurveyUrl } from '../../../../lib/public-survey-url'
import {
  countRespondentsBySurvey,
  questionMapFromSurveys,
} from '../../../../lib/count-survey-respondents'
import { requestDeleteSurvey } from '../../../../lib/delete-survey-client'

// Initialized via modular import

type SurveyQuestion = {
  id: string
  survey_id: string
  question_text: string
  question_type: 'text' | 'multiple-choice' | 'radio' | 'likert'
  options: string[] | null
  order_index: number
  is_required: boolean
  created_at: string
  dimension?: string | null
  dimension_code?: string | null
  translated_question?: string | null
  scoring_type?: string | null
  max_score?: number | null
  min_score?: number | null
  reverse_score?: boolean | null
  translated_options?: string[] | null
}

type Survey = {
  slug: string
  id: string
  title: string
  description: string
  created_at: string
  is_published: boolean
  created_by: string | null
  org_id?: string | null
  respondent_count?: number
  profiles: {
    full_name: string | null
    email: string | null
  } | null
  survey_questions: SurveyQuestion[]
  organizations: {
    name: string
  } | null
}

function sortedSurveyQuestions(questions: SurveyQuestion[]) {
  return [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
}

function questionDimensionLabel(q: SurveyQuestion) {
  const dim = (q.dimension || "").replace(/^\d+\.\s*/, "").trim()
  const code = (q.dimension_code || "").trim()
  if (code && dim) return { code, dim, key: `${code}::${dim}` }
  if (dim) return { code: "", dim, key: `dim::${dim}` }
  if (code) return { code, dim: code, key: `code::${code}` }
  return { code: "", dim: "No dimension", key: "__none__" }
}

function groupQuestionsByDimension(questions: SurveyQuestion[]) {
  const groups: {
    key: string
    code: string
    dim: string
    questions: SurveyQuestion[]
  }[] = []
  const index = new Map<string, number>()
  for (const q of sortedSurveyQuestions(questions)) {
    const meta = questionDimensionLabel(q)
    const existing = index.get(meta.key)
    if (existing == null) {
      index.set(meta.key, groups.length)
      groups.push({ ...meta, questions: [q] })
    } else {
      groups[existing].questions.push(q)
    }
  }
  return groups
}


function isNegativeQuestion(q: SurveyQuestion) {
  return !!q.reverse_score || (q.scoring_type || "").toLowerCase() === "negative"
}

function SurveyQuestionsPreview({ questions }: { questions: SurveyQuestion[] }) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [dimensionKey, setDimensionKey] = useState("all")
  const [polarity, setPolarity] = useState("all")

  const dimensionOptions = useMemo(
    () =>
      groupQuestionsByDimension(questions).map((g) => ({
        key: g.key,
        code: g.code,
        dim: g.dim,
        count: g.questions.length,
      })),
    [questions]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sortedSurveyQuestions(questions).filter((item) => {
      const dim = questionDimensionLabel(item)
      if (dimensionKey !== "all" && dim.key !== dimensionKey) return false
      const negative = isNegativeQuestion(item)
      if (polarity === "positive" && negative) return false
      if (polarity === "negative" && !negative) return false
      if (!needle) return true
      return (
        item.question_text.toLowerCase().includes(needle) ||
        dim.dim.toLowerCase().includes(needle) ||
        dim.code.toLowerCase().includes(needle)
      )
    })
  }, [questions, query, dimensionKey, polarity])

  const groups = useMemo(() => groupQuestionsByDimension(filtered), [filtered])
  const filtersActive = query.trim() !== "" || dimensionKey !== "all" || polarity !== "all"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Questions Preview ({questions.length})
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? "Collapse" : "Expand all"}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, dimension, or code…"
              className="h-8 bg-background pl-8 text-sm"
            />
          </div>
          <Select value={dimensionKey} onValueChange={setDimensionKey}>
            <SelectTrigger className="h-8 w-full bg-background sm:w-56">
              <SelectValue placeholder="All dimensions" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All dimensions</SelectItem>
              {dimensionOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {(opt.code ? `${opt.code} · ` : "") + opt.dim} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={polarity} onValueChange={setPolarity}>
            <SelectTrigger className="h-8 w-full bg-background sm:w-40">
              <SelectValue placeholder="All polarity" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All polarity</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setQuery("")
                setDimensionKey("all")
                setPolarity("all")
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {expanded ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {questions.length}
          </p>
          <div className="max-h-[32rem] overflow-y-auto rounded-lg border bg-slate-50 dark:bg-slate-900/40">
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No questions match those filters.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="border-b last:border-b-0">
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-slate-200/95 px-3 py-1.5 text-xs font-semibold text-slate-800 backdrop-blur dark:bg-slate-800/95 dark:text-slate-100">
                    {group.code ? (
                      <Badge className="h-5 bg-slate-700 px-1.5 text-[10px] text-white hover:bg-slate-700">
                        {group.code}
                      </Badge>
                    ) : null}
                    <span className="min-w-0 truncate">{group.dim}</span>
                    <span className="ml-auto shrink-0 font-normal text-muted-foreground">
                      {group.questions.length}
                    </span>
                  </div>
                  <div className="divide-y">
                    {group.questions.map((q) => (
                      <div key={q.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                        <span className="mt-0.5 shrink-0 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {(q.order_index ?? 0) + 1}
                        </span>
                        <p className="min-w-0 flex-1 leading-snug">{q.question_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedSurveyQuestions(questions).slice(0, 6).map((q, i) => {
            const dim = questionDimensionLabel(q)
            return (
              <div
                key={q.id}
                className="bg-card border rounded-lg p-4 text-sm shadow-sm flex flex-col gap-3 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground text-xs font-mono mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>
                  <span className="font-medium line-clamp-2 leading-snug">{q.question_text}</span>
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-dashed">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    {dim.code ? (
                      <Badge className="h-5 bg-slate-700 px-1.5 text-[10px] text-white hover:bg-slate-700">
                        {dim.code}
                      </Badge>
                    ) : null}
                    <span className="truncate text-[10px] text-muted-foreground">{dim.dim}</span>
                  </div>
                  {q.is_required && (
                    <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">
                      Required
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {questions.length > 6 && (
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 p-4 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(true)}
            >
              <span className="font-medium">+{questions.length - 6} more</span>
              <span className="text-xs opacity-70">Expand to view all with dimensions</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}


export default function ViewSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminCookie, setIsAdminCookie] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all");

  useEffect(() => {
    const adminId = Cookies.get("admin_id");
    setIsAdminCookie(!!adminId);
    setAdminChecked(true);
  }, []);

  const isPlatformAdmin = isAdminCookie;
  const { user, org, membership: mem, subscription: sub } = useApp();
  const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';

  const isRestrictedToAuthored = !isAdminCookie && (sub?.plan === 'demo' || (mem?.role !== 'admin' && (mem?.role as string) !== 'super-admin'));

  useEffect(() => {
    if (!adminChecked || !isPlatformAdmin) return;
    const fetchOrgs = async () => {
      try {
        const resp = await fetch("/api/admin/all-organizations");
        if (!resp.ok) return;
        const data = await resp.json();
        setOrganizations(
          (data || []).map((o: { id: string; name: string }) => ({
            id: o.id,
            name: o.name,
          }))
        );
      } catch (err) {
        console.error("Failed to load organizations:", err);
      }
    };
    void fetchOrgs();
  }, [adminChecked, isPlatformAdmin]);

  const fetchSurveys = useCallback(async () => {
    if (!adminChecked) return;
    if (!org?.id && !isPlatformAdmin) {
      console.warn("Admin has no organization, returning empty list.");
      setSurveys([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true)

      let data: any[] | null = null
      let error: { message?: string } | null = null

      if (isPlatformAdmin) {
        const qs = new URLSearchParams({ detailed: "1" })
        if (selectedOrgId !== "all") qs.set("orgId", selectedOrgId)
        const resp = await fetch(`/api/admin/all-surveys?${qs.toString()}`)
        if (resp.ok) {
          data = await resp.json()
        } else {
          error = { message: "Failed to fetch surveys" }
        }
      } else {
        let query = supabase
          .from('surveys')
          .select(`
            id,
            slug,
            title,
            description,
            created_at,
            is_published,
            created_by,
            org_id,
            survey_questions (
              id,
              question_text,
              question_type,
              options,
              order_index,
              is_required,
              created_at,
              dimension,
              dimension_code,
              translated_question,
              scoring_type,
              max_score,
              min_score,
              reverse_score,
              translated_options
            ),
            organizations (
              name
            )
          `)

        if (org?.id) {
          if (isRestrictedToAuthored) {
            query = query.or(`and(org_id.eq.${org.id},created_by.eq.${user?.id}),id.eq.${DEFAULT_SURVEY_ID}`)
          } else {
            query = query.or(`org_id.eq.${org.id},id.eq.${DEFAULT_SURVEY_ID}`)
          }
        }

        const result = await query.order('created_at', { ascending: false })
        data = result.data
        error = result.error
      }

      if (error) {
        toast.error('Error fetching surveys')
        console.error(error)
      } else if (data) {
        // Normalize organizations (API may return object or array)
        const rows = data.map((survey: any) => ({
          ...survey,
          organizations: Array.isArray(survey.organizations)
            ? survey.organizations[0] || null
            : survey.organizations || null,
        }))

        const authorIds = Array.from(new Set(rows.map((s: any) => s.created_by).filter(Boolean))) as string[];
        let profilesMap: Record<string, any> = {};

        if (authorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', authorIds);

          if (profilesData) {
            profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
          }
        }

        let normalized = rows.map((survey: any) => ({
          ...survey,
          profiles: profilesMap[survey.created_by!] || null,
          respondent_count: typeof survey.respondent_count === "number" ? survey.respondent_count : undefined,
        })) as unknown as Survey[]

        // Org consultants: count unique respondents via question_id (scoped to their org)
        if (!isPlatformAdmin && normalized.length > 0) {
          try {
            const counts = await countRespondentsBySurvey({
              supabase,
              questionToSurvey: questionMapFromSurveys(normalized),
              orgId: org?.id,
            })
            normalized = normalized.map((s) => ({
              ...s,
              respondent_count: counts[s.id] ?? 0,
            }))
          } catch (countError) {
            console.error("Failed to count respondents:", countError)
            normalized = normalized.map((s) => ({
              ...s,
              respondent_count: s.respondent_count ?? 0,
            }))
          }
        } else {
          normalized = normalized.map((s) => ({
            ...s,
            respondent_count: s.respondent_count ?? 0,
          }))
        }

        normalized = normalized.sort((a, b) => {
          if (a.id === DEFAULT_SURVEY_ID) return -1;
          if (b.id === DEFAULT_SURVEY_ID) return 1;
          return 0;
        });

        setSurveys(normalized)
      }
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
      toast.error("Failed to load surveys.");
    } finally {
      setLoading(false)
    }
  }, [org?.id, adminChecked, isPlatformAdmin, isRestrictedToAuthored, user?.id, selectedOrgId])

  useEffect(() => {
    void fetchSurveys()
  }, [fetchSurveys])

  const handleExportSurvey = async (survey: Survey) => {
    setExportingId(survey.id)
    try {
      let rows = survey.survey_questions || []
      // Prefer a fresh full fetch so export always has scoring fields
      const { data, error } = await supabase
        .from('survey_questions')
        .select(`
          question_text,
          translated_question,
          question_type,
          options,
          translated_options,
          is_required,
          dimension_code,
          scoring_type,
          max_score,
          min_score,
          reverse_score,
          order_index
        `)
        .eq('survey_id', survey.id)
        .order('order_index', { ascending: true })

      if (error) {
        console.error(error)
        toast.error('Failed to load questions for export')
        return
      }
      if (data) rows = data as SurveyQuestion[]

      if (!rows.length) {
        toast.error('This survey has no questions to export')
        return
      }

      const buffer = await questionsToExcelBuffer(rows)
      const safeName = (survey.title || 'survey')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      downloadExcel(`${safeName || 'survey'}-questions.xlsx`, buffer)
      toast.success('Survey questions exported')
    } finally {
      setExportingId(null)
    }
  }

  function DeleteSurveyDialog({ surveyId, onDelete }: { surveyId: string, onDelete: (id: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this survey? This action cannot be undone.
              <span className="block mt-2 font-bold text-destructive underline">Hold the button below for 5 seconds to confirm.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-center my-6">
            <HoldButton
              variant="red"
              holdDuration={5000}
              onComplete={() => {
                onDelete(surveyId);
                setIsOpen(false);
              }}
              className="w-full h-14 text-lg font-black rounded-2xl"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const handleDeleteSurvey = async (id: string) => {
    const adminId = Cookies.get("admin_id");

    if (!adminId) {
      toast.error("You are not logged in.");
      return;
    }

    try {
      await requestDeleteSurvey(id);
      toast.success("Survey deleted");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete survey");
    }
  };

  const handleEditSurvey = (id: string) => {
    router.push(`/admin/edit-survey/${id}`)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header & Guidance */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Surveys</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {isPlatformAdmin && organizations.length > 0 && (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-full sm:w-[220px] bg-background">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const buffer = await buildSurveyExcelTemplateBuffer()
                downloadExcel('survey-questions-template.xlsx', buffer)
              }}
            >
              <Download className="h-4 w-4" />
              Excel template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => router.push('/admin/create-survey')}>
              Create Survey
            </Button>
          </div>
        </div>
        <Alert className="bg-primary/5 border-primary/20 text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Manage your surveys</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            View, edit, import, and export surveys. Import creates a <span className="font-medium text-foreground">new</span> survey after you review and confirm every question.
            {isPlatformAdmin && selectedOrgId !== "all" && (
              <> Showing this organization&apos;s surveys plus the shared Safety Vitals default.</>
            )}
          </AlertDescription>
        </Alert>
      </div>

      <SurveyImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          void fetchSurveys()
        }}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading surveys...</p>
        </div>
      ) : surveys.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No surveys yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6 text-sm">
              {isPlatformAdmin && selectedOrgId !== "all"
                ? "This organization has no surveys yet. Create one or pick another organization."
                : "Create your first survey to start collecting feedback."}
            </p>
            <Button onClick={() => router.push('/admin/create-survey')}>
              Create Survey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {surveys.map((survey) => (
            <AccordionItem
              value={survey.id}
              key={survey.id}
              className="border rounded-xl bg-card shadow-sm px-0 overflow-hidden"
            >
              <AccordionTrigger className="hover:no-underline px-4 py-4 md:px-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full text-left">

                  {/* Title & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-semibold text-lg truncate">{survey.title}</span>
                      {survey.is_published ? (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Draft</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                        {new Date(survey.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {survey.organizations?.name && (
                        <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-medium">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-blue-500/30 bg-blue-500/5">
                            {survey.organizations.name}
                          </Badge>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 opacity-70" />
                        {survey.profiles?.full_name || 'Unknown Author'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 opacity-70" />
                        {survey.respondent_count ?? 0}{" "}
                        {(survey.respondent_count ?? 0) === 1 ? "respondent" : "respondents"}
                      </span>
                    </div>
                  </div>

                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 md:px-6 md:pb-6 pt-2">
                <div className="border-t pt-6 space-y-6">

                  {/* Description & Link Actions */}
                  <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl bg-muted/20 p-3 rounded-md border">
                      <span className="font-medium text-foreground mr-1">Description:</span>
                      {survey.description || <span className="italic opacity-70">No description provided.</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-2 flex-1 md:flex-none border-dashed"
                              disabled={exportingId === survey.id}
                              onClick={() => void handleExportSurvey(survey)}
                            >
                              <Download className="h-4 w-4 text-emerald-600" />
                              {exportingId === survey.id ? 'Exporting…' : 'Export Excel'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export questions as Excel (with dropdowns)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex flex-1 md:flex-none">
                              <CloneSurveyButton
                                surveyId={survey.id}
                                surveyTitle={survey.title}
                                destOrgId={
                                  survey.org_id ||
                                  (selectedOrgId !== "all" ? selectedOrgId : org?.id) ||
                                  null
                                }
                                onCloned={() => void fetchSurveys()}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Copy questions into a new unpublished survey. Answers are not copied.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {(survey.id !== DEFAULT_SURVEY_ID || isPlatformAdmin) && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 gap-2 flex-1 md:flex-none border-dashed"
                                  onClick={() => handleEditSurvey(survey.id)}
                                >
                                  <Edit className="h-4 w-4 text-primary" />
                                  Edit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Survey</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DeleteSurveyDialog surveyId={survey.id} onDelete={handleDeleteSurvey} />
                        </>
                      )}

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-2 flex-1 md:flex-none border-dashed"
                              onClick={async () => {
                                const now = new Date()
                                const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                const link = buildPublicSurveyUrl({
                                  surveyId: survey.id,
                                  slug: survey.slug,
                                  period: periodStr,
                                  orgId: survey.org_id || org?.id || null,
                                })

                                try {
                                  await navigator.clipboard.writeText(link)
                                  toast.success('Link copied to clipboard')
                                } catch {
                                  toast.error('Failed to copy link')
                                }
                              }}
                            >
                              <Link className="h-4 w-4 text-orange-500" />
                              Copy Link
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Public Link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Questions Preview */}
                  {survey.survey_questions?.length > 0 && (
                    <SurveyQuestionsPreview questions={survey.survey_questions} />
                  )}

                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
