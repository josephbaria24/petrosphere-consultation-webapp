'use client'

import { useCallback, useEffect, useState } from 'react'
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
import {
  Trash2,
  Edit,
  FileText,
  User,
  Calendar,
  HelpCircle,
  Link,
  Download,
  Upload,
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
import HoldButton from '../../../../components/kokonutui/hold-button'
import { SurveyImportDialog } from '../../../../components/survey/SurveyImportDialog'
import {
  buildSurveyExcelTemplateBuffer,
  downloadExcel,
  questionsToExcelBuffer,
} from '../../../../lib/survey-excel'

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
  profiles: {
    full_name: string | null
    email: string | null
  } | null
  survey_questions: SurveyQuestion[]
  organizations: {
    name: string
  } | null
}


export default function ViewSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminCookie, setIsAdminCookie] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    const adminId = Cookies.get("admin_id");
    setIsAdminCookie(!!adminId);
    setAdminChecked(true);
  }, []);

  const isPlatformAdmin = isAdminCookie;
  const { user, org, membership: mem, subscription: sub } = useApp();
  const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';

  const isRestrictedToAuthored = !isAdminCookie && (sub?.plan === 'demo' || (mem?.role !== 'admin' && (mem?.role as string) !== 'super-admin'));

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

      if (!isPlatformAdmin && org?.id) {
        if (isRestrictedToAuthored) {
          query = query.or(`and(org_id.eq.${org.id},created_by.eq.${user?.id}),id.eq.${DEFAULT_SURVEY_ID}`)
        } else {
          query = query.or(`org_id.eq.${org.id},id.eq.${DEFAULT_SURVEY_ID}`)
        }
      }

      console.log("[View Surveys Auth Check]:", {
        isPlatformAdmin,
        isRestrictedToAuthored,
        orgId: org?.id,
        userId: user?.id
      });

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        toast.error('Error fetching surveys')
        console.error(error)
      } else if (data) {
        const authorIds = Array.from(new Set(data.map(s => s.created_by).filter(Boolean))) as string[];
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

        let normalized = data.map((survey) => ({
          ...survey,
          profiles: profilesMap[survey.created_by!] || null,
        })) as unknown as Survey[]

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
  }, [org?.id, adminChecked, isPlatformAdmin, isRestrictedToAuthored, user?.id])

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
    // ✅ Get admin_id from cookie
    const adminId = Cookies.get("admin_id");

    if (!adminId) {
      toast.error("You are not logged in.");
      return;
    }

    // ✅ Delete survey
    const { error } = await supabase.from("surveys").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete survey");
    } else {
      toast.success("Survey deleted");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
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
          <div className="flex flex-wrap gap-2">
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
              Create your first survey to start collecting feedback.
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
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                                let link = survey.slug
                                  ? `${baseUrl}/survey/${survey.slug}`
                                  : `${baseUrl}/survey/${survey.id}`

                                const now = new Date();
                                const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                link += `?period=${periodStr}`

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
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Questions Preview ({survey.survey_questions.length})
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {survey.survey_questions.slice(0, 6).map((q, i) => (
                          <div key={q.id} className="bg-card border rounded-lg p-4 text-sm shadow-sm flex flex-col gap-3 hover:border-primary/20 transition-colors">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground text-xs font-mono mt-0.5 bg-muted px-1.5 py-0.5 rounded">{i + 1}</span>
                              <span className="font-medium line-clamp-2 leading-snug">
                                {q.question_text}
                              </span>
                            </div>
                            <div className="mt-auto pt-3 flex items-center justify-between border-t border-dashed">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal tracking-wide uppercase text-muted-foreground bg-muted/10">
                                {q.question_type}
                              </Badge>
                              {q.is_required && (
                                <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">Required</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {survey.survey_questions.length > 6 && (
                          <div className="flex flex-col items-center justify-center p-4 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg hover:bg-muted/30 transition-colors">
                            <span className="font-medium">+{survey.survey_questions.length - 6} more</span>
                            <span className="text-xs opacity-70">View all in edit mode</span>
                          </div>
                        )}
                      </div>
                    </div>
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
