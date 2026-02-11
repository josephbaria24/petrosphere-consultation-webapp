/**
 * File: app/(main)/user/survey-responses/page.tsx
 * Description: Survey responses analytics page for regular users.
 * Displays a list of surveys and detailed response data filtered by the user's organization.
 * Functions:
 * - SurveyResponsesPage(): Main component for viewing and analyzing organizational survey results.
 * Connections:
 * - Integrated into the Sidebar navigation for regular users (/user/survey-responses).
 * - Queries data directly from Supabase, governed by organization-level RLS.
 * - Uses shared analytics components for data visualization.
 */
'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { toast } from 'sonner'
import { useApp } from '../../../../components/app/AppProvider'
import { Cookies } from "../../../../lib/cookies-client";
import { Badge } from '../../../../@/components/ui/badge'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '../../../../@/components/ui/accordion'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../../components/ui/select'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '../../../../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../../../../@/components/ui/alert'
import { Button } from '../../../../components/ui/button'
import { Calendar, Filter, User as UserIcon, Building, FileText, Download, HelpCircle } from 'lucide-react'
import { Separator } from '../../../../@/components/ui/separator'
import { GatedFeature } from '../../../../components/gated-feature'

type Survey = {
  id: string
  title: string
  created_at: string
  organizations?: {
    name: string
  }[] | null
}

type User = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  site: string
}

type AnswerWithDimension = {
  question: string
  answer: string
  dimension: string
  question_type?: string
}

type ResponseGroup = {
  user_id: string
  user: User | null
  metadata: {
    department: string
    site: string
    role: string
    created_at: string
  }
  answers: AnswerWithDimension[]
}

