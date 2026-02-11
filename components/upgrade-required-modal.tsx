"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Lock, Target, CheckCircle2 } from "lucide-react";

interface UpgradeRequiredModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
}

const PREMIUM_FEATURES = [
    {
        title: "Professional PDF Reporting",
        description: "High-quality automated safety reports for your organization."
    },
    {
        title: "Raw Data Export",
        description: "Download response data in CSV and Excel formats."
    },
    {
        title: "Advanced Safety Insights",
        description: "AI-powered trend analysis and risk detection."
    },
    {
        title: "Organization Management",
        description: "Manage multiple sites, departments, and teams."
    },
    {
        title: "Historical Data Access",
        description: "Full access to historical data beyond the basic limits."
    },
    {
        title: "Advanced Team Roles",
        description: "Invite unlimited team members with granular permissions."
    }
];

export function UpgradeRequiredModal({ open, onOpenChange, title = "Upgrade Required" }: UpgradeRequiredModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-none p-0 overflow-hidden rounded-[1.5rem]">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="relative p-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mx-auto rotate-3">
                        <Target className="w-7 h-7 text-primary" />
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="text-xl font-black flex items-center justify-center gap-1.5 text-foreground">
                            <Lock className="w-5 h-5 text-primary" />
                            {title}
                        </h3>
                        <p className="text-[13px] text-muted-foreground font-medium leading-tight px-4">
                            Unlock professional features and advanced safety analytics.
                        </p>
                    </div>

                    <div className="text-left bg-muted/40 p-4 rounded-xl space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            Included in Premium:
                        </p>
                        <ul className="grid grid-cols-1 gap-2">
                            {PREMIUM_FEATURES.slice(0, 4).map((feature, idx) => (
                                <li key={idx} className="flex gap-2.5 items-start">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-[12px] font-bold text-foreground/90">{feature.title}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="pt-1">
                        <Button
                            className="w-full h-11 font-black bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                            onClick={() => window.open('mailto:hello@petrosphere.com?subject=Upgrade Inquiry')}
                        >
                            Contact Sales to Upgrade
                        </Button>
                        <p className="mt-3 text-[10px] text-muted-foreground font-medium">
                            Join organizations already using SafetyVitals.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
