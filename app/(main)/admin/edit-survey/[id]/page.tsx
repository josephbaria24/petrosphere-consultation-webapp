'use client'

import { useEffect, useState } from 'react'
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
}


type RawSurveyQuestion = {
    id: string
    question_text: string
    question_type: 'text' | 'multiple-choice' | 'likert' | 'radio'
    options?: string[] | null
    order_index: number
  }
  
export default function EditSurveyPage() {

  const router = useRouter()

  const { id } = useParams()


  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSurvey = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          title, description, slug, is_published,
          survey_questions (
            id, question_text, question_type, options, order_index
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
      }))
      
      setQuestions(formattedQuestions)
      setLoading(false)
    }

    fetchSurvey()
  }, [id])

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: '', type: 'text', options: [], isNew: true },
    ])
  }

  const updateQuestion = (id: number | string, updated: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    )
  }

  const removeQuestion = (id: number | string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleSubmit = async () => {
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

        // 1. Upsert existing questions (with ID)
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
        }))
        const { error: updateError } = await supabase
        .from('survey_questions')
        .upsert(upserts, { onConflict: 'id' })

        if (updateError) {
        console.error('❌ Update error:', updateError)
        toast.error(updateError.message)
        return
        }

        // 2. Insert new questions (let Supabase assign ID)
        const inserts = newOnes.map((q, i) => ({
        survey_id: id,
        question_text: q.question,
        question_type: q.type,
        options: ['multiple-choice', 'radio', 'likert'].includes(q.type)
            ? Array.isArray(q.options) ? q.options : []
            : null,
        order_index: existing.length + i,
        is_required: false,
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
            router.push('/admin/view-survey')
        }

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
                <Label>Text</Label>
                <Input
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(q.id, { question: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
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
