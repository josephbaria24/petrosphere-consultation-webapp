"use client";

import { useApp } from "./app/AppProvider";
import { Clock, Sparkles, ArrowRight, ShieldCheck, ChevronRight, Zap } from "lucide-react";
import { useState } from "react";
import { UpgradeRequiredModal } from "./upgrade-required-modal";
import { TrialActivationModal } from "./TrialActivationModal";

export function TrialBanner() {
    const { subscription, limits } = useApp();
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [activationOpen, setActivationOpen] = useState(false);

    if (!subscription) return null;

    const { plan, status, trial_ends_at } = subscription;

    // States:
    // 1. Recruitment (Basic plan, no active/expired trial)
    // 2. Trialing (Pro trial currently active)
    // 3. Expired (Trial ended, back on basic)
    const isBasic = plan === "basic" && status === "active";
    const isTrialing = status === "trialing";
    const isExpired = status === "canceled"; // or expired logic

    // Calculate days remaining
    let daysLeft = 0;
    if (isTrialing && trial_ends_at) {
        const endDate = new Date(trial_ends_at);
        const now = new Date();
        daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // 1. Recruitment Banner (High Visibility)
    if (isBasic) {
        return (
            <>
                <TrialActivationModal 
                    open={activationOpen} 
                    onOpenChange={setActivationOpen} 
                />
                <div className="w-full bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-700 text-white relative overflow-hidden group">
                    {/* Background Accent */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                    
                    <div className="max-w-[1600px] mx-auto px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5 text-center md:text-left">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-inner hidden md:block">
                                <Sparkles className="w-5 h-5 text-amber-300" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-base md:text-lg font-black tracking-tight leading-tight">
                                    Start your free 14-day Pro trial
                                </h3>
                                <p className="text-sm text-indigo-100 font-medium">
                                    Unlock full survey analytics, respondents, tasks, and exports — <span className="text-white font-bold">no credit card required.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 shrink-0">
                            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold text-white/60 uppercase tracking-widest mr-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Trial ends automatically
                            </div>
                            <button
                                onClick={() => setActivationOpen(true)}
                                className="bg-white text-indigo-600 hover:bg-indigo-50 px-5 py-2 rounded-xl text-sm font-black shadow-lg shadow-black/10 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2"
                            >
                                Start Free Trial <Zap className="w-4 h-4 fill-indigo-600" />
                            </button>
                            <button
                                onClick={() => setActivationOpen(true)}
                                className="text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1"
                            >
                                See what's included <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 2. Trial Active Banner
    if (isTrialing) {
        return (
            <>
                <UpgradeRequiredModal open={upgradeOpen} onOpenChange={setUpgradeOpen} title="Upgrade to Pro" />
                <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-6 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-bold shadow-md z-40">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full border border-white/20 backdrop-blur-sm">
                        <Clock className="w-4 h-4 text-emerald-100" />
                        <span><strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your Pro trial</span>
                    </div>
                    <span className="hidden md:inline text-emerald-50 text-xs font-medium opacity-90">
                        Explore exports, respondents, dimensions, and tasks while active.
                    </span>
                    <button
                        onClick={() => setUpgradeOpen(true)}
                        className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-1.5 rounded-lg text-xs font-black shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    >
                        Upgrade to Pro <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </>
        );
    }

    // 3. Trial Expired Banner
    if (isExpired) {
        return (
            <>
                <UpgradeRequiredModal open={upgradeOpen} onOpenChange={setUpgradeOpen} title="Trial Ended" />
                <div className="w-full bg-slate-900 border-b border-slate-800 text-white px-6 py-3 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-bold shadow-lg z-40">
                    <div className="flex items-center gap-2 text-rose-400">
                        <Clock className="w-5 h-5" />
                        <span>Your Pro trial has ended</span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium max-w-md text-center sm:text-left leading-tight">
                        Your data is still here, but Pro features are now locked. Upgrade anytime to continue using advanced tools.
                    </p>
                    <button
                        onClick={() => setUpgradeOpen(true)}
                        className="bg-primary text-white hover:bg-primary/90 px-5 py-2 rounded-xl text-xs font-black shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        Upgrade to Pro <Zap className="w-3.5 h-3.5 fill-current" />
                    </button>
                </div>
            </>
        );
    }

    return null;
}
