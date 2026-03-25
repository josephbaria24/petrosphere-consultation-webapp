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

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import Question from "../../../components/survey/Question";
import { cn } from '../../../lib/utils'
import { ChevronsUpDown, Languages } from 'lucide-react'
import { useCallback, useMemo, useRef } from "react";
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import { Button } from '../../../components/ui/button'
import { toast } from 'sonner'
import { Label } from '../../../components/ui/label'
import { RadioGroup, RadioGroupItem } from '../../../@/components/ui/radio-group'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../../components/ui/card'
import { Check } from 'lucide-react'
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
    "Executive", "Manager", "Supervisor", "Employees / Rank and File",
    "Owner", "General Contractor", "Sub contractor"
  ];

  useEffect(() => {
    if (!params.id) return
    const fetchSurvey = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id, slug, title, description, created_at, is_published, org_id,
          survey_questions (
            id, question_text, translated_question, question_type, options, translated_options, dimension, dimension_code
          )
        `)
        .eq(isUUID ? 'id' : 'slug', params.id)
        .eq('is_published', true)
        .maybeSingle()

      if (error) console.error('Error fetching survey', error)
      else setSurvey(data as Survey)
      setLoading(false)
    }
    fetchSurvey()
  }, [params.id])

  const handleInputChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

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
        .in('question_id', survey.survey_questions.map(q => q.id))
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
    const allQuestions = survey.survey_questions;
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
      }

      const responsePayload = allQuestions.map((q) => ({
        user_id: userId,
        question_id: q.id,
        question: q.question_text,
        answer: answers[q.id] || '',
        role: metadata.role,
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
    return survey.survey_questions.reduce((acc, q) => {
      (acc[q.dimension] ||= []).push(q);
      return acc;
    }, {} as Record<string, typeof survey.survey_questions>);
  }, [survey]);

  const sortedGroups = useMemo(() => {
    return Object.entries(groupedQuestions).sort(([a], [b]) => {
      const getPrefix = (str: string) => {
        const num = parseInt(str);
        return isNaN(num) ? Infinity : num;
      };
      return getPrefix(a) - getPrefix(b);
    }) as [string, (typeof survey.survey_questions)][];
  }, [groupedQuestions, survey]);

  const rowVirtualizer = useWindowVirtualizer({
    count: sortedGroups.length,
    estimateSize: () => 600,
    overscan: 2,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  const totalRequiredQuestions = survey?.survey_questions.length || 0;
  const totalAnswered = useMemo(() => {
    return (survey?.survey_questions || []).filter((q) => answers[q.id]?.trim()).length;
  }, [answers, survey]);
  const progress = totalRequiredQuestions > 0 ? Math.round((totalAnswered / totalRequiredQuestions) * 100) : 0;

  const renderStepHeader = () => {
    const steps = ['Information', 'Questionnaire', 'Completion']
    return (
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-x-6">
          {steps.map((label, index) => {
            const isActive = step === index + 1
            const isCompleted = step > index + 1
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 text-[0.75rem] sm:text-sm flex items-center justify-center rounded-full font-medium ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
                  </div>
                  <span className={`text-sm sm:text-base ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{label}</span>
                </div>
                {index !== steps.length - 1 && <div className="h-px bg-gray-300 mx-3 w-10 sm:w-16" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) return <p>Loading survey...</p>
  if (!survey) return <p>Survey not found.</p>

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 2 && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-background shadow">
          <div className="h-2 bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          <div className="text-xs text-center py-1 font-medium text-gray-700 dark:text-gray-300">{progress}% Complete</div>
        </div>
      )}
      <Card className="shadow-lg rounded-2xl p-6 bg-white dark:bg-background">
        <div className="space-y-6">
          <div className="relative w-full h-32 md:h-48">
            <Image src="/header3.png" alt="header" fill className="object-cover rounded-xl" priority />
          </div>
          {renderStepHeader()}
          <div className="flex justify-between">
            {step === 2 && <Button variant="outline" size="sm" onClick={() => setStep(1)}>← Go Back</Button>}
            {step === 2 && (
              <div className="flex justify-end mb-4 relative">
                {showTooltip && (
                  <div className="absolute -top-14 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-md z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span>Click to translate questions</span>
                      <button onClick={() => setShowTooltip(false)} className="text-white hover:text-gray-300 ml-2">✕</button>
                    </div>
                    <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setUseFilipino(!useFilipino)}>
                  <Languages className="mr-2 h-4 w-4" />
                  {useFilipino ? 'Translate to English' : 'Translate to Filipino'}
                </Button>
              </div>
            )}
          </div>

          {step === 1 && (
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>First name</Label>
                  <Input placeholder="First name" value={metadata.first_name} onChange={(e) => handleMetadataChange('first_name', e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Last name</Label>
                  <Input placeholder="Last name" value={metadata.last_name} onChange={(e) => handleMetadataChange('last_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>Email</Label>
                  <Input placeholder="Email" value={metadata.email} onChange={(e) => handleMetadataChange('email', e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Role</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">{metadata.role || 'Select role'}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-h-60 overflow-y-auto">
                      <Command>
                        <CommandInput placeholder="Search role..." />
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {roles.map((role) => (
                            <CommandItem key={role} onSelect={() => { setIsOtherRole(role === 'Others'); handleMetadataChange('role', role === 'Others' ? '' : role); }}>
                              <Check className={cn('mr-2 h-4 w-4', metadata.role === role ? 'opacity-100' : 'opacity-0')} />
                              {role}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {isOtherRole && <Input className="mt-2" placeholder="Specify role" value={metadata.role} onChange={(e) => handleMetadataChange('role', e.target.value)} />}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>Department</Label>
                  <Input placeholder="Department" value={metadata.department} onChange={(e) => handleMetadataChange('department', e.target.value)} />
                </div>
                <div className="w-full">
                  <Label>Site</Label>
                  <Input placeholder="Site location" value={metadata.site} onChange={(e) => handleMetadataChange('site', e.target.value)} />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={handleNextStep} type="button">Next</Button>
            </form>
          )}

          {step === 2 && (
            <div ref={parentRef} className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const [group, questions] = sortedGroups[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                      paddingBottom: '24px'
                    }}
                  >
                    <Card key={group} className="w-full">
                      <CardHeader><CardTitle className="text-base font-semibold text-primary">{group}</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {questions.sort((a, b) => parseInt(a.id) - parseInt(b.id)).map((q) => (
                          <Question key={q.id} q={q} value={answers[q.id] || ""} onChange={handleInputChange} useFilipino={useFilipino} />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
              <div className="absolute w-full" style={{ top: `${rowVirtualizer.getTotalSize()}px`, paddingTop: '12px' }}>
                <Button type="button" onClick={handleSubmit} className="w-full">Submit</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold mb-4">Thank you for participation.</h2>
              <p className="text-gray-500">Your input is invaluable...</p>
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={showResubmitModal} onOpenChange={setShowResubmitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Already Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              This email has already been used to respond to this survey {searchParams.get('period') ? `for this period (${searchParams.get('period')})` : ''}.
              Would you like to resubmit your answers? This will replace your previous submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResubmitModal(false)}>Cancel</AlertDialogCancel>
            <Button onClick={() => {
              setIsResubmitting(true);
              setShowResubmitModal(false);
              setStep(2);
            }}>
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
