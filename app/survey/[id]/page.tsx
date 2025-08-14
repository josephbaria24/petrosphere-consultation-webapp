'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import Question from "../../../components/survey/Question";
import { cn } from '../../../lib/utils'
import { ChevronsUpDown, Languages } from 'lucide-react'
import { useCallback, useMemo } from "react";

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

type SurveyQuestion = {
  id: string
  question_text: string
  translated_question?: string // optional for translations
  question_type: 'text' | 'multiple-choice' | 'radio' | 'likert'
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
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: '',
    site: '',
  })

  
  const [isOtherRole, setIsOtherRole] = useState(false)

  const roles = [
    "Executive",
    "Manager",
    "Supervisor",
    "Employees / Rank and File" 
  ];
  
  const [useFilipino, setUseFilipino] = useState(false)

// Memoize groupedQuestions so it only recalculates if survey changes
const groupedQuestions = useMemo(() => {
  if (!survey) return {};
  return survey.survey_questions.reduce((acc, q) => {
    (acc[q.dimension] ||= []).push(q);
    return acc;
  }, {} as Record<string, typeof survey.survey_questions>);
}, [survey]);
  

  useEffect(() => {
    if (!params.id) return

    const fetchSurvey = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)

      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id, slug, title, description, created_at, is_published,
          survey_questions (
            id, question_text, translated_question, question_type, options, dimension, dimension_code
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

// Memoize the handler so children don't get new function refs every render
const handleInputChange = useCallback((questionId: string, value: string) => {
  setAnswers((prev) => ({
    ...prev,
    [questionId]: value,
  }));
}, []);

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value,
    }))
  }


