// create-survey.tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'

import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { toast } from 'sonner'
import { supabase } from '../../../../lib/supabaseClient'
import { Switch } from '../../../../@/components/ui/switch'
import { Label } from '../../../../components/ui/label'


type Question = {
  id: number
  question: string
  type: 'text' | 'multiple-choice' | 'likert' | 'radio'
  options?: string[]
}

export default function CreateSurveyPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: '', type: 'text', options: [] },
    ])
  }

  const removeQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: number, updated: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    )
  }

  const handleSubmit = async () => {
    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert([
          {
            title,
            description,
            created_by: null,
            slug: slug || null,
            is_published: isPublished, // set on insert
          },
        ])
        .select()
        .single()
  
      if (surveyError || !survey) {
        console.error("Survey Insert Error:", surveyError?.message || surveyError)
        toast.error("Failed to create survey.")
        return
      }
  
      setSurveyId(survey.id)
  
      const formattedQuestions = questions.map((q, i) => ({
        survey_id: survey.id,
        question_text: q.question,
        question_type: q.type,
        options: ['multiple-choice', 'radio', 'likert'].includes(q.type) ? q.options : null,

        order_index: i,
        is_required: false,
      }))
  
      const { error: questionError } = await supabase
        .from('survey_questions')
        .insert(formattedQuestions)
  
      if (questionError) {
        console.error("Questions Insert Error:", questionError?.message || questionError)
        toast.error("Failed to add questions.")
        return
      }
  
      toast.success(`Survey created${isPublished ? ' and published' : ''} 🎉`)
      setTitle("")
      setDescription("")
      setSlug("")
      setQuestions([])
      setIsPublished(false)
      setSurveyId(null)
    } catch (err) {
      console.error("Unhandled Error:", err)
      toast.error("An unexpected error occurred.")
    }
  }
  


  const [isPublished, setIsPublished] = useState(false)
  const [, setSurveyId] = useState<string | null>(null)

  
  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-6">
      {/* Left Panel: Create Survey */}
      <div className="lg:w-1/3 w-full space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Create New Survey</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="publish-toggle">Publish</Label>
              <Switch
                id="publish-toggle"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardHeader>
  
          <CardContent className="space-y-4">
            <div>
              <Label>Survey Title</Label>
              <Input
                placeholder="e.g. 2025 Employee Feedback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Custom URL Slug</Label>
              <Input
                placeholder="e.g. 2025-feedback"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This will be used in the public survey link (e.g. <code>/survey/{slug || 'your-slug'}</code>)
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description or purpose of the survey"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="button" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </CardContent>
        </Card>
  
        <Button onClick={handleSubmit} className="w-full">
          Save Survey
        </Button>
      </div>
  
      {/* Right Panel: Scrollable Questions */}
      <div className="lg:w-2/3 w-full max-h-[calc(100vh-120px)] overflow-y-auto pr-2 space-y-4">
      {questions.map((q, index) => (
  <Card key={q.id} className="relative">
    <CardHeader>
      <CardTitle>Question {index + 1}</CardTitle>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-red-500"
        onClick={() => removeQuestion(q.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Label>Question Text</Label>
        <Input
          placeholder="e.g. How satisfied are you with your job?"
          value={q.question}
          onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
        />
      </div>

      <div>
        <Label>Question Type</Label>
        <Select
          value={q.type}
          onValueChange={(value: 'text' | 'multiple-choice') =>
            updateQuestion(q.id, { type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
            <SelectItem value="likert">Likert Scale</SelectItem>
            <SelectItem value="radio">Radio Group</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {q.type === 'multiple-choice' && (
        <MultipleChoiceEditor
          question={q}
          onUpdate={(options) => updateQuestion(q.id, { options })}
        />
      )}

      {q.type === 'radio' && (
        <RadioGroupEditor
          question={q}
          onUpdate={(options) => updateQuestion(q.id, { options })}
        />
      )}

      {q.type === 'likert' && (
        <LikertScaleEditor
          onUpdate={(options) => updateQuestion(q.id, { options })}
          initialScale={q.options || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']}
        />
      )}

          </CardContent>
        </Card>
      ))}

      </div>
    </div>
  )
  
}

function RadioGroupEditor({
  question,
  onUpdate,
}: {
  question: Question
  onUpdate: (options: string[]) => void
}) {
  const [options, setOptions] = useState(question.options || [])

  const update = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  const addOption = () => {
    const newOptions = [...options, '']
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  return (
    <div className="space-y-2">
      <Label>Radio Options</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => removeOption(i)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addOption}>
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>
    </div>
  )
}

function LikertScaleEditor({
  onUpdate,
  initialScale,
}: {
  onUpdate: (options: string[]) => void
  initialScale: string[]
}) {
  const [options, setOptions] = useState(initialScale)

  const update = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  return (
    <div className="space-y-2">
      <Label>Likert Scale Labels</Label>
      {options.map((opt, i) => (
        <Input
          key={i}
          value={opt}
          onChange={(e) => update(i, e.target.value)}
          placeholder={`Label ${i + 1}`}
        />
      ))}
    </div>
  )
}

function MultipleChoiceEditor({
  question,
  onUpdate,
}: {
  question: Question
  onUpdate: (options: string[]) => void
}) {
  const [options, setOptions] = useState(question.options || [])

  const update = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  const addOption = () => {
    const newOptions = [...options, '']
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions)
    onUpdate(newOptions)
  }

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => removeOption(i)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addOption}>
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>
    </div>
  )
}
