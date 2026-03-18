"use client";

import { useApp } from "./app/AppProvider";
import { Clock, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { UpgradeRequiredModal } from "./upgrade-required-modal";

export function TrialBanner() {
    const { subscription } = useApp();
    const [upgradeOpen, setUpgradeOpen] = useState(false);

    if (!subscription) return null;

    const { status, trial_ends_at } = subscription;

    // Only show for trialing or recently expired (canceled) demo users
    const isTrialing = status === "trialing";
    const isExpired = status === "canceled";

    if (!isTrialing && !isExpired) return null;

    // Calculate days remaining
    let daysLeft = 0;
    if (isTrialing && trial_ends_at) {
        const endDate = new Date(trial_ends_at);
        const now = new Date();
        daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    if (isExpired) {
        return (
            <>
                <UpgradeRequiredModal open={upgradeOpen} onOpenChange={setUpgradeOpen} title="Trial Ended" />
                <div className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-sm z-50">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>Your 14-day Pro trial has ended.</span>
                    <button
                        onClick={() => setUpgradeOpen(true)}
                        className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors"
                    >
                        Upgrade to Pro <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </>
        );
    }

    // Trialing
    return (
        <>
            <UpgradeRequiredModal open={upgradeOpen} onOpenChange={setUpgradeOpen} title="Upgrade to Pro" />
            <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-sm z-50">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>
                    <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your Pro trial
                </span>
                <button
                    onClick={() => setUpgradeOpen(true)}
                    className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors"
                >
                    Upgrade Now <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </>
    );
}