const validateMetadata = () => {
  const required = ['first_name','last_name', 'email', 'role', 'department', 'site']
  const missing = required.filter((key) => !metadata[key as keyof typeof metadata])
  if (missing.length > 0) {
    toast.error('Please fill in all fields.')
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
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            role: metadata.role,
            department: metadata.department,
            site: metadata.site,
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
        question_id: q.id, // ✅ link to survey_questions
        question: q.question_text,
        answer: answers[q.id] || '',
        role: metadata.role,
        dimension: q.dimension // optional, if you want to store it directly
      }))
      
  
      const { error: responseError } = await supabase
        .from('responses')
        .insert(responsePayload)
  
      if (responseError) {
        console.error('Response insert error:', responseError)
        throw responseError
      }
  
      toast.success('Answers submitted successfully!')
      setStep(3)
    } catch (err) {
      console.error('Submission error:', err)
      toast.error('Something went wrong during submission.')
    }
  }
  
  

  const renderStepHeader = () => {
    const steps = ['Information', 'Questionnaire', 'Completion']
  
    return (
      <div className="flex flex-wrap items-center justify-between gap-y-4 mb-8 w-full">
        {steps.map((label, index) => {
          const isActive = step === index + 1
          const isCompleted = step > index + 1
  
          return (
            <div key={label} className="flex items-center w-full sm:w-auto flex-1 min-w-[100px]">
              {/* Step icon + label */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 text-[0.75rem] sm:text-sm flex items-center justify-center rounded-full font-medium ${
                    isActive
                      ? 'bg-primary text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
                </div>
                <span
                  className={`text-sm sm:text-base ${
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
  
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4" />
              )}
            </div>
          )
        })}
      </div>
    )
  }
  const [showTooltip, setShowTooltip] = useState(true)

  if (loading) return <p>Loading survey...</p>
  if (!survey) return <p>Survey not found.</p>

  return (
    <div className="max-w-4xl mx-auto p-6">
    <Card className="shadow-lg rounded-2xl p-6 bg-white dark:bg-background">
      <div className="space-y-6">
        <img src="/header3.png" alt="header image" />
        {renderStepHeader()}
        
      <div className=" flex justify-between">
      {step === 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(1)}
          className="w-fit"
        >
          ← Go Back to Information
        </Button>
      )}
      {step === 2 && (
        <div className="flex justify-end mb-4 relative">
          {/* Persistent Tooltip */}
          {showTooltip && (
            <div className="absolute -top-14 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-md z-10 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <span>Click to translate questions</span>
                <button
                  onClick={() => setShowTooltip(false)}
                  className="text-white hover:text-gray-300 text-sm ml-2"
                  aria-label="Close tooltip"
                >
                  ✕
                </button>
              </div>
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          )}

          {/* Translation Toggle Button */}
          <Button variant="outline" size="sm" onClick={() => setUseFilipino(!useFilipino)}>
            <Languages className="mr-2 h-4 w-4" />
            {useFilipino ? 'Translate to English' : 'Translate to Filipino'}
          </Button>
        </div>
      )}


      </div>
      


      {step === 1 && (
        <form className="space-y-4">
        {/* Row 1: Name and Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <Label>First name</Label>
            <Input
              placeholder="Enter your firstname"
              value={metadata.first_name}
              onChange={(e) => handleMetadataChange('first_name', e.target.value)}
            />
          </div>
          <div className="w-full">
            <Label>Last name</Label>
            <Input
              placeholder="Enter your lastname"
              value={metadata.last_name}
              onChange={(e) => handleMetadataChange('last_name', e.target.value)}
            />
          </div>
          
        </div>
      
          
         {/* Row 2: Role and Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full">
            <Label>Email</Label>
            <Input
              placeholder="Enter your email"
              value={metadata.email}
              onChange={(e) => handleMetadataChange('email', e.target.value)}
            />
          </div>

          <div className="w-full">
            <Label>Role</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded="true"
                  className="w-full justify-between"
                >
                  {metadata.role ? metadata.role : 'Select role'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 max-h-60 overflow-y-auto">
                <Command>
                  <CommandInput placeholder="Search role..." />
                  <CommandEmpty>No role found.</CommandEmpty>
                  <CommandGroup>
                    {roles.map((role) => (
                      <CommandItem
                        key={role}
                        onSelect={() => {
                          if (role === 'Others') {
                            setIsOtherRole(true)
                            handleMetadataChange('role', '')
                          } else {
                            setIsOtherRole(false)
                            handleMetadataChange('role', role)
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            metadata.role === role ? 'opacity-100' : 'opacity-0'
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
            <div className="mt-2">
              <Input
                placeholder="Please specify"
                value={metadata.role}
                onChange={(e) => handleMetadataChange('role', e.target.value)}
              />
            </div>
          )}
        </div>
        
       
      </div>

        {/* Row 3: Site */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
     
        <div className="w-full">
          <Label>Department</Label>
          <Input
            placeholder="Enter department"
            value={metadata.department}
            onChange={(e) => handleMetadataChange('department', e.target.value)}
          />
        </div>
          <div className="w-full">
            <Label>Site</Label>
            <Input
              placeholder="Enter site location"
              value={metadata.site}
              onChange={(e) => handleMetadataChange('site', e.target.value)}
            />
          </div>
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
      {Object.entries(groupedQuestions)
        .sort(([a], [b]) => {
          const aNum = parseInt(a.split(".")[0], 10);
          const bNum = parseInt(b.split(".")[0], 10);
          return aNum - bNum;
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
                <Question
                  key={q.id}
                  q={q}
                  value={answers[q.id] || ""}
                  onChange={handleInputChange}
                  useFilipino={useFilipino}
                />
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
          <h2 className="text-2xl font-semibold mb-4">Thank you for participation.</h2>
          <p className="text-gray-500">
          
Your input is invaluable in helping us support a safer and healthier work environment at your site. The insights gathered will guide targeted improvements in safety practices, communication, and overall risk reduction.
We appreciate your trust in allowing us to be part of your continuous safety journey.
Together, let’s build a stronger safety culture.
          </p>
        </div>
      )}
    </div>
    
  </Card>
  </div>
  )
}
