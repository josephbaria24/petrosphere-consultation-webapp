'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../../../lib/supabaseClient'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card'
import { Badge } from '../../../../@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import { ClipboardCopy } from 'lucide-react'

type SurveyQuestion = {
  id: string
  survey_id: string
  question_text: string
  question_type: 'text' | 'multiple-choice'
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
  users: {
    name: string
    email: string
  } | null
  survey_questions: SurveyQuestion[]
}


export default function ViewSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSurveys = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id,
          slug,
          title,
          description,
          created_at,
          is_published,
          created_by,
          users:created_by (
            name,
            email
          ),
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

      if (error) {
        toast.error('Error fetching surveys')
        console.error(error)
      } else if (data) {
        const normalized = data.map((survey) => ({
          ...survey,
          users: Array.isArray(survey.users) ? survey.users[0] ?? null : survey.users,
        }))
      
        setSurveys(normalized as Survey[])
      }
      

      setLoading(false)
    }

    fetchSurveys()
  }, [])



  const handleDeleteSurvey = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to delete this survey?')
    if (!confirm) return
  
    const { error } = await supabase.from('surveys').delete().eq('id', id)
  
    if (error) {
      toast.error('Failed to delete survey')
      console.error(error)
    } else {
      toast.success('Survey deleted')
      setSurveys((prev) => prev.filter((s) => s.id !== id))
    }
  }

// Inside component:
const router = useRouter()

const handleEditSurvey = (id: string) => {
  router.push(`/admin/edit-survey/${id}`)
}


  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">All Surveys</h1>
      {loading ? (
        <p>Loading...</p>
      ) : surveys.length === 0 ? (
        <p>No surveys found.</p>
      ) : (
        surveys.map((survey) => (
          <Card key={survey.id}>
            <CardHeader className="flex flex-col md:flex-row md:justify-between">
            <div className="flex items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => handleEditSurvey(survey.id)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSurvey(survey.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>

              <div>
                <CardTitle>{survey.title}</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created by: {survey.users?.name || 'Unknown'} ({survey.users?.email || 'N/A'})
                </p>
              </div>
              <Badge variant={survey.is_published ? 'default' : 'secondary'}>
                {survey.is_published ? 'Published' : 'Draft'}
              </Badge>
              <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const baseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : 'https://petrosphere-consultation.vercel.app' // Fallback for SSR
          const link = survey.slug
            ? `${baseUrl}/survey/${survey.slug}`
            : `${baseUrl}/survey/${survey.id}`
          navigator.clipboard.writeText(link)
          toast.success("Link copied to clipboard!")
        }}
        className="flex items-center gap-1"
      >
        <ClipboardCopy className="w-4 h-4" />
        Copy Link
      </Button>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">{survey.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                Created at: {new Date(survey.created_at).toLocaleString()}
              </p>

              {survey.survey_questions?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Questions:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {survey.survey_questions.map((q, index) => (
                      <li key={q.id}>
                        <span className="font-medium">{index + 1}. {q.question_text}</span> – 
                        <span className="ml-1 text-sm italic">{q.question_type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
