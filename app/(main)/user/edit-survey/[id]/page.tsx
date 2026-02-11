'use client'

import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../../../components/ui/card'
import { Input } from '../../../../../components/ui/input'
import { Button } from '../../../../../components/ui/button'
import { Textarea } from '../../../../../components/ui/textarea'
import { Label } from '../../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select'

import { Trash2, Plus } from 'lucide-react'
import { Switch } from '../../../../../@/components/ui/switch'

type Question = {
  id: number | string
  question: string
  type: 'text' | 'multiple-choice' | 'likert' | 'radio'
  options?: string[]
  isNew?: boolean
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

type RawSurveyQuestion = {
  id: number | string
  question_text: string
  question_type: 'text' | 'multiple-choice' | 'likert' | 'radio'
  options?: string[] | null
  order_index?: number
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
  onUpdate: (id: number | string, updated: Partial<Question>) => void
  onRemove: (id: number | string) => void
  dimensions: any[]
  optionTemplates: any[]
}) => {
  // Local handlers to prevent prop drilling and excessive re-renders
  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { question: e.target.value })
  }, [question.id, onUpdate])

  const handleTranslatedQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(question.id, { translated_question: e.target.value })
  }, [question.id, onUpdate])

  const handleTypeChange = useCallback((value: 'text' | 'multiple-choice' | 'radio' | 'likert') => {
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
        {/* Question text */}
        <div>
          <Label>Question Text</Label>
          <Input
            value={question.question}
            onChange={handleQuestionChange}
          />
        </div>

        {/* Translated question */}
        <div>
          <Label>Translated Question</Label>
          <Input
            placeholder="e.g. Ano ang iyong kasiyahan sa trabaho?"
            value={question.translated_question || ''}
            onChange={handleTranslatedQuestionChange}
          />
        </div>

        {/* Question type */}
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
              <SelectItem value="likert">Likert Scale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Option template */}
        {['multiple-choice', 'radio', 'likert'].includes(question.type) && (
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

        {/* Dimension */}
        <div>
          <Label>Dimension</Label>
          <Input
            placeholder="e.g. Job Satisfaction"
            value={question.dimension || ''}
            onChange={handleDimensionChange}
          />
        </div>

        {/* Dimension Code */}
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

        {/* Scoring Type */}
        <div>
          <Label>Scoring Type</Label>
          <Select
            value={question.scoring_type || ''}
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

        {/* Max / Min Score */}
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

        {/* Reverse Score */}
        <div className="flex items-center space-x-2">
          <Switch
            id={`reverse-${question.id}`}
            checked={question.reverse_score ?? false}
            onCheckedChange={handleReverseScoreChange}
          />
          <Label htmlFor={`reverse-${question.id}`}>Reverse Score</Label>
        </div>

        {/* Translated Options */}
        <div>
          <Label>Translated Options (comma-separated)</Label>
          <Input
            placeholder="e.g. Lubos na Hindi Sang-ayon, Hindi Sang-ayon, Neutral..."
            value={(question.translated_options || []).join(', ')}
            onChange={handleTranslatedOptionsChange}
          />
        </div>

        {/* Option editors */}
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
          />
        )}
        {question.type === 'likert' && (
          <LikertScaleEditor
            onUpdate={handleOptionsUpdate}
            initialScale={
              question.options || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
            }
          />
        )}
      </CardContent>
    </Card>
  )
})

QuestionCard.displayName = 'QuestionCard'

