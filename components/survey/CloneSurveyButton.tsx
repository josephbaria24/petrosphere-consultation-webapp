"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2 } from "@/components/icons";
import { getClientCookie } from "../../lib/cookies-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type Props = {
  surveyId: string;
  surveyTitle: string;
  destOrgId?: string | null;
  onCloned?: (result: { surveyId: string; title: string }) => void;
};

function defaultCloneTitle(title: string) {
  const base = (title || "Survey").trim();
  if (/\(copy\)\s*$/i.test(base)) return base;
  return `${base} (copy)`;
}

export function CloneSurveyButton({
  surveyId,
  surveyTitle,
  destOrgId,
  onCloned,
}: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultCloneTitle(surveyTitle));
  const [cloning, setCloning] = useState(false);

  const handleOpen = (next: boolean) => {
    if (next) setTitle(defaultCloneTitle(surveyTitle));
    setOpen(next);
  };

  const handleClone = async () => {
    if (!title.trim()) {
      toast.error("Enter a title for the cloned survey");
      return;
    }
    setCloning(true);
    try {
      const adminId = getClientCookie("admin_id");
      const resp = await fetch("/api/surveys/clone", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(adminId ? { "x-admin-id": adminId } : {}),
        },
        body: JSON.stringify({
          surveyId,
          title: title.trim(),
          destOrgId: destOrgId || undefined,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Failed to clone survey");
      toast.success(
        `Cloned as “${data.title}” with ${data.questionCount} question(s). Answers were not copied.`
      );
      setOpen(false);
      onCloned?.({ surveyId: data.surveyId, title: data.title });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clone survey");
    } finally {
      setCloning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-2 flex-1 md:flex-none border-dashed"
        onClick={() => handleOpen(true)}
      >
        <Copy className="h-4 w-4 text-sky-600" />
        Clone
      </Button>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone survey</DialogTitle>
            <DialogDescription>
              Creates a new unpublished copy of the questions, dimensions, and
              polarity. Existing answers stay on the original survey.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`clone-title-${surveyId}`}>New survey title</Label>
            <Input
              id={`clone-title-${surveyId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={cloning}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpen(false)}
              disabled={cloning}
            >
              Cancel
            </Button>
            <Button type="button" className="gap-2" onClick={() => void handleClone()} disabled={cloning}>
              {cloning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cloning…
                </>
              ) : (
                "Clone survey"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
