'use client'

import { useEffect, useState, useCallback, useMemo, memo } from 'react'
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

// Memoized Question Card Component
const QuestionCard = memo(({ 
  question, 
  index, 
  onUpdate, 
  onRemove, 
  dimensions, 
  optionTemplates 
}: {
  question: Question
  index: number
  onUpdate: (id: number, updated: Partial<Question>) => void
  onRemove: (id: number) => void
  dimensions: any[]
  optionTemplates: any[]
}) => {
  // Memoized handlers to prevent unnecessary re-renders
  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { question: e.target.value })
  }, [question.id, onUpdate])

  const handleTranslatedQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { translated_question: e.target.value })
  }, [question.id, onUpdate])

  const handleTypeChange = useCallback((value: 'text' | 'multiple-choice' | 'radio') => {
    onUpdate(question.id, { type: value })
  }, [question.id, onUpdate])

  const handleTemplateChange = useCallback((templateId: string) => {
    const selected = optionTemplates.find((t) => t.id === templateId)
    if (selected) {
      onUpdate(question.id, {
        template_id: selected.id,
        options: selected.options,
        translated_options: selected.translated_options,
        max_score: selected.scores ? Math.max(...selected.scores) : undefined,
        min_score: selected.scores ? Math.min(...selected.scores) : undefined,
      })
    }
  }, [question.id, onUpdate, optionTemplates])

  const handleDimensionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { dimension: e.target.value })
  }, [question.id, onUpdate])

  const handleDimensionCodeChange = useCallback((code: string) => {
    const matched = dimensions.find((d) => d.code === code)
    onUpdate(question.id, {
      dimension_code: matched?.code,
      dimension: matched?.dimension_name || '',
    })
  }, [question.id, onUpdate, dimensions])

  const handleScoringTypeChange = useCallback((value: string) => {
    onUpdate(question.id, { scoring_type: value })
  }, [question.id, onUpdate])

  const handleMaxScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { max_score: Number(e.target.value) })
  }, [question.id, onUpdate])

  const handleMinScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { min_score: Number(e.target.value) })
  }, [question.id, onUpdate])

  const handleReverseScoreChange = useCallback((checked: boolean) => {
    onUpdate(question.id, { reverse_score: checked })
  }, [question.id, onUpdate])

  const handleTranslatedOptionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, {
      translated_options: e.target.value
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean),
    })
  }, [question.id, onUpdate])

  const handleOptionsUpdate = useCallback((options: string[]) => {
    onUpdate(question.id, { options })
  }, [question.id, onUpdate])

  const handleRemove = useCallback(() => {
    onRemove(question.id)
  }, [question.id, onRemove])

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Question {index + 1}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-red-500"
          onClick={handleRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Question Text</Label>
          <Input
            placeholder="e.g. How satisfied are you with your job?"
            value={question.question}
            onChange={handleQuestionChange}
          />
        </div>
        
        <div>
          <Label>Translated Question</Label>
          <Input
            placeholder="e.g. Ano ang iyong kasiyahan sa trabaho?"
            value={question.translated_question || ''}
            onChange={handleTranslatedQuestionChange}
          />
        </div>

        <div>
          <Label>Question Type</Label>
          <Select value={question.type} onValueChange={handleTypeChange}>
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

        {['multiple-choice', 'radio'].includes(question.type) && (
          <div>
            <Label>Use Option Template</Label>
            <Select onValueChange={handleTemplateChange}>
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

        <div>
          <Label>Dimension</Label>
          <Input
            placeholder="e.g. Job Satisfaction"
            value={question.dimension || ''}
            onChange={handleDimensionChange}
          />
        </div>

        <div>
          <Label>Dimension Code</Label>
          <Select
            value={question.dimension_code || ''}
            onValueChange={handleDimensionCodeChange}
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
            value={question.scoring_type || 'positive'}
            onValueChange={handleScoringTypeChange}
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
              value={question.max_score ?? ''}
              onChange={handleMaxScoreChange}
            />
          </div>
          <div>
            <Label>Min Score</Label>
            <Input
              type="number"
              value={question.min_score ?? ''}
              onChange={handleMinScoreChange}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id={`reverse-${question.id}`}
            checked={question.reverse_score ?? false}
            onCheckedChange={handleReverseScoreChange}
          />
          <Label htmlFor={`reverse-${question.id}`}>Reverse Score</Label>
        </div>

        <div>
          <Label>Translated Options (comma-separated)</Label>
          <Input
            placeholder="e.g. Lubos na Hindi Sang-ayon, Hindi Sang-ayon, Neutral..."
            value={(question.translated_options || []).join(', ')}
            onChange={handleTranslatedOptionsChange}
          />
        </div>

        {question.type === 'multiple-choice' && (
          <MultipleChoiceEditor
            question={question}
            onUpdate={handleOptionsUpdate}
          />
        )}
        {question.type === 'radio' && (
          <RadioGroupEditor
            question={question}
            onUpdate={handleOptionsUpdate}
            updateQuestion={onUpdate}
          />
        )}
      </CardContent>
    </Card>
  )
})

