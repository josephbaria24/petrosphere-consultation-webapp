"use client";

import { memo } from "react";
import { Label } from "../../@/components/ui/label";
import { Textarea } from "../ui/textarea";

type QuestionProps = {
  q: {
    id: string;
    question_text: string;
    translated_question?: string;
    question_type: string;
    options: string[] | null;
    translated_options?: string[] | null;
  };
  value: string;
  onChange: (id: string, value: string) => void;
  useFilipino: boolean;
};

const Question = memo(function Question({
  q,
  value,
  onChange,
  useFilipino,
}: QuestionProps) {
  const labelText = useFilipino
    ? q.translated_question || q.question_text
    : q.question_text;

  const options =
    useFilipino &&
    q.translated_options &&
    q.translated_options.length === q.options?.length
      ? q.translated_options
      : q.options;

  const isChoice =
    q.question_type === "multiple-choice" ||
    q.question_type === "radio" ||
    q.question_type === "likert";

  return (
    <div id={`question-${q.id}`} className="py-1">
      <Label className="block mb-2 text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
        {labelText}
      </Label>

      {isChoice && options && (
        <fieldset className="space-y-1.5 border-0 p-0 m-0">
          <legend className="sr-only">{labelText}</legend>
          {options.map((opt, i) => {
            const inputId = `${q.id}-opt-${i}`;
            const checked = value === opt;
            return (
              <label
                key={inputId}
                htmlFor={inputId}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  checked
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/60"
                }`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={checked}
                  onChange={() => onChange(q.id, opt)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm leading-snug">{opt}</span>
              </label>
            );
          })}
        </fieldset>
      )}

      {q.question_type === "text" && (
        <Textarea
          placeholder="Your answer..."
          defaultValue={value}
          onBlur={(e) => onChange(q.id, e.target.value)}
        />
      )}
    </div>
  );
}, areEqual);

function areEqual(prev: QuestionProps, next: QuestionProps) {
  return (
    prev.q.id === next.q.id &&
    prev.value === next.value &&
    prev.useFilipino === next.useFilipino &&
    prev.onChange === next.onChange &&
    prev.q.question_text === next.q.question_text &&
    prev.q.translated_question === next.q.translated_question
  );
}

export default Question;
