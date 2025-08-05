// create-survey.tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Label } from '@radix-ui/react-dropdown-menu'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { toast } from 'sonner'
import { supabase } from '../../../../lib/supabaseClient'


type Question = {
  id: number
  question: string
  type: 'text' | 'multiple-choice'
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
            created_by: null, // Set this to a real user ID if needed
            slug: slug || null,
          },
        ])
        .select()
        .single()
  
      if (surveyError || !survey) {
        console.error("Survey Insert Error:", surveyError?.message || surveyError)
        toast.error("Failed to create survey.")
        return
      }
  
      const formattedQuestions = questions.map((q, i) => ({
        survey_id: survey.id,
        question_text: q.question,
        question_type: q.type,
        options: q.type === 'multiple-choice' ? q.options : null,
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
  
      toast.success("Survey created successfully 🎉")
      setTitle("")
      setDescription("")
      setQuestions([])
    } catch (err) {
      console.error("Unhandled Error:", err)
      toast.error("An unexpected error occurred.")
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Survey</CardTitle>
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
                onChange={(e) =>
                  updateQuestion(q.id, { question: e.target.value })
                }
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
                </SelectContent>
              </Select>
            </div>

            {q.type === 'multiple-choice' && (
              <MultipleChoiceEditor
                question={q}
                onUpdate={(options) => updateQuestion(q.id, { options })}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSubmit} className="w-full">
        Save Survey
      </Button>
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
