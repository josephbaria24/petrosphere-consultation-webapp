// app/survey/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

type SurveyQuestion = {
  id: string
  question_text: string
  question_type: 'text' | 'multiple-choice'
  options: string[] | null
}

type Survey = {
  id: string
  title: string
  description: string
  created_at: string
  is_published: boolean
  survey_questions: SurveyQuestion[]
}

export default function PublicSurveyPage() {
  const params = useParams<{ id: string }>()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return

    const fetchSurvey = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id, title, description, created_at, is_published,
          survey_questions (
            id, question_text, question_type, options
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching survey', error)
      } else {
        setSurvey(data as Survey)
      }

      setLoading(false)
    }

    fetchSurvey()
  }, [params.id])

  if (loading) return <p>Loading survey...</p>
  if (!survey) return <p>Survey not found.</p>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
      <p className="mb-4 text-gray-500">{survey.description}</p>
      <div className="space-y-4">
        {survey.survey_questions?.map((q, index) => (
          <div key={q.id}>
            <p className="font-medium">
              {index + 1}. {q.question_text}
            </p>
            {q.question_type === 'multiple-choice' && (
              <ul className="list-disc ml-6">
                {q.options?.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