const getBadgeColor = (answer: string) => {
  // Simple heuristic for badge colors based on typical Likert scale text or numbers
  const lower = answer.toLowerCase()
  if (lower.includes('strongly disagree') || lower.startsWith('1')) return 'bg-destructive/90 text-destructive-foreground hover:bg-destructive'
  if (lower.includes('disagree') || lower.startsWith('2')) return 'bg-orange-500 text-white hover:bg-orange-600'
  if (lower.includes('undecided') || lower.includes('neutral') || lower.startsWith('3')) return 'bg-yellow-500 text-white hover:bg-yellow-600'
  if (lower.includes('agree') || lower.startsWith('4')) return 'bg-blue-500 text-white hover:bg-blue-600'
  if (lower.includes('strongly agree') || lower.startsWith('5')) return 'bg-emerald-500 text-white hover:bg-emerald-600'
  return 'bg-secondary text-secondary-foreground'
}
export default function SurveyResponsesPage() {
  const { user, org, membership, subscription } = useApp()
  const isAdminCookie = !!Cookies.get("admin_id");
  const isPlatformAdmin = isAdminCookie;
  const isRestrictedToAuthored = !isPlatformAdmin && (subscription?.plan === "demo" || membership?.role !== "admin");

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [responseGroups, setResponseGroups] = useState<ResponseGroup[]>([])
  const [loadingSurveys, setLoadingSurveys] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!org?.id) return;
      try {
        let query = supabase
          .from('surveys')
          .select('id, title, created_at, org_id, organizations(name)')
          .order('created_at', { ascending: false })

        if (!isPlatformAdmin && org?.id) {
          const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';
          if (isRestrictedToAuthored) {
            query = query.or(`and(org_id.eq.${org.id},created_by.eq.${user?.id || ''}),id.eq.${DEFAULT_SURVEY_ID}`)
          } else {
            query = query.or(`org_id.eq.${org.id},id.eq.${DEFAULT_SURVEY_ID}`)
          }
        }

        const { data, error } = await query

        if (error) throw error

        if (data) {
          // Sort Default Survey to Top if present
          const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';
          const sorted = data.sort((a, b) => {
            if (a.id === DEFAULT_SURVEY_ID) return -1;
            if (b.id === DEFAULT_SURVEY_ID) return 1;
            return 0;
          });

          setSurveys(sorted)
          if (sorted.length > 0) {
            setSelectedSurveyId(sorted[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching surveys:', error)
        toast.error('Failed to load surveys')
      } finally {
        setLoadingSurveys(false)
      }
    }
    fetchSurveys()
  }, [org?.id, isPlatformAdmin, isRestrictedToAuthored, user?.id])

  // 2. Fetch Responses when Survey Changes
  useEffect(() => {
    if (!selectedSurveyId) {
      setResponseGroups([])
      return
    }

    const fetchData = async () => {
      setLoadingResponses(true)
      try {
        // A. Get Questions for this survey to filter responses
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('id, question_text, dimension, question_type')
          .eq('survey_id', selectedSurveyId)

        if (questionsError) throw questionsError
        if (!questions || questions.length === 0) {
          setResponseGroups([])
          return
        }

        const questionIds = questions.map(q => q.id)
        const questionMap = new Map(questions.map(q => [q.id, q]))

        // B. Get Responses for these questions
        let responseQuery = supabase
          .from('responses')
          .select('*')
          .in('question_id', questionIds)
          .order('created_at', { ascending: false })

        // SECURITY: If not a platform admin, MUST filter responses by org_id
        if (!isPlatformAdmin && org?.id) {
          responseQuery = responseQuery.eq('org_id', org.id)
        }

        const { data: responses, error: responsesError } = await responseQuery

        if (responsesError) throw responsesError
        if (!responses || responses.length === 0) {
          setResponseGroups([])
          return
        }

        // C. Get Users for these responses
        const userIds = Array.from(new Set(responses.map(r => r.user_id).filter(Boolean)))

        let usersMap = new Map<string, User>()
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, role, department, site')
            .in('id', userIds)

          if (usersError) {
            console.error("Error fetching users", usersError)
            // continue without users info if helpful, typically rare
          } else if (users) {
            users.forEach(u => usersMap.set(u.id, u))
          }
        }

        // D. Group Responses by User (Session)
        // Note: Assuming one submission per user per survey for simplicity, 
        // or we group by user_id. If a user can submit multiple times, we might need a session_id or grouping by time window.
        // Here we group by user_id as a simpler 'Respondent' view.

        const groupedMap = new Map<string, ResponseGroup>()

        responses.forEach(r => {
          const userId = r.user_id || 'anonymous'
          if (!groupedMap.has(userId)) {
            const user = usersMap.get(r.user_id) || null
            groupedMap.set(userId, {
              user_id: userId,
              user,
              metadata: {
                department: user?.department || r.department || 'Unknown', // Fallback if reaction has metadata
                site: user?.site || r.site || 'Unknown',
                role: user?.role || r.role || 'Unknown',
                created_at: r.created_at
              },
              answers: []
            })
          }

          const group = groupedMap.get(userId)!
          // Prefer older submission time if multiple, or newest? Usually newest is 'latest' submission.
          // But we sorted desc, so first one is latest. 
          // Actually metadata is per-response row repeated typically? 
          // We just take the first row's time.

          const qInfo = questionMap.get(r.question_id)
          group.answers.push({
            question: qInfo?.question_text || r.question || 'Unknown Question',
            answer: r.answer,
            dimension: qInfo?.dimension || r.dimension || 'Uncategorized',
            question_type: qInfo?.question_type
          })
        })

        setResponseGroups(Array.from(groupedMap.values()))

      } catch (error) {
        console.error('Error fetching responses:', error)
        toast.error('Failed to load responses for this survey')
      } finally {
        setLoadingResponses(false)
      }
    }

    fetchData()
  }, [selectedSurveyId, org?.id, isPlatformAdmin, isRestrictedToAuthored])


  const selectedSurveyTitle = useMemo(() =>
    surveys.find(s => s.id === selectedSurveyId)?.title || 'Survey',
    [selectedSurveyId, surveys])

  return (
    <GatedFeature
      isRestricted={isRestrictedToAuthored}
      featureName="Individual Responses"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Survey Responses</h1>
            <p className="text-muted-foreground">
              View and analyze individual respondent data.
            </p>
          </div>

          {/* Filters */}
          <div className="w-full md:w-[300px]">
            {loadingSurveys ? (
              <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
            ) : surveys.length > 0 ? (
              <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title} {survey.organizations?.[0]?.name ? `(${survey.organizations[0].name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground border p-2 rounded">No surveys found</div>
            )}
          </div>
        </div>

        {loadingSurveys ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-muted rounded-xl" />)}
          </div>
        ) : surveys.length === 0 ? (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>No Surveys Found</AlertTitle>
            <AlertDescription>Create and publish a survey to start collecting responses.</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Stats / Info Bar (Optional future expansion) */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
              <FileText className="h-4 w-4" />
              <span>Viewing <strong>{responseGroups.length}</strong> respondents for</span>
              <span className="font-semibold text-foreground">"{selectedSurveyTitle}"</span>
            </div>

            {loadingResponses ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading response data...</p>
              </div>
            ) : responseGroups.length === 0 ? (
              <Card className="border-dashed bg-muted/5">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UserIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="font-semibold text-lg">No Responses Yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1">
                    This survey hasn't received any submissions yet. Share the survey link to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Responses List */}
                <Accordion type="multiple" className="space-y-3">
                  {responseGroups.map((group, idx) => (
                    <AccordionItem key={group.user_id + idx} value={group.user_id + idx} className="border rounded-xl bg-card shadow-sm px-0 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline px-4 py-3 md:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full text-left">
                          {/* User Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {group.user?.first_name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold truncate">
                                {group.user ? `${group.user.first_name} ${group.user.last_name}` : 'Unknown Respondent'}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="truncate">{group.user?.email || 'No email provided'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Meta Badges */}
                          <div className="flex flex-wrap gap-2 sm:justify-end mr-4">
                            <div className="flex items-center text-xs text-muted-foreground mr-2" title={new Date(group.metadata.created_at).toLocaleString()}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(group.metadata.created_at).toLocaleDateString()}
                            </div>
                            <Badge variant="outline" className="font-normal text-xs bg-muted/50">
                              {group.metadata.role}
                            </Badge>
                            <Badge variant="outline" className="font-normal text-xs bg-muted/50">
                              {group.metadata.department}
                            </Badge>
                            <Badge variant="outline" className="font-normal text-xs bg-muted/50">
                              {group.metadata.site}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="border-t bg-muted/10 p-4 md:p-6 space-y-6">

                          {/* Group Answers by Dimension */}
                          {Object.entries(
                            group.answers.reduce<Record<string, AnswerWithDimension[]>>((acc, curr) => {
                              const dim = curr.dimension || 'Uncategorized'
                              if (!acc[dim]) acc[dim] = []
                              acc[dim].push(curr)
                              return acc
                            }, {})
                          )
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([dim, answers], i) => (
                              <div key={i} className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                  {dim}
                                </h4>
                                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                  {answers.map((ans, j) => (
                                    <div key={j} className="bg-background border rounded-lg p-3 text-sm shadow-sm">
                                      <p className="font-medium text-foreground mb-2 leading-snug">
                                        {ans.question}
                                      </p>
                                      <Badge className={`font-medium ${getBadgeColor(ans.answer)}`}>
                                        {ans.answer}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </>
        )}

      </div>
    </GatedFeature>
  )
}
