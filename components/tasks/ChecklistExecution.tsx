"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Check, X, Camera, UploadCloud, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "../ui/progress";
import CameraCapture from "./CameraCapture";

interface ChecklistExecutionProps {
  session: any;
  template: any;
  onFinish: () => void;
  onCancel: () => void;
}

export default function ChecklistExecution({ session, template, onFinish, onCancel }: ChecklistExecutionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // State for current response
  const [answer, setAnswer] = useState<"yes"|"no"|"n_a" | null>(null);
  const [notes, setNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, [session.checklist_id]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", session.checklist_id)
      .order("order_index", { ascending: true });
      
    if (error) {
      toast.error("Failed to load checklist items.");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const currentItem = items[currentIndex];
  const progressPercent = items.length ? (currentIndex / items.length) * 100 : 0;

  const handleNext = async () => {
    if (!answer) {
      toast.error("Please select Yes or No.");
      return;
    }

    if (answer === "no" && currentItem.requires_media_on_no && !evidenceFile) {
      toast.error("Media evidence is required for a 'No' answer on this item.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save Response
      const { data: responseData, error: responseErr } = await supabase
        .from("task_responses")
        .insert({
          session_id: session.id,
          item_id: currentItem.id,
          answer,
          notes
        })
        .select()
        .single();

      if (responseErr) throw responseErr;

      // 2. Upload Evidence if present
      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        
        const uploadRes = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Upload failed");
        }

        const { url, fileName } = await uploadRes.json();

        // 3. Save evidence record
        const { error: evidenceErr } = await supabase
          .from("task_evidence")
          .insert({
            response_id: responseData.id,
            file_url: url,
            file_name: fileName,
            file_type: evidenceFile.type
          });

        if (evidenceErr) throw evidenceErr;
      }

      // 4. Move to next or finish
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
        resetState();
      } else {
        // Complete session
        await supabase
          .from("task_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        
        onFinish();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error saving response: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setAnswer(null);
    setNotes("");
    setEvidenceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) return <div className="p-8 text-center">Loading checklist...</div>;
  if (!items.length) return <div className="p-8 text-center">No items in this checklist.</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 dark:bg-background max-w-3xl mx-auto w-full p-4 md:p-8">
      
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onCancel} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Cancel Task
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentIndex + 1} of {items.length}
        </span>
      </div>

      <Progress value={progressPercent} className="h-2 mb-8" />

      <Card className="w-full shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-2xl md:text-3xl font-semibold leading-relaxed">
            {currentItem.text}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-8 px-6 md:px-12">
          {/* Answer Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={answer === "yes" ? "default" : "outline"}
              className={`h-24 text-xl md:text-2xl font-bold transition-all ${
                answer === "yes" ? "bg-green-600 hover:bg-green-700 text-white border-green-600 ring-4 ring-green-600/20" : "hover:border-green-600 hover:text-green-600"
              }`}
              onClick={() => {
                setAnswer("yes");
                setEvidenceFile(null); // Clear evidence since Yes doesn't require it
              }}
            >
              <Check className="w-8 h-8 mr-2" />
              Yes
            </Button>
            <Button
              variant={answer === "no" ? "default" : "outline"}
              className={`h-24 text-xl md:text-2xl font-bold transition-all ${
                answer === "no" ? "bg-red-600 hover:bg-red-700 text-white border-red-600 ring-4 ring-red-600/20" : "hover:border-red-600 hover:text-red-600"
              }`}
              onClick={() => setAnswer("no")}
            >
              <X className="w-8 h-8 mr-2" />
              No
            </Button>
          </div>

          {/* Conditional Media Upload for "No" */}
          {answer === "no" && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-4">
              <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                <h4 className="flex items-center text-red-800 dark:text-red-400 font-semibold mb-4 gap-2">
                  <Camera className="w-5 h-5" />
                  {currentItem.requires_media_on_no ? "Media Evidence Required" : "Optional Media Evidence"}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-16 border-red-200 dark:border-red-900/50 bg-white dark:bg-black/20 gap-2 font-semibold text-red-700 dark:text-red-400 hover:bg-red-50"
                    onClick={() => setIsCameraOpen(true)}
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="h-16 border-red-200 dark:border-red-900/50 bg-white dark:bg-black/20 gap-2 font-semibold text-gray-700 dark:text-gray-400 hover:bg-red-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="w-5 h-5" />
                    Upload File
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                
                {evidenceFile && (
                  <div className="mt-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-green-200 dark:border-green-900/50 flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium truncate flex-1">
                      ✓ {evidenceFile.name}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                      onClick={() => setEvidenceFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {isCameraOpen && (
                <CameraCapture
                  onCapture={(file) => {
                    setEvidenceFile(file);
                    setIsCameraOpen(false);
                  }}
                  onCancel={() => setIsCameraOpen(false)}
                />
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  placeholder="Describe the issue observed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          {/* Notes for Yes */}
          {answer === "yes" && (
            <div className="animate-in fade-in space-y-2">
               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes (Optional)
                </label>
                <Textarea
                  placeholder="Any general observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
            </div>
          )}
        </CardContent>

        <CardFooter className="px-6 pb-8 md:px-12">
          <Button 
            className="w-full py-6 text-lg font-bold gap-2" 
            size="lg"
            onClick={handleNext}
            disabled={!answer || isSubmitting}
          >
            {isSubmitting ? "Saving..." : currentIndex === items.length - 1 ? "Complete Inspection" : "Next Item"}
            {!isSubmitting && <ArrowRight className="w-5 h-5" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