QuestionCard.displayName = 'QuestionCard'

export default function CreateSurveyPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [targetCompany, setTargetCompany] = useState('')
  const [optionTemplates, setOptionTemplates] = useState<any[]>([])
  const [dimensions, setDimensions] = useState<any[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [, setSurveyId] = useState<string | null>(null)

  // Memoize static data to prevent unnecessary re-renders
  const memoizedDimensions = useMemo(() => dimensions, [dimensions])
  const memoizedOptionTemplates = useMemo(() => optionTemplates, [optionTemplates])

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

  // Memoized handlers to prevent unnecessary re-renders
  const addQuestion = useCallback(() => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: '', type: 'text', options: [] },
    ])
  }, [])

  const removeQuestion = useCallback((id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const updateQuestion = useCallback((id: number, updated: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    )
  }, [])

  const handleSubmit = useCallback(async () => {
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
            target_company: targetCompany || null,
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

      toast.success(`Survey created${isPublished ? ' and published' : ''}`)
      setTitle("")
      setDescription("")
      setSlug("")
      setTargetCompany("")
      setQuestions([])
      setIsPublished(false)
      setSurveyId(null)
    } catch (err) {
      console.error("Unhandled Error:", err)
      toast.error("An unexpected error occurred.")
    }
  }, [title, description, slug, targetCompany, isPublished, questions])

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
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={updateQuestion}
            onRemove={removeQuestion}
            dimensions={memoizedDimensions}
            optionTemplates={memoizedOptionTemplates}
          />
        ))}
      </div>
    </div>
  )
}

// Optimized Option Editors
const RadioGroupEditor = memo(({
  question,
  onUpdate,
  updateQuestion,
}: {
  question: Question
  onUpdate: (options: string[]) => void
  updateQuestion: (id: number, updated: Partial<Question>) => void
}) => {
  const [localOptions, setLocalOptions] = useState<string[]>(question.options || [])

  // Sync with parent when question.options changes from external sources (like templates)
  useEffect(() => {
    setLocalOptions(question.options || [])
  }, [question.options])

  const updateParent = useCallback((newOptions: string[]) => {
    onUpdate(newOptions)
  }, [onUpdate])

  const update = useCallback((index: number, value: string) => {
    const newOptions = [...localOptions]
    newOptions[index] = value
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  const addOption = useCallback(() => {
    const newOptions = [...localOptions, '']
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  const removeOption = useCallback((index: number) => {
    const newOptions = localOptions.filter((_, i) => i !== index)
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  // Memoized template data
  const likertEnglish = useMemo(() => [
    'Strongly Disagree',
    'Disagree',
    'Undecided',
    'Agree',
    'Strongly Agree',
  ], [])

  const likertTagalog = useMemo(() => [
    'Lubos na Hindi Sang-ayon',
    'Hindi Sang-ayon',
    'Neutral',
    'Sang-ayon',
    'Lubos na Sang-ayon',
  ], [])

  const applyLikertTemplate = useCallback(() => {
    setLocalOptions(likertEnglish)
    updateParent(likertEnglish)
    updateQuestion(question.id, { translated_options: likertTagalog })
  }, [likertEnglish, likertTagalog, updateParent, updateQuestion, question.id])

  return (
    <div className="space-y-2">
      <Label>Radio Options</Label>
      {localOptions.map((opt, i) => (
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
})

RadioGroupEditor.displayName = 'RadioGroupEditor'

const LikertScaleEditor = memo(({
  onUpdate,
  initialScale,
}: {
  onUpdate: (options: string[]) => void
  initialScale: string[]
}) => {
  const [options, setOptions] = useState(initialScale)

  useEffect(() => {
    setOptions(initialScale)
  }, [initialScale])

  const update = useCallback((index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    onUpdate(newOptions)
  }, [options, onUpdate])

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
})

LikertScaleEditor.displayName = 'LikertScaleEditor'

const MultipleChoiceEditor = memo(({
  question,
  onUpdate,
}: {
  question: Question
  onUpdate: (options: string[]) => void
}) => {
  const [localOptions, setLocalOptions] = useState(question.options || [])

  useEffect(() => {
    setLocalOptions(question.options || [])
  }, [question.options])

  const updateParent = useCallback((newOptions: string[]) => {
    onUpdate(newOptions)
  }, [onUpdate])

  const update = useCallback((index: number, value: string) => {
    const newOptions = [...localOptions]
    newOptions[index] = value
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  const addOption = useCallback(() => {
    const newOptions = [...localOptions, '']
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  const removeOption = useCallback((index: number) => {
    const newOptions = localOptions.filter((_, i) => i !== index)
    setLocalOptions(newOptions)
    updateParent(newOptions)
  }, [localOptions, updateParent])

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {localOptions.map((opt, i) => (
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
})

MultipleChoiceEditor.displayName = 'MultipleChoiceEditor'