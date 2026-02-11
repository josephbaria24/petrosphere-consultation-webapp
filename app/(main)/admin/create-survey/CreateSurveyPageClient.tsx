'use client'

import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { Plus, Trash2, HelpCircle, Settings, FileText, Globe, List, Target, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { toast } from 'sonner'
import { supabase } from '../../../../lib/supabaseClient'
import { Switch } from '../../../../@/components/ui/switch'
import { Label } from '../../../../components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../../@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '../../../../@/components/ui/alert'
import { useApp } from '../../../../components/app/AppProvider'

type Question = {
  id: number
  question: string
  type: 'text' | 'multiple-choice' | 'radio' | 'likert'
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

// Helper for tooltips
const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help inline-block" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

// Memoized Question Accordion Item
const QuestionAccordionItem = memo(({
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
  // Memoized handlers
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

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent accordion toggle
    onRemove(question.id)
  }, [question.id, onRemove])

  return (
    <AccordionItem value={`question-${question.id}`} className="border rounded-lg mb-4 bg-card">
      <div className="flex items-center px-4">
        <AccordionTrigger className="flex-1 hover:no-underline py-4">
          <div className="flex items-center gap-3 text-left">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {index + 1}
            </span>
            <span className="font-medium truncate max-w-[200px] sm:max-w-md">
              {question.question || "(Untitled Question)"}
            </span>
            <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded">
              {question.type}
            </span>
          </div>
        </AccordionTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AccordionContent className="px-4 pb-4 pt-0">
        <div className="grid gap-6">
          {/* Main Question Info */}
          <div className="grid gap-4 p-4 border rounded-md bg-muted/30">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Question Text</Label>
                <Input
                  placeholder="e.g. How satisfied are you?"
                  value={question.question}
                  onChange={handleQuestionChange}
                />
              </div>
              <div>
                <Label className="mb-1.5 block flex items-center">
                  Question Type
                  <InfoTooltip content="Determines how the user answers this question." />
                </Label>
                <Select value={question.type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="radio">Radio Group (Single Choice)</SelectItem>
                    <SelectItem value="likert">Likert Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {['multiple-choice', 'radio', 'likert'].includes(question.type) && (
              <div>
                <Label className="mb-1.5 block flex items-center">
                  Use Option Template
                  <InfoTooltip content="Pre-fill options from a saved template." />
                </Label>
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
          </div>

          {/* Localization Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" /> Localization
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Translated Question</Label>
                <Input
                  placeholder="e.g. Gaano ka nasisiyahan?"
                  value={question.translated_question || ''}
                  onChange={handleTranslatedQuestionChange}
                />
              </div>
              <div>
                <Label className="mb-1.5 block flex items-center">
                  Translated Options
                  <InfoTooltip content="Comma-separated list matching the order of original options." />
                </Label>
                <Input
                  placeholder="e.g. Oo, Hindi, Siguro"
                  value={(question.translated_options || []).join(', ')}
                  onChange={handleTranslatedOptionsChange}
                />
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" /> Analytics & Scoring
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Dimension Category</Label>
                <Input
                  placeholder="e.g. Job Satisfaction"
                  value={question.dimension || ''}
                  onChange={handleDimensionChange}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Dimension Code</Label>
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
                <Label className="mb-1.5 block">Scoring Type</Label>
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
                    <SelectItem value="text">Text (No Score)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 h-[40px] mt-6">
                <Switch
                  id={`reverse-${question.id}`}
                  checked={question.reverse_score ?? false}
                  onCheckedChange={handleReverseScoreChange}
                />
                <Label htmlFor={`reverse-${question.id}`}>Reverse Score</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Max Score</Label>
                <Input
                  type="number"
                  value={question.max_score ?? ''}
                  onChange={handleMaxScoreChange}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Min Score</Label>
                <Input
                  type="number"
                  value={question.min_score ?? ''}
                  onChange={handleMinScoreChange}
                />
              </div>
            </div>
          </div>

          {/* Option Editors */}
          {question.type !== 'text' && (
            <div className="border-t pt-4 mt-2">
              <Label className="mb-3 block text-base">Answer Options</Label>
              {question.type === 'multiple-choice' && (
                <MultipleChoiceEditor question={question} onUpdate={handleOptionsUpdate} />
              )}
              {question.type === 'radio' && (
                <RadioGroupEditor question={question} onUpdate={handleOptionsUpdate} updateQuestion={onUpdate} />
              )}
              {question.type === 'likert' && (
                <LikertScaleEditor
                  initialScale={question.options || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']}
                  onUpdate={handleOptionsUpdate}
                />
              )}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
})

QuestionAccordionItem.displayName = 'QuestionAccordionItem'


export default function CreateSurveyPage() {
  const appData = useApp()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [targetCompany, setTargetCompany] = useState('')
  const [optionTemplates, setOptionTemplates] = useState<any[]>([])
  const [dimensions, setDimensions] = useState<any[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [, setSurveyId] = useState<string | null>(null)

  // State for accordion
  const [openItems, setOpenItems] = useState<string[]>(['basic-info'])

  // Static data memoization
  const memoizedDimensions = useMemo(() => dimensions, [dimensions])
  const memoizedOptionTemplates = useMemo(() => optionTemplates, [optionTemplates])

  // Fetch Dimensions
  useEffect(() => {
    const fetchDimensions = async () => {
      const { data, error } = await supabase.from('dimensions').select('*')
      if (error) console.error('Error loading dimensions', error)
      else setDimensions(data)
    }
    fetchDimensions()
  }, [])

  // Fetch Templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('option_templates')
        .select('*')
        .eq('is_active', true)
      if (error) console.error('Error fetching templates:', error)
      else setOptionTemplates(data)
    }
    fetchTemplates()
  }, [])

  // Handlers
  const addQuestion = useCallback(() => {
    const newId = Date.now()
    setQuestions((prev) => [
      ...prev,
      { id: newId, question: '', type: 'text', options: [] },
    ])
    // Automatically open the new question (optional)
    // setOpenItems(prev => [...prev, `question-${newId}`])
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
    // Check if org exists in appData
    if (!appData?.org?.id) {
      toast.error("Organization data not loaded. Please try reloading.")
      return
    }

    if (!title.trim()) {
      toast.error("Please enter a survey title")
      return
    }

    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert([
          {
            title,
            description,
            created_by: appData.user?.id || null,
            slug: slug || null,
            is_published: isPublished,
            target_company: targetCompany || null,
            org_id: appData.org.id,
          },
        ])
        .select()
        .single()

      if (surveyError || !survey) {
        console.error("Survey Insert Error:", surveyError?.message || surveyError)

        if (surveyError?.message?.includes('surveys_created_by_fkey')) {
          toast.error("Database Error: Authorship constraint mismatch. Please run the SQL migration provided in the implementation plan.")
        } else {
          toast.error("Failed to create survey.")
        }
        return
      }

      setSurveyId(survey.id)

      if (questions.length > 0) {
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
          toast.error("Failed to add questions (Survey was created).")
          return
        }
      }

      toast.success(`Survey created${isPublished ? ' and published' : ''}`)
      // Reset form
      setTitle("")
      setDescription("")
      setSlug("")
      setTargetCompany("")
      setQuestions([])
      setIsPublished(false)
      setSurveyId(null)
      setOpenItems(['basic-info'])

    } catch (err) {
      console.error("Unhandled Error:", err)
      toast.error("An unexpected error occurred.")
    }
  }, [title, description, slug, targetCompany, isPublished, questions, appData])


  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header & Guide */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Create New Survey</h1>
        <Alert className="bg-muted/50 border-primary/20">
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>How to create a survey</AlertTitle>
          <AlertDescription>
            Start by filling out the basic information on the left. Then, add questions on the right.
            You can use templates for common answer sets like "Likert scales".
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left Panel: Configuration (Sticky on large screens) */}
        <div className="w-full lg:w-[350px] space-y-4 lg:sticky lg:top-6">
          <Accordion
            type="multiple"
            value={openItems}
            onValueChange={setOpenItems}
            className="w-full"
          >
            {/* Basic Info Section */}
            <AccordionItem value="basic-info" className="border rounded-lg bg-card mb-4 px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Basic Information</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div>
                  <Label className="mb-1.5 block">Survey Title <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. 2025 Annual Safety Survey"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Description</Label>
                  <Textarea
                    placeholder="Brief description or purpose..."
                    className="min-h-[80px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block flex items-center">
                    Target Company
                    <InfoTooltip content="Which client company is this survey for?" />
                  </Label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Configuration Section */}
            <AccordionItem value="config" className="border rounded-lg bg-card mb-4 px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Configuration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div>
                  <Label className="mb-1.5 block flex items-center">
                    URL Slug
                    <InfoTooltip content="Custom unique identifier for the survey link." />
                  </Label>
                  <div className="flex items-center">
                    <span className="bg-muted px-3 py-2 border rounded-l-md text-sm text-muted-foreground">/survey/</span>
                    <Input
                      className="rounded-l-none"
                      placeholder="my-survey-2025"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border p-3 rounded-md">
                  <div className="space-y-0.5">
                    <Label className="text-base">Publish</Label>
                    <p className="text-xs text-muted-foreground">
                      Make visible immediately?
                    </p>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={handleSubmit} className="w-full" size="lg">
            Create Survey
          </Button>
        </div>

        {/* Right Panel: Questions Builder */}
        <div className="flex-1 w-full min-w-0">
          <Card className="border-dashed shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Survey Questions</CardTitle>
              </div>
              <Button size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                  <FileText className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No questions added yet</p>
                  <p className="text-xs">Click "Add Question" to start building your survey.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {questions.map((question, index) => (
                    <QuestionAccordionItem
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={updateQuestion}
                      onRemove={removeQuestion}
                      dimensions={memoizedDimensions}
                      optionTemplates={memoizedOptionTemplates}
                    />
                  ))}
                </Accordion>
              )}

              {questions.length > 0 && (
                <Button variant="outline" className="w-full border-dashed" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Question
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS (Editors)
// ----------------------------------------------------------------------

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
    <div className="space-y-3 bg-muted/30 p-4 rounded-md">
      {localOptions.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border border-primary/30" />
          <Input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => removeOption(i)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-2">
        <Plus className="w-3 h-3 mr-2" />
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
    <div className="space-y-3 bg-muted/30 p-4 rounded-md">
      <div className="grid gap-3 sm:grid-cols-5">
        {options.map((opt, i) => (
          <div key={i} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Point {i + 1}</Label>
            <Input
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              className="h-9 text-xs"
              placeholder={`Label ${i + 1}`}
            />
          </div>
        ))}
      </div>
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
    <div className="space-y-3 bg-muted/30 p-4 rounded-md">
      {localOptions.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-primary/30" />
          <Input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => removeOption(i)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-2">
        <Plus className="w-3 h-3 mr-2" />
        Add Option
      </Button>
    </div>
  )
})
MultipleChoiceEditor.displayName = 'MultipleChoiceEditor'
