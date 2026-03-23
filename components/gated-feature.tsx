"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Lock, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { UpgradeRequiredModal } from "./upgrade-required-modal";
import { TrialActivationModal } from "./TrialActivationModal";
import { useApp } from "./app/AppProvider";

interface GatedFeatureProps {
    isRestricted: boolean;
    children: React.ReactNode;
    featureName?: string;
}

export function GatedFeature({
    isRestricted,
    children,
    featureName = "Premium Analytics",
}: GatedFeatureProps) {
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [trialOpen, setTrialOpen] = useState(false);
    const { subscription } = useApp();

    if (!isRestricted) return <>{children}</>;

    const isEligibleForTrial = subscription?.plan === "basic" && subscription?.status === "active";

    return (
        <div className="relative w-full min-h-[50vh] flex flex-col items-center justify-center overflow-hidden rounded-3xl">
            <UpgradeRequiredModal
                open={upgradeOpen}
                onOpenChange={setUpgradeOpen}
                title={`${featureName} Restricted`}
            />
            <TrialActivationModal 
                open={trialOpen} 
                onOpenChange={setTrialOpen} 
            />

            {/* Overlay */}
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/40 backdrop-blur-[8px]">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-border/50 text-center space-y-6 animate-in fade-in zoom-in duration-500 relative overflow-hidden group">
                    {/* Background Accents */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700" />
                    
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20 rotate-3 group-hover:rotate-6 transition-transform relative z-10">
                        <Lock className="w-8 h-8 text-white" />
                    </div>

                    <div className="space-y-2 relative z-10">
                        <h3 className="text-2xl font-black text-foreground">{featureName}</h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                            Transform your workspace with {featureName} and advanced professional tools.
                        </p>
                    </div>

                    <div className="pt-2 space-y-3 relative z-10">
                        {isEligibleForTrial ? (
                            <>
                                <Button
                                    className="w-full h-12 font-black text-base bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                    onClick={() => setTrialOpen(true)}
                                >
                                    <Zap className="w-4 h-4 fill-current animate-pulse" />
                                    Start 14-day Free Trial
                                </Button>
                                <button 
                                    onClick={() => setUpgradeOpen(true)}
                                    className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Or Contact Sales to Upgrade
                                </button>
                            </>
                        ) : (
                            <Button
                                className="w-full h-12 font-black text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => setUpgradeOpen(true)}
                            >
                                Upgrade to Access
                            </Button>
                        )}
                    </div>
                    
                    {isEligibleForTrial && (
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                            <ShieldCheck className="w-3.5 h-3.5" /> No credit card required
                        </div>
                    )}
                </div>
            </div>

            {/* Gated Content (Blurred) */}
            <div className="opacity-30 pointer-events-none select-none filter blur-xl transition-all duration-700 w-full scale-[1.02]">
                {children}
            </div>
        </div>
    );
}
