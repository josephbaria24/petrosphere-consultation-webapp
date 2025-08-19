'use client'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select"
import { Switch } from "@radix-ui/react-switch"
import { Plus, Trash2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "../../../../../@/components/ui/card"
import { Button } from "../../../../../components/ui/button"
import { Input } from "../../../../../components/ui/input"
import { useCallback, useEffect, useState } from "react"
import { Label } from "../../../../../components/ui/label"
import React from "react"



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

interface QuestionCardProps {
    index: number
    question: Question
    dimensions: any[]
    optionTemplates: any[]
    onUpdateImmediate: (id: number | string, update: Partial<Question>) => void
    onUpdateDebounced: (id: number | string, update: Partial<Question>) => void
    onRemove: (id: number | string) => void
  }

function QuestionCard({
  index,
  question: q,
  dimensions,
  optionTemplates,
    onUpdateImmediate,
    onUpdateDebounced,
  onRemove,
}: QuestionCardProps) {


    const handleTextChange = useCallback(
        (field: keyof Question, value: string | number | boolean) => {
          onUpdateDebounced(q.id, { [field]: value })
        },
        [q.id, onUpdateDebounced]
      )

      
      
  return (
    <Card className="relative mb-4">
      <CardHeader>
        <CardTitle>Question {index + 1}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-red-500"
          onClick={() => onRemove(q.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Question Text</Label>
          <Input
    value={q.question}
    onChange={(e) => handleTextChange('question', e.target.value)}
    />
        </div>

        <div>
          <Label>Translated Question</Label>
          <Input
            value={q.translated_question || ''}
            onChange={(e) =>
                onUpdateDebounced(q.id, { translated_question: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Question Type</Label>
          <Select
            value={q.type}
            onValueChange={(value: any) =>
                onUpdateDebounced(q.id, { type: value })
            }
          >
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

        {['multiple-choice', 'radio', 'likert'].includes(q.type) && (
          <div>
            <Label>Use Option Template</Label>
            <Select
              onValueChange={(templateId) => {
                const selected = optionTemplates.find((t) => t.id === templateId)
                if (selected) {
                    onUpdateDebounced(q.id, {
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

        <div>
          <Label>Dimension</Label>
          <Input
            value={q.dimension || ''}
            onChange={(e) => onUpdateDebounced(q.id, { dimension: e.target.value })}
          />
        </div>

        <div>
          <Label>Dimension Code</Label>
          <Select
            value={q.dimension_code || ''}
            onValueChange={(code) => {
              const matched = dimensions.find((d) => d.code === code)
              onUpdateDebounced(q.id, {
                dimension_code: matched?.code,
                dimension: matched?.dimension_name || '',
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
            onValueChange={(val) =>
                onUpdateImmediate(q.id, { scoring_type: val })
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
              onChange={(e) =>
                onUpdateImmediate(q.id, { max_score: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Min Score</Label>
            <Input
              type="number"
              value={q.min_score ?? ''}
              onChange={(e) =>
                onUpdateImmediate(q.id, { min_score: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id={`reverse-${q.id}`}
            checked={q.reverse_score ?? false}
            onCheckedChange={(checked) =>
                onUpdateImmediate(q.id, { reverse_score: checked })
            }
          />
          <Label htmlFor={`reverse-${q.id}`}>Reverse Score</Label>
        </div>

        <div>
          <Label>Translated Options (comma-separated)</Label>
          <Input
            value={(q.translated_options || []).join(', ')}
            onChange={(e) =>
                onUpdateImmediate(q.id, {
                translated_options: e.target.value
                  .split(',')
                  .map((opt) => opt.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        {q.type === 'multiple-choice' && (
          <MultipleChoiceEditor
            question={q}
            onUpdate={(opts) => onUpdateDebounced(q.id, { options: opts })}
          />
        )}
        {q.type === 'radio' && (
          <RadioGroupEditor
            question={q}
            onUpdate={(opts) => onUpdateDebounced(q.id, { options: opts })}
          />
        )}
        {q.type === 'likert' && (
          <LikertScaleEditor
            onUpdate={(opts) => onUpdateDebounced(q.id, { options: opts })}
            initialScale={
              q.options || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
            }
          />
        )}
      </CardContent>
    </Card>
  )
  function RadioGroupEditor({
    question,
    onUpdate,
  }: {
    question: Question
    onUpdate: (options: string[]) => void
  }) {
    const [options, setOptions] = useState(question.options || [])
   // ✅ Sync local state when parent question.options changes
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
}
// 👇 Add this at the bottom of the file:
function areEqual(prev: QuestionCardProps, next: QuestionCardProps) {
    return (
      prev.question.id === next.question.id &&
      JSON.stringify(prev.question) === JSON.stringify(next.question) &&
      prev.index === next.index
    )
  }

  export default React.memo(QuestionCard, areEqual)