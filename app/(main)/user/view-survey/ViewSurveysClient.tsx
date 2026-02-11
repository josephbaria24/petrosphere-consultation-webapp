'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from "../../../../lib/supabaseClient";
import { useApp } from "../../../../components/app/AppProvider";
import { Cookies } from "../../../../lib/cookies-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card'
import { Badge } from '../../../../@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import {
  ClipboardCopy,
  Trash2,
  Edit,
  FileText,
  User,
  Calendar,
  HelpCircle,
  Link,
} from 'lucide-react'
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
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminCookie, setIsAdminCookie] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    const adminId = Cookies.get("admin_id");
    setIsAdminCookie(!!adminId);
    setAdminChecked(true);
  }, []);

  const isAdmin = isAdminCookie;
  const appData = useApp();
  const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!adminChecked) return;
      setLoading(true)

      // Determine if restricted (not a full admin)
      const isPlatformAdmin = isAdminCookie;
      const sub = appData?.subscription;
      const mem = appData?.membership;

      const isRestrictedToAuthored = !isAdminCookie && (sub?.plan === 'demo' || (mem?.role !== 'admin' && (mem?.role as string) !== 'super-admin'));

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
              created_at
            )
        `)

      // 2. Apply Multi-Tenancy Rules
      if (!isPlatformAdmin && appData?.org?.id) {
        if (isRestrictedToAuthored) {
          // Rule for Demo/Members: Must be in their Org AND created by them OR Safety Vitals
          query = query.or(`and(org_id.eq.${appData.org.id},created_by.eq.${appData.user.id}),id.eq.${DEFAULT_SURVEY_ID}`)
        } else {
          // Rule for Org Admins: See everything in their Org OR Safety Vitals
          query = query.or(`org_id.eq.${appData.org.id},id.eq.${DEFAULT_SURVEY_ID}`)
        }
      } else if (!isPlatformAdmin && !appData?.org?.id) {
        // Handle case where user has no org (e.g. new user or error)
        console.warn("User has no organization, returning empty list.");
        setSurveys([]);
        setLoading(false);
        return;
      }

      // Diagnostic
      console.log("[View Surveys Auth Check]:", {
        isPlatformAdmin,
        isRestrictedToAuthored,
        orgId: appData?.org?.id,
        userId: appData?.user?.id
      });

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        toast.error('Error fetching surveys')
        console.error(error)
      } else if (data) {
        // Step 2: Manually fetch profiles since join might be blocked
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

        // Always pin Safety Vitals to the top
        normalized = normalized.sort((a, b) => {
          if (a.id === DEFAULT_SURVEY_ID) return -1;
          if (b.id === DEFAULT_SURVEY_ID) return 1;
          return 0;
        });

        setSurveys(normalized)
      }

      setLoading(false)
    }

    if (appData) {
      fetchSurveys()
    }
  }, [appData, adminChecked, isAdminCookie])

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
    // ✅ Get admin_id from cookie or auth context
    const adminId = Cookies.get("admin_id");

    if (!adminId && !appData?.user?.id) {
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

  const router = useRouter()

  const handleEditSurvey = (id: string) => {
    router.push(`/user/edit-survey/${id}`)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header & Guidance */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Surveys</h1>
        <Alert className="bg-primary/5 border-primary/20 text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Manage your surveys</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            View, edit, and manage your surveys here. Expand a row to see details, questions, and get the share link.
          </AlertDescription>
        </Alert>
      </div>

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
            <Button onClick={() => router.push('/user/create-survey')}>
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
              id={survey.id === DEFAULT_SURVEY_ID ? "tour-survey-card-safety-vitals" : undefined}
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
                      {(survey.id !== DEFAULT_SURVEY_ID || isAdmin) && (
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
                              id={survey.id === DEFAULT_SURVEY_ID ? "tour-copy-link-button" : undefined}
                              className="h-9 gap-2 flex-1 md:flex-none border-dashed"
                              onClick={async () => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                                const orgId = appData?.org?.id
                                let link = survey.slug
                                  ? `${baseUrl}/survey/${survey.slug}`
                                  : `${baseUrl}/survey/${survey.id}`

                                // Append org_id for multi-tenancy tracking if available
                                if (orgId) {
                                  link += `?org=${orgId}`
                                }

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
