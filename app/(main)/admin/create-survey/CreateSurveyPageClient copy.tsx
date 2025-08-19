// create-survey.tsx
'use client'

import { useEffect, useState } from 'react'
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
  type: 'text' | 'multiple-choice' | 'radio'
  options?: string[]
  dimension?: string
  dimension_code?: string
  translated_question?: string
  scoring_type?: string
  max_score?: number
  min_score?: number
  reverse_score?: boolean
  translated_options?: string[]
  template_id?: string
}

export default function CreateSurveyPage() {
 
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [targetCompany, setTargetCompany] = useState('') // ✅ NEW STATE
  const [optionTemplates, setOptionTemplates] = useState<any[]>([])
  const [dimensions, setDimensions] = useState([])

  useEffect(() => {
    const fetchDimensions = async () => {
      const { data, error } = await supabase
        .from('dimensions')
        .select('*')
  
      if (error) {
        console.error('Error loading dimensions', error)
      } else {
        setDimensions(data)
      }
    }
  
    fetchDimensions()
  }, [])
  
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('option_templates')
        .select('*')
        .eq('is_active', true)
  
      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        setOptionTemplates(data)
      }
    }
  
    fetchTemplates()
  }, [])
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
            is_published: isPublished,
            target_company: targetCompany || null, // ✅ NEW FIELD
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
        dimension: q.dimension || null,
        dimension_code: q.dimension_code || null,
        translated_question: q.translated_question || null,
        scoring_type: q.scoring_type || null,
        max_score: q.max_score || null,
        min_score: q.min_score || null,
        reverse_score: q.reverse_score ?? false,
        translated_options: q.translated_options || null,
        template_id: q.template_id || null,
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
      setTargetCompany("") // ✅ RESET FIELD
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
  <Label>Target Company</Label>
  <Input
    placeholder="e.g. Acme Corporation"
    value={targetCompany}
    onChange={(e) => setTargetCompany(e.target.value)}
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
    <Label>Translated Question</Label>
    <Input
      placeholder="e.g. Ano ang iyong kasiyahan sa trabaho?"
      value={q.translated_question || ''}
      onChange={(e) => updateQuestion(q.id, { translated_question: e.target.value })}
    />
  </div>


  <div>
    <Label>Question Type</Label>
    <Select
      value={q.type}
      onValueChange={(value: 'text' | 'multiple-choice' | 'radio') =>
        updateQuestion(q.id, { type: value })
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="text">Text</SelectItem>
        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
        <SelectItem value="radio">Radio Group</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {['multiple-choice', 'radio'].includes(q.type) && (
  <div>
    <Label>Use Option Template</Label>
    <Select
      onValueChange={(templateId) => {
        const selected = optionTemplates.find((t) => t.id === templateId)
        if (selected) {
          updateQuestion(q.id, {
            template_id: selected.id,
            options: selected.options,
            translated_options: selected.translated_options,
            max_score: selected.scores ? Math.max(...selected.scores) : undefined,
            min_score: selected.scores ? Math.min(...selected.scores) : undefined,
          })
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a template (optional)" />
      </SelectTrigger>
      <SelectContent>
        {optionTemplates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name} ({template.language})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}



  {/* New Supabase fields */}
  <div>
    <Label>Dimension</Label>
    <Input
      placeholder="e.g. Job Satisfaction"
      value={q.dimension || ''}
      onChange={(e) => updateQuestion(q.id, { dimension: e.target.value })}
    />
  </div>

  <div>
  <Label>Dimension Code</Label>
  <Select
    value={q.dimension_code || ''}
    onValueChange={(code: string) => {
      const matched = dimensions.find(d => d.code === code)
      updateQuestion(q.id, {
        dimension_code: matched?.code,
        dimension: matched?.dimension_name || '', // optionally update the name too
      })
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select dimension code" />
    </SelectTrigger>
    <SelectContent>
      {dimensions.map((d) => (
        <SelectItem key={d.code} value={d.code}>
          {d.code} – {d.dimension_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>


 

  <div>
  <Label>Scoring Type</Label>
  <Select
    value={q.scoring_type || ''}
    onValueChange={(value: string) =>
      updateQuestion(q.id, { scoring_type: value })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Select scoring type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="positive">Positive</SelectItem>
      <SelectItem value="negative">Negative</SelectItem>
      <SelectItem value="text">Text</SelectItem>
    </SelectContent>
  </Select>
</div>


  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label>Max Score</Label>
      <Input
        type="number"
        value={q.max_score ?? ''}
        onChange={(e) => updateQuestion(q.id, { max_score: Number(e.target.value) })}
      />
    </div>

    <div>
      <Label>Min Score</Label>
      <Input
        type="number"
        value={q.min_score ?? ''}
        onChange={(e) => updateQuestion(q.id, { min_score: Number(e.target.value) })}
      />
    </div>
  </div>

  <div className="flex items-center space-x-2">
    <Switch
      id={`reverse-${q.id}`}
      checked={q.reverse_score ?? false}
      onCheckedChange={(checked) =>
        updateQuestion(q.id, { reverse_score: checked })
      }
    />
    <Label htmlFor={`reverse-${q.id}`}>Reverse Score</Label>
  </div>

  <div>
    <Label>Translated Options (comma-separated)</Label>
    <Input
      placeholder="e.g. Lubos na Hindi Sang-ayon, Hindi Sang-ayon, Neutral..."
      value={(q.translated_options || []).join(', ')}
      onChange={(e) =>
        updateQuestion(q.id, {
          translated_options: e.target.value
            .split(',')
            .map((opt) => opt.trim())
            .filter(Boolean),
        })
      }
    />
  </div>

  {/* Existing option editors */}
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
      updateQuestion={updateQuestion} // ✅ pass it here
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
  updateQuestion,
}: {
  question: Question
  onUpdate: (options: string[]) => void
  updateQuestion: (id: number, updated: Partial<Question>) => void
}) {
  const [options, setOptions] = useState<string[]>(question.options || [])

  useEffect(() => {
    setOptions(question.options || [])
  }, [question.options])

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

  // 🔽 Suggestion Template Logic
  const likertEnglish = [
    'Strongly Disagree',
    'Disagree',
    'Undecided',
    'Agree',
    'Strongly Agree',
  ]

  const likertTagalog = [
    'Lubos na Hindi Sang-ayon',
    'Hindi Sang-ayon',
    'Neutral',
    'Sang-ayon',
    'Lubos na Sang-ayon',
  ]

  const applyLikertTemplate = () => {
    setOptions(likertEnglish)
    onUpdate(likertEnglish)
    // Update parent question’s translated_options
    updateQuestion(question.id, { translated_options: likertTagalog })
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
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" onClick={addOption}>
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>
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

  useEffect(() => {
    setOptions(initialScale)
  }, [initialScale])

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

  useEffect(() => {
    setOptions(question.options || [])
  }, [question.options])

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