export default function EditSurveyPage() {
  const router = useRouter()
  const { id } = useParams()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState<any[]>([])
  const [optionTemplates, setOptionTemplates] = useState<any[]>([])

  // Memoize static data to prevent unnecessary re-renders
  const memoizedDimensions = useMemo(() => dimensions, [dimensions])
  const memoizedOptionTemplates = useMemo(() => optionTemplates, [optionTemplates])

  useEffect(() => {
    const fetchDimensions = async () => {
      const { data, error } = await supabase.from('dimensions').select('*')
      if (!error) setDimensions(data)
    }
    fetchDimensions()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('option_templates')
        .select('*')
        .eq('is_active', true)
      if (!error) setOptionTemplates(data)
    }
    fetchTemplates()
  }, [])

  useEffect(() => {
    const fetchSurvey = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          title, description, slug, is_published,
          survey_questions (
            id, question_text, question_type, options, order_index,
            dimension, dimension_code, translated_question,
            scoring_type, max_score, min_score, reverse_score,
            translated_options, template_id
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load survey')
        return
      }

      setTitle(data.title)
      setDescription(data.description)
      setSlug(data.slug || '')
      setIsPublished(data.is_published)

      const formattedQuestions = (data.survey_questions as RawSurveyQuestion[]).map((q) => ({
        id: q.id,
        question: q.question_text,
        type: q.question_type,
        options: q.options || [],
        dimension: q.dimension || '',
        dimension_code: q.dimension_code || '',
        translated_question: q.translated_question || '',
        scoring_type: q.scoring_type || '',
        max_score: q.max_score || null,
        min_score: q.min_score || null,
        reverse_score: q.reverse_score ?? false,
        translated_options: q.translated_options || [],
        template_id: q.template_id || null,
      }))

      setQuestions(formattedQuestions)
      setLoading(false)
    }

    fetchSurvey()
  }, [id])

  // Memoized handlers to prevent unnecessary re-renders
  const addQuestion = useCallback(() => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: '', type: 'text', options: [], isNew: true },
    ])
  }, [])

  const updateQuestion = useCallback((id: number | string, updated: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    )
  }, [])

  const removeQuestion = useCallback((id: number | string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const handleSubmit = useCallback(async () => {
    // Update survey metadata
    const { error: surveyError } = await supabase
      .from('surveys')
      .update({
        title,
        description,
        slug,
        is_published: isPublished,
      })
      .eq('id', id)

    if (surveyError) {
      toast.error('Failed to update survey')
      return
    }

    // Upsert and delete logic
    const existingIds = questions.filter(q => !q.isNew).map(q => q.id)
    const { data: oldQuestions } = await supabase
      .from('survey_questions')
      .select('id')
      .eq('survey_id', id)

    const oldIds = oldQuestions?.map(q => q.id) || []
    const toDelete = oldIds.filter((qid) => !existingIds.includes(qid))

    if (toDelete.length > 0) {
      await supabase.from('survey_questions').delete().in('id', toDelete)
    }

    const existing = questions.filter(q => !q.isNew)
    const newOnes = questions.filter(q => q.isNew)

    // 1. Upsert existing questions
    const upserts = existing.map((q, i) => ({
      id: q.id,
      survey_id: id,
      question_text: q.question,
      question_type: q.type,
      options: ['multiple-choice', 'radio', 'likert'].includes(q.type)
        ? Array.isArray(q.options) ? q.options : []
        : null,
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

    const { error: updateError } = await supabase
      .from('survey_questions')
      .upsert(upserts, { onConflict: 'id' })

    if (updateError) {
      console.error('❌ Update error:', updateError)
      toast.error(updateError.message)
      return
    }

    // 2. Insert new questions
    const inserts = newOnes.map((q, i) => ({
      survey_id: id,
      question_text: q.question,
      question_type: q.type,
      options: ['multiple-choice', 'radio', 'likert'].includes(q.type)
        ? Array.isArray(q.options) ? q.options : []
        : null,
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

    const { error: insertError } = await supabase
      .from('survey_questions')
      .insert(inserts)

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      toast.error(insertError.message)
      return
    }

    toast.success('Survey updated successfully!')
    router.push('/user/view-survey')
  }, [title, description, slug, isPublished, questions, id, router])

  if (loading) return <p className="p-6">Loading survey...</p>

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-6">
      {/* Left Panel */}
      <div className="lg:w-1/3 w-full space-y-6">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Edit Survey</CardTitle>
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Link</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button type="button" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} className="w-full">
          Save Changes
        </Button>
      </div>

      {/* Right Panel: Questions */}
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

// Optimized Option Editors with better state management
const RadioGroupEditor = memo(({
  question,
  onUpdate,
}: {
  question: Question
  onUpdate: (options: string[]) => void
}) => {
  const [localOptions, setLocalOptions] = useState(question.options || [])

  // Sync with parent when question.options changes from external sources (like templates)
  useEffect(() => {
    setLocalOptions(question.options || [])
  }, [question.options])

  // Debounced update to parent
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
      <Button type="button" variant="outline" onClick={addOption}>
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>
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