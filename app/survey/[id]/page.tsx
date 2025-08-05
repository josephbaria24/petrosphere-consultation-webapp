'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
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

type SurveyQuestion = {
  id: string
  question_text: string
  question_type: 'text' | 'multiple-choice'
  options: string[] | null
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
  survey_questions: SurveyQuestion[]
}


  
export default function PublicSurveyPage() {
  const params = useParams<{ id: string }>()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState<number>(1)
  const [metadata, setMetadata] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    site: '',
  })
  const groupedQuestions = survey?.survey_questions.reduce((acc, q) => {
    const key = q.dimension // only group by dimension name
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {} as Record<string, SurveyQuestion[]>)
  

  useEffect(() => {
    if (!params.id) return

    const fetchSurvey = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)

      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id, slug, title, description, created_at, is_published,
          survey_questions (
            id, question_text, question_type, options, dimension, dimension_code
          )
        `)
        .eq(isUUID ? 'id' : 'slug', params.id)
        .eq('is_published', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching survey', error)
      } else {
        setSurvey(data as Survey)
      }

      setLoading(false)
    }

    fetchSurvey()
  }, [params.id])

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value,
    }))
  }


const validateMetadata = () => {
  const required = ['name', 'email', 'role', 'department', 'site']
  const missing = required.filter((key) => !metadata[key as keyof typeof metadata])
  if (missing.length > 0) {
    toast.error('Please fill in all metadata fields.')
    return false
  }
  return true
}


const handleSubmit = async () => {
    if (!survey) return
  
    try {
      // 1. Check if user exists
      const { data: user} = await supabase
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
            name: metadata.name,
            role: metadata.role,
            status: 'active',
          })
          .select()
          .single()
  
        if (insertError || !newUser) {
          console.error('User insert error:', insertError)
          throw insertError || new Error('Failed to create user')
        }
  
        userId = newUser.id
      }
  
      // 2. Build valid responses for your schema
      const responsePayload = survey.survey_questions.map((q) => ({
        user_id: userId,
        question: q.question_text, // NOT id
        answer: answers[q.id] || '',
        role: metadata.role,
        department: metadata.department,
        site: metadata.site,
      }))
  
      const { error: responseError } = await supabase
        .from('responses')
        .insert(responsePayload)
  
      if (responseError) {
        console.error('Response insert error:', responseError)
        throw responseError
      }
  
      toast.success('Survey submitted successfully!')
      setStep(3)
    } catch (err) {
      console.error('Submission error:', err)
      toast.error('Something went wrong during submission.')
    }
  }
  
  

  const renderStepHeader = () => {
    const steps = ['Metadata', 'Questionnaire', 'Success']
    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((label, idx) => {
          const current = idx + 1
          return (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-white font-medium ${
                  step === current
                    ? 'bg-primary'
                    : step > current
                    ? 'bg-gray-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {current}
              </div>
              <span
                className={`${
                  step === current
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {current !== steps.length && <div className="w-10 h-px bg-gray-300 mx-2" />}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <p>Loading survey...</p>
  if (!survey) return <p>Survey not found.</p>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {renderStepHeader()}

      {step === 1 && (
        <form className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="Enter your name"
            value={metadata.name}
            onChange={(e) => handleMetadataChange('name', e.target.value)}
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            placeholder="Enter your email"
            value={metadata.email}
            onChange={(e) => handleMetadataChange('email', e.target.value)}
          />
        </div>
        <div>
          <Label>Role</Label>
          <Input
            placeholder="Enter your role"
            value={metadata.role}
            onChange={(e) => handleMetadataChange('role', e.target.value)}
          />
        </div>
        <div>
          <Label>Department</Label>
          <Input
            placeholder="Enter department"
            value={metadata.department}
            onChange={(e) => handleMetadataChange('department', e.target.value)}
          />
        </div>
        <div>
          <Label>Site</Label>
          <Input
            placeholder="Enter site location"
            value={metadata.site}
            onChange={(e) => handleMetadataChange('site', e.target.value)}
          />
        </div>
      
        <Button
            className="mt-4 w-full"
            onClick={() => {
                if (validateMetadata()) setStep(2)
            }}
            type="button"
            >
            Next
            </Button>

      </form>
      
      
      )}

{step === 2 && (
  <form className="space-y-6">
    <div className="space-y-6">
      {groupedQuestions &&
        Object.entries(groupedQuestions)
          .sort(([a], [b]) => {
            const aNum = parseInt(a.split('.')[0], 10)
            const bNum = parseInt(b.split('.')[0], 10)
            return aNum - bNum
          })
          .map(([group, questions]) => (
            <Card key={group} className="w-full">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-primary">
                  {group}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id}>
                    <Label className="block mb-1 font-medium text-sm">
                      {index + 1}. {q.question_text}
                    </Label>

                    {q.question_type === 'multiple-choice' && q.options && (
                      <RadioGroup
                        value={answers[q.id] || ''}
                        onValueChange={(val) => handleInputChange(q.id, val)}
                      >
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                            <Label htmlFor={`${q.id}-${i}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.question_type === 'text' && (
                      <Textarea
                        placeholder="Your answer..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
    </div>

    <Button type="button" onClick={handleSubmit} className="w-full mt-6">
      Submit
    </Button>
  </form>
)}




      {step === 3 && (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">Thank you for completing the survey!</h2>
          <p className="text-gray-500">
            Please wait while we evaluate your consultation result. You’ll receive an email shortly.
          </p>
        </div>
      )}
    </div>
  )
}
