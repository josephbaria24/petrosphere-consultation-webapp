"use client";

import React, { memo } from "react";
import { Badge } from "../../@/components/ui/badge";
import { Button } from "../ui/button";
import {
  Building,
  Calendar,
  ChevronDown,
  Pencil,
  Trash2,
} from "@/components/icons";

export type AnswerWithDimension = {
  question: string;
  answer: string;
  dimension: string;
  question_type?: string;
};

export type ResponseGroup = {
  user_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    department: string;
    site: string;
  } | null;
  metadata: {
    department: string;
    site: string;
    role: string;
    created_at: string;
    org_name?: string;
    org_id?: string | null;
  };
  answers: AnswerWithDimension[];
  answersByDimension: { dimension: string; answers: AnswerWithDimension[] }[];
};

export function groupAnswersByDimension(answers: AnswerWithDimension[]) {
  const map = new Map<string, AnswerWithDimension[]>();
  for (const a of answers) {
    const dim = a.dimension || "Uncategorized";
    const list = map.get(dim);
    if (list) list.push(a);
    else map.set(dim, [a]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dimension, dimAnswers]) => ({
      dimension,
      answers: dimAnswers,
    }));
}

const getBadgeColor = (answer: string) => {
  const lower = answer.toLowerCase();
  if (lower.includes("strongly disagree") || lower.startsWith("1"))
    return "bg-destructive/90 text-destructive-foreground hover:bg-destructive";
  if (lower.includes("disagree") || lower.startsWith("2"))
    return "bg-orange-500 text-white hover:bg-orange-600";
  if (
    lower.includes("undecided") ||
    lower.includes("neutral") ||
    lower.startsWith("3")
  )
    return "bg-yellow-500 text-white hover:bg-yellow-600";
  if (lower.includes("agree") || lower.startsWith("4"))
    return "bg-blue-500 text-white hover:bg-blue-600";
  if (lower.includes("strongly agree") || lower.startsWith("5"))
    return "bg-emerald-500 text-white hover:bg-emerald-600";
  return "bg-secondary text-secondary-foreground";
};

type RespondentRowProps = {
  group: ResponseGroup;
  isOpen: boolean;
  isPlatformAdmin: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
  measureRef?: (node: HTMLElement | null) => void;
};

export const RespondentRow = memo(function RespondentRow({
  group,
  isOpen,
  isPlatformAdmin,
  onToggle,
  onEdit,
  onDelete,
  style,
  measureRef,
}: RespondentRowProps) {
  const canMutate = group.user_id !== "anonymous";
  const displayName = group.user
    ? `${group.user.first_name} ${group.user.last_name}`
    : "Unknown Respondent";
  const initial = group.user?.first_name?.[0] || "U";

  return (
    <div ref={measureRef} style={style} className="pb-3">
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 pr-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex flex-1 items-center gap-3 px-4 py-3 md:px-6 text-left hover:bg-muted/30 transition-colors min-w-0"
            aria-expanded={isOpen}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {initial}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {group.user?.email || "No email provided"}
                  </div>
                  <div
                    className="flex items-center text-xs text-muted-foreground"
                    title={new Date(group.metadata.created_at).toLocaleString()}
                  >
                    <Calendar className="h-3 w-3 mr-1 shrink-0" />
                    {new Date(group.metadata.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[58%] shrink-0">
                {isPlatformAdmin && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-blue-500/30 bg-blue-500/5"
                  >
                    ADMIN CONTEXT
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="font-normal text-xs bg-muted/50"
                >
                  {group.metadata.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-normal text-xs bg-muted/50"
                >
                  {group.metadata.department}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-normal text-xs bg-muted/50"
                >
                  {group.metadata.site}
                </Badge>
                {isPlatformAdmin && (
                  <Badge
                    variant="secondary"
                    className="font-semibold text-xs flex items-center gap-1"
                  >
                    <Building className="h-3 w-3" />
                    {group.metadata.org_name}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {canMutate && (
            <div className="flex items-center shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Edit respondent info"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete this respondent's answers"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="border-t bg-muted/10 p-4 md:p-6 space-y-6">
            {group.answersByDimension.length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : (
              group.answersByDimension.map(({ dimension, answers }) => (
                <div key={dimension} className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {dimension}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {answers.map((ans, j) => (
                      <div
                        key={`${dimension}-${j}`}
                        className="bg-background border rounded-lg p-3 text-sm shadow-sm"
                      >
                        <p className="font-medium text-foreground mb-2 leading-snug">
                          {ans.question}
                        </p>
                        <Badge
                          className={`font-medium ${getBadgeColor(ans.answer)}`}
                        >
                          {ans.answer}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});
