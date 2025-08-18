'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { toast } from 'sonner'
import { Badge } from '../../../../@/components/ui/badge'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '../../../../@/components/ui/accordion'
import { Separator } from '@radix-ui/react-dropdown-menu'


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
}

type ResponseGroup = {
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
    switch (answer) {
      case 'Strongly Disagree (1)':
        return 'bg-red-500 text-white'
      case 'Disagree (2)':
        return 'bg-orange-400 text-white'
      case 'Undecided (3)':
        return 'bg-yellow-400 text-black'
      case 'Agree (4)':
        return 'bg-blue-500 text-white'
      case 'Strongly Agree (5)':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-300 text-black'
    }
  }
  

export default function SurveyResponsesPage() {
  const [responseGroups, setResponseGroups] = useState<ResponseGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResponses = async () => {
        const { data: responses, error: responsesError } = await supabase
  .from('responses')
  .select('*')
  .order('created_at', { ascending: false })

if (responsesError || !responses) {
  toast.error('Failed to load responses')
  console.error('Response error:', responsesError)
  setLoading(false)
  return
}

const { data: questions, error: questionsError } = await supabase
  .from('survey_questions')
  .select('id, question_text, dimension')

if (questionsError || !questions) {
  toast.error('Failed to load questions')
  console.error('Question error:', questionsError)
  setLoading(false)
  return
}

// Enrich responses with dimension and question text
const enrichedResponses = responses.map((r) => {
  const question = questions.find((q) => q.id === r.question_id)
  return {
    ...r,
    question_text: question?.question_text || 'Unknown',
    dimension: question?.dimension || 'Uncategorized',
  }
})

            

      if (responsesError) {
        toast.error('Failed to load responses')
        console.error(responsesError)
        setLoading(false)
        return
      }

      const userIds = Array.from(new Set(responses.map(r => r.user_id)))
      const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, department, site')
      .in('id', userIds)
    

      if (usersError) {
        toast.error('Failed to fetch user info')
        console.error(usersError)
        setLoading(false)
        return
      }

      const grouped: ResponseGroup[] = Object.values(
        enrichedResponses.reduce<Record<string, ResponseGroup>>((acc, curr) => {
          const user = users.find((u) => u.id === curr.user_id) ?? null
      
          if (!acc[curr.user_id]) {
            acc[curr.user_id] = {
              user,
              metadata: {
                department: user?.department || 'Unknown',
                site: user?.site || 'Unknown',
                role: user?.role || 'Unknown',
                created_at: curr.created_at,
              },
              answers: [],
            }
          }
      
          acc[curr.user_id].answers.push({
            question: curr.question_text,
            answer: curr.answer,
            dimension: curr.dimension,
          })
      
          return acc
        }, {})
      )
      

      setResponseGroups(grouped)
      setLoading(false)
    }

    fetchResponses()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Survey Responses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : responseGroups.length === 0 ? (
        <p>No responses submitted yet.</p>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {responseGroups.map((group, idx) => (
            <AccordionItem key={idx} value={`response-${idx}`} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-left text-base font-medium hover:no-underline">
                <div className="flex flex-col w-full text-left">
                  <span>
                    {group.user
                      ? `${group.user.first_name} ${group.user.last_name}`
                      : 'Unknown User'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {group.user?.email || 'No email'} ·{' '}
                    {new Date(group.metadata.created_at).toLocaleString()}
                  </span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">Role: {group.metadata.role}</Badge>
                    <Badge variant="outline">Dept: {group.metadata.department}</Badge>
                    <Badge variant="outline">Site: {group.metadata.site}</Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6 bg-muted/20">
                {Object.entries(
                    group.answers.reduce<Record<string, AnswerWithDimension[]>>((acc, curr) => {
                    if (!acc[curr.dimension]) acc[curr.dimension] = []
                    acc[curr.dimension].push(curr)
                    return acc
                    }, {})
                )
                    .sort(([a], [b]) => a.localeCompare(b)) // Sort dimensions alphabetically
                    .map(([dimensionName, answers], i) => (
                    <div key={i} className="space-y-4">
                        <h4 className="font-semibold text-primary">{dimensionName}</h4>
                        <Separator className="bg-gray-300 h-px mb-2" />
                        {answers
                        .sort((a, b) => a.question.localeCompare(b.question)) // Sort questions
                        .map((qa, j) => (
                            <div key={j} className="flex flex-col gap-1">
                            <p className="text-sm font-medium">{j + 1}. {qa.question}</p>
                            <Badge className={`w-fit italic ${getBadgeColor(qa.answer)}`}>
                                {qa.answer}
                            </Badge>
                            </div>
                        ))}
                    </div>
                    ))}
                </AccordionContent>

            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
