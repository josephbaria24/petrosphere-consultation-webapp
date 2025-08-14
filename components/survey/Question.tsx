// components/survey/Question.tsx
"use client";

import { memo } from "react";
import { RadioGroup, RadioGroupItem } from "../../@/components/ui/radio-group";
import { Label } from "../../@/components/ui/label";
import { Textarea } from "../ui/textarea";
import { StyledRadioItem } from "../ui/StyledRadioItem";


type QuestionProps = {
  q: {
    id: string;
    question_text: string;
    translated_question?: string;
    question_type: string;
    options: string[] | null;
  };
  value: string;
  onChange: (id: string, value: string) => void;
  useFilipino: boolean;
};

const Question = memo(function Question({ q, value, onChange, useFilipino }: QuestionProps) {
  const labelText = useFilipino
    ? q.translated_question || q.question_text
    : q.question_text;

  return (
    <div>
      <Label className="block mb-1 font-medium text-sm">{labelText}</Label>

      {(q.question_type === "multiple-choice" || q.question_type === "radio") && q.options && (
        <RadioGroup value={value} onValueChange={(val) => onChange(q.id, val)}>
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <StyledRadioItem value={opt} id={`${q.id}-${i}`} />

              <Label htmlFor={`${q.id}-${i}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {q.question_type === "likert" && q.options && (
        <RadioGroup
          value={value}
          onValueChange={(val) => onChange(q.id, val)}
          className="flex flex-wrap gap-3"
        >
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <StyledRadioItem value={opt} id={`${q.id}-likert-${i}`} />

              <Label htmlFor={`${q.id}-likert-${i}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {q.question_type === "text" && (
        <Textarea
          placeholder="Your answer..."
          value={value}
          onChange={(e) => onChange(q.id, e.target.value)}
        />
      )}
    </div>
  );
});

export default Question;
