/**
 * File: app/survey/[id]/page.tsx
 * Description: Public-facing survey response page for respondents.
 * Handles survey data fetching, respondent metadata collection, and answer submission.
 * Functions:
 * - PublicSurveyPage(): Main component for the public survey experience.
 * - handleSubmit(): Validates and persists respondent metadata and their survey answers.
 * - validateMetadata(): Ensures all required respondent information is provided.
 * Connections:
 * - Accessed by respondents via unique survey IDs or slugs.
 * - Interfaces with public.users and public.responses tables in Supabase.
 * - Supports bilingual (English/Filipino) question rendering.
 */
'use client'

import { useEffect, useState, Suspense, startTransition } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'
import { Input } from '../../../components/ui/input'
import Question from "../../../components/survey/Question";
import { cn } from '../../../lib/utils'
import { ChevronsUpDown, Languages } from "@/components/icons"
import { useCallback, useMemo, useRef } from "react";
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import { Button } from '../../../components/ui/button'
import { toast } from 'sonner'
import { Label } from '../../../components/ui/label'
import {
  Card,
} from '../../../components/ui/card'
import { Check } from "@/components/icons"
import { Popover, PopoverContent, PopoverTrigger } from '../../../@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../../../@/components/ui/command'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../@/components/ui/alert-dialog'

type SurveyQuestion = {
  id: string
  question_text: string
  translated_question?: string // optional for translations
  question_type: 'text' | 'multiple-choice' | 'radio' | 'likert'
  options: string[] | null
  translated_options?: string[] | null  // ✅ NEW
  dimension: string
  dimension_code: string
}

type Survey = {
  id: string
  slug: string
  title: string
  description: string
  created_at: string
  is_published: boolean
  org_id: string
  survey_questions: SurveyQuestion[]
}



function SurveyContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const targetOrgId = searchParams.get('org')
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState<number>(1)
  const [metadata, setMetadata] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: '',
    site: '',
  })

  const [isOtherRole, setIsOtherRole] = useState(false)
  const [useFilipino, setUseFilipino] = useState(false)
  const [showResubmitModal, setShowResubmitModal] = useState(false)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [showTooltip, setShowTooltip] = useState(true)

  const parentRef = useRef<HTMLDivElement>(null)

  const roles = [
    "Executive",
    "Manager",
    "Supervisor",
    "Employees / Rank and File",
    "Owner",
    "General Contractor",
    "Sub contractor",
    "Others",
  ];

  useEffect(() => {
    const rawParam = params?.id
    if (!rawParam) return

    let cancelled = false
    const fetchSurvey = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let rawId = String(Array.isArray(rawParam) ? rawParam[0] : rawParam)
        try {
          rawId = decodeURIComponent(rawId)
        } catch {
          // keep undecoded path segment
        }

        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            rawId
          )

        // Fetch survey row first (avoids fragile nested embeds timing out).
        const { data: surveyRow, error: surveyError } = await supabase
          .from('surveys')
          .select('id, slug, title, description, created_at, is_published, org_id')
          .eq(isUUID ? 'id' : 'slug', rawId)
          .eq('is_published', true)
          .maybeSingle()

        if (cancelled) return

        if (surveyError) {
          console.error('Error fetching survey', surveyError)
          setLoadError(surveyError.message || 'Failed to load survey')
          setSurvey(null)
          return
        }

        if (!surveyRow) {
          setSurvey(null)
          setLoadError(null)
          return
        }

        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select(
            'id, question_text, translated_question, question_type, options, translated_options, dimension, dimension_code, order_index'
          )
          .eq('survey_id', surveyRow.id)
          .order('order_index', { ascending: true })

        if (cancelled) return

        if (questionsError) {
          console.error('Error fetching survey questions', questionsError)
          setLoadError(questionsError.message || 'Failed to load questions')
          setSurvey(null)
          return
        }

        setSurvey({
          ...(surveyRow as Survey),
          survey_questions: (questions || []) as SurveyQuestion[],
        })
      } catch (err) {
        console.error('Unexpected survey load error', err)
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unexpected error loading survey'
          )
          setSurvey(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSurvey()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const handleInputChange = useCallback((questionId: string, value: string) => {
    startTransition(() => {
      setAnswers((prev) => {
        if (prev[questionId] === value) return prev;
        return { ...prev, [questionId]: value };
      });
    });
  }, []);

  const handleMetadataChange = useCallback((field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validateMetadata = () => {
    const required = ['first_name', 'last_name', 'email', 'role', 'department', 'site']
    const missing = required.filter((key) => !metadata[key as keyof typeof metadata])
    if (missing.length > 0) {
      toast.error('Please fill in all fields.')
      return false
    }
    return true
  }

  const handleNextStep = async () => {
    if (!validateMetadata()) return;
    if (!survey) return;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', metadata.email)
        .maybeSingle();

      if (!user) {
        setStep(2);
        return;
      }

      const currentPeriod = searchParams.get('period');
      let query = supabase
        .from('responses')
        .select('id')
        .eq('user_id', user.id)
        .in('question_id', (survey.survey_questions || []).map(q => q.id))
        .limit(1);

      if (currentPeriod) {
        const [year, month] = currentPeriod.split('-');
        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
        const endDate = new Date(Number(year), Number(month), 1).toISOString();
        query = query.gte('created_at', startDate).lt('created_at', endDate);
      }

      const { data: responses } = await query;
      if (responses && responses.length > 0) setShowResubmitModal(true);
      else setStep(2);
    } catch (err) {
      console.error('Error checking existing response:', err);
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return
    const allQuestions = survey.survey_questions || [];
    const unanswered = allQuestions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast.error("Please answer all required questions.");
      const firstUnansweredId = unanswered[0].id;
      const el = document.getElementById(`question-${firstUnansweredId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', metadata.email)
        .maybeSingle()

      let userId = user?.id
      if (!userId) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email: metadata.email,
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            role: metadata.role,
            department: metadata.department,
            site: metadata.site,
            status: 'active',
          })
          .select().single()
        if (insertError || !newUser) throw insertError || new Error('Failed to create user')
        userId = newUser.id
      } else {
        // Keep profile metadata in sync for returning respondents
        await supabase
          .from('users')
          .update({
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            role: metadata.role,
            department: metadata.department,
            site: metadata.site,
          })
          .eq('id', userId)
      }

      const responsePayload = allQuestions.map((q) => ({
        user_id: userId,
        question_id: q.id,
        question: q.question_text,
        answer: answers[q.id] || '',
        role: metadata.role,
        department: metadata.department,
        dimension: q.dimension,
        org_id: targetOrgId || survey.org_id
      }))

      if (isResubmitting && userId) {
        const currentPeriod = searchParams.get('period');
        let deleteQuery = supabase.from('responses').delete().eq('user_id', userId).in('question_id', allQuestions.map(q => q.id));
        if (currentPeriod) {
          const [year, month] = currentPeriod.split('-');
          const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
          const endDate = new Date(Number(year), Number(month), 1).toISOString();
          deleteQuery = deleteQuery.gte('created_at', startDate).lt('created_at', endDate);
        }
        await deleteQuery;
      }

      const { error: responseError } = await supabase.from('responses').insert(responsePayload)
      if (responseError) throw responseError
      toast.success('Answers submitted successfully!')
      setStep(3)
    } catch (err) {
      console.error('Submission error:', err)
      toast.error('Something went wrong during submission.')
    }
  }

  const groupedQuestions = useMemo(() => {
    if (!survey) return {};
    const list = survey.survey_questions || [];
    return list.reduce((acc, q) => {
      const key = q.dimension || "General";
      (acc[key] ||= []).push(q);
      return acc;
    }, {} as Record<string, SurveyQuestion[]>);
  }, [survey]);

  const sortedGroups = useMemo(() => {
    return Object.entries(groupedQuestions).sort(([a], [b]) => {
      const getPrefix = (str: string) => {
        const num = parseInt(str, 10);
        return Number.isNaN(num) ? Infinity : num;
      };
      return getPrefix(a) - getPrefix(b);
    }) as [string, SurveyQuestion[]][];
  }, [groupedQuestions]);

  type VirtualRow =
    | { kind: "header"; key: string; title: string }
    | { kind: "question"; key: string; question: SurveyQuestion };

  const virtualRows = useMemo(() => {
    const rows: VirtualRow[] = [];
    for (const [group, questions] of sortedGroups) {
      rows.push({ kind: "header", key: `h-${group}`, title: group });
      const ordered = [...questions].sort(
        (a, b) =>
          (a.dimension_code || "").localeCompare(b.dimension_code || "") ||
          a.question_text.localeCompare(b.question_text)
      );
      for (const q of ordered) {
        rows.push({ kind: "question", key: q.id, question: q });
      }
    }
    return rows;
  }, [sortedGroups]);

  const [listOffset, setListOffset] = useState(0);

  useEffect(() => {
    if (step !== 2) return;
    const id = requestAnimationFrame(() => {
      setListOffset(parentRef.current?.offsetTop ?? 0);
    });
    return () => cancelAnimationFrame(id);
  }, [step, survey?.id, virtualRows.length]);

  const rowVirtualizer = useWindowVirtualizer({
    count: step === 2 ? virtualRows.length : 0,
    estimateSize: (index) =>
      virtualRows[index]?.kind === "header" ? 48 : 210,
    overscan: 4,
    scrollMargin: listOffset,
  });

  const totalRequiredQuestions = survey?.survey_questions?.length || 0;
  const totalAnswered = useMemo(() => {
    if (!survey?.survey_questions) return 0;
    let n = 0;
    for (const q of survey.survey_questions) {
      if (answers[q.id]?.trim()) n += 1;
    }
    return n;
  }, [answers, survey]);
  const progress =
    totalRequiredQuestions > 0
      ? Math.round((totalAnswered / totalRequiredQuestions) * 100)
      : 0;

  const renderStepHeader = () => {
    const steps = ['Information', 'Questionnaire', 'Completion']
    return (
      <div className="flex justify-center mb-8 w-full">
        <div className="flex w-full max-w-md sm:max-w-none items-start sm:items-center justify-between sm:justify-center gap-x-1 sm:gap-x-6 px-1">
          {steps.map((label, index) => {
            const isActive = step === index + 1
            const isCompleted = step > index + 1
            return (
              <div key={label} className="flex items-start sm:items-center min-w-0 flex-1 sm:flex-none">
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 min-w-0">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 text-[0.75rem] sm:text-sm flex items-center justify-center rounded-full font-medium ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
                  </div>
                  <span className={`text-[0.65rem] leading-tight text-center sm:text-left sm:text-base ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{label}</span>
                </div>
                {index !== steps.length - 1 && <div className="h-px bg-gray-300 mx-1 sm:mx-3 flex-1 min-w-2 sm:flex-none sm:w-16 mt-3 sm:mt-0" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-sm text-muted-foreground">
        Loading survey…
      </div>
    )
  }
  if (!survey) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-2">
        <p className="font-medium">Survey not found.</p>
        <p className="text-sm text-muted-foreground">
          This link may be wrong, unpublished, or the survey was deleted.
          {loadError ? ` (${loadError})` : ""}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {step === 2 && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white/95 dark:bg-background/95 backdrop-blur-sm border-b">
          <div className="h-1.5 bg-primary transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
          <div className="text-xs text-center py-1 font-medium text-gray-700 dark:text-gray-300">{progress}% Complete</div>
        </div>
      )}

      {/* Compact chrome — keep heavy questionnaire list outside nested Card */}
      <div className={`space-y-4 ${step === 2 ? "pt-10" : ""}`}>
        <div className="relative w-full h-28 md:h-40 rounded-xl overflow-hidden">
          <Image src="/header3.png" alt="header" fill className="object-cover" priority sizes="(max-width: 896px) 100vw, 896px" />
        </div>
        {renderStepHeader()}
        {step === 2 && (
          <div className="flex justify-between items-center sticky top-8 z-40 bg-background/90 backdrop-blur-sm py-2 -mx-1 px-1">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>← Go Back</Button>
            <div className="relative">
              {showTooltip && (
                <div className="absolute -top-14 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-md z-10 whitespace-nowrap">
                  <div className="flex items-center justify-between gap-2">
                    <span>Click to translate questions</span>
                    <button type="button" onClick={() => setShowTooltip(false)} className="text-white hover:text-gray-300 ml-2">✕</button>
                  </div>
                  <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 rotate-45" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setUseFilipino((v) => !v)}>
                <Languages className="mr-2 h-4 w-4" />
                {useFilipino ? "Translate to English" : "Translate to Filipino"}
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <Card className="shadow-lg rounded-2xl p-6 bg-white dark:bg-background">
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>First name</Label>
                  <Input placeholder="First name" value={metadata.first_name} onChange={(e) => handleMetadataChange("first_name", e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Last name</Label>
                  <Input placeholder="Last name" value={metadata.last_name} onChange={(e) => handleMetadataChange("last_name", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>Email</Label>
                  <Input placeholder="Email" value={metadata.email} onChange={(e) => handleMetadataChange("email", e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Position / Role</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {isOtherRole
                          ? metadata.role
                            ? `Others — ${metadata.role}`
                            : "Others"
                          : metadata.role || "Select position"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-h-60 overflow-y-auto">
                      <Command>
                        <CommandInput placeholder="Search position..." />
                        <CommandEmpty>No position found.</CommandEmpty>
                        <CommandGroup>
                          {roles.map((role) => (
                            <CommandItem
                              key={role}
                              onSelect={() => {
                                const other = role === "Others";
                                setIsOtherRole(other);
                                handleMetadataChange("role", other ? "" : role);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  (!isOtherRole && metadata.role === role) ||
                                    (isOtherRole && role === "Others")
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {role}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {isOtherRole && (
                    <Input
                      className="mt-2"
                      placeholder="Specify your position / role"
                      value={metadata.role}
                      onChange={(e) => handleMetadataChange("role", e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>Department</Label>
                  <Input placeholder="Department" value={metadata.department} onChange={(e) => handleMetadataChange("department", e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Site</Label>
                  <Input placeholder="Site location" value={metadata.site} onChange={(e) => handleMetadataChange("site", e.target.value)} />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={handleNextStep} type="button">
                Next
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && (
          <>
            <div
              ref={parentRef}
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = virtualRows[virtualRow.index];
                if (!row) return null;
                return (
                  <div
                    key={row.key}
                    data-index={virtualRow.index}
                    className="absolute top-0 left-0 w-full px-0.5"
                    style={{
                      transform: `translateY(${virtualRow.start - listOffset}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    {row.kind === "header" ? (
                      <div className="flex items-center h-full">
                        <h3 className="text-sm font-semibold text-primary bg-muted/50 rounded-md px-3 py-2 w-full border">
                          {row.title}
                        </h3>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-card px-3 py-2 mb-2">
                        <Question
                          q={row.question}
                          value={answers[row.question.id] || ""}
                          onChange={handleInputChange}
                          useFilipino={useFilipino}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="pt-4 pb-8">
              <Button type="button" onClick={handleSubmit} className="w-full">
                Submit
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <Card className="shadow-lg rounded-2xl p-6">
            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold mb-4">Thank you for participation.</h2>
              <p className="text-gray-500">Your input is invaluable...</p>
            </div>
          </Card>
        )}
      </div>

      <AlertDialog open={showResubmitModal} onOpenChange={setShowResubmitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Already Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              This email has already been used to respond to this survey {searchParams.get("period") ? `for this period (${searchParams.get("period")})` : ""}.
              Would you like to resubmit your answers? This will replace your previous submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResubmitModal(false)}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => {
                setIsResubmitting(true);
                setShowResubmitModal(false);
                setStep(2);
              }}
            >
              Resubmit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function PublicSurveyPage() {
  return (
    <Suspense fallback={<p>Loading survey form...</p>}>
      <SurveyContent />
    </Suspense>
  )
}
