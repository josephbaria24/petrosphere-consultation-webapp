"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, Sparkles, Loader2, Calendar, ShieldCheck, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "./app/AppProvider";
import { format } from "date-fns";

interface TrialActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}

export function TrialActivationModal({ open, onOpenChange, onActivated }: TrialActivationModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const { refresh } = useApp();

  const handleActivate = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/subscription/activate-trial", {
        method: "POST",
      });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || "Failed to activate trial");

      setExpiryDate(data.trial_ends_at);
      setSuccess(true);
      await refresh();
      if (onActivated) onActivated();
      toast.success("Pro trial activated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Full access to Respondents & Dimensions",
    "Advanced Survey Analytics & AI Insights",
    "Task Management & Compliance Checklist",
    "Export reports to PDF & Excel",
    "Unlimited Surveys & Questions",
  ];

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-white dark:bg-zinc-950">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
             <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-in zoom-in-95 duration-500">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                   <h3 className="text-2xl font-bold">Your Pro trial is now active!</h3>
                   <p className="text-white/80 font-medium">Welcome to the professional tier.</p>
                </div>
             </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-start gap-4">
               <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-1" />
               <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 leading-none">Trial Period</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    You have full access until <span className="font-bold underline">{expiryDate ? format(new Date(expiryDate), "PPPP") : "14 days"}</span>.
                  </p>
               </div>
            </div>
            
            <p className="text-sm text-center text-muted-foreground font-medium italic">
                You can now access all Pro features immediately. Enjoy!
            </p>

            <Button 
                onClick={() => onOpenChange(false)} 
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Explore Pro Features
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-zinc-950">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)]" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full w-fit text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/20">
                    <Sparkles className="w-3 h-3" /> Professional Tier
                </div>
                <DialogTitle className="text-3xl font-black leading-tight tracking-tight text-white mb-1">
                    Start your free 14-day Pro trial
                </DialogTitle>
                <DialogDescription className="text-white/80 font-medium text-base">
                    Get full access to premium survey analytics, exports, investigations, and task management.
                </DialogDescription>
            </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">What's included in Pro:</h4>
            <div className="grid gap-3">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">{feature}</span>
                    </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/50">
                      <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Instant Start</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/50">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Zero Billing Risk</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/50">
                      <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Auto Ends</span>
              </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-12 order-2 sm:order-1 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl px-6"
            >
              Maybe later
            </Button>
            <Button
              onClick={handleActivate}
              disabled={loading}
              className="h-12 order-1 sm:order-2 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Activating...
                </>
              ) : (
                "Start Free Trial"
              )}
            </Button>
          </DialogFooter>
          
          <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest pt-2">
            No credit card required · Trial ends automatically · Upgrade anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
