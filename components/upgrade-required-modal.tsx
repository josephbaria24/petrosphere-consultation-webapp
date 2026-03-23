"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Lock, Target, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useApp } from "./app/AppProvider";
import { toast } from "sonner";
import { TrialActivationModal } from "./TrialActivationModal";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";

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
    const { user, subscription } = useApp();
    const [isSending, setIsSending] = useState(false);
    const [trialOpen, setTrialOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleContactSales = async () => {
        setIsSending(true);
        try {
            const response = await fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: "sales@petrosphere.com.ph",
                    subject: "Upgrade Inquiry - Safety Vitals",
                    html: `
                        <h1>Upgrade Inquiry</h1>
                        <p>User <strong>${user?.email}</strong> is interested in upgrading.</p>
                        <p>Please contact them.</p>
                    `,
                    text: `Upgrade Inquiry from user ${user?.email}`
                })
            });

            if (response.ok) {
                toast.success("Inquiry sent! Our sales team will contact you.");
                onOpenChange(false);
            } else {
                toast.error("Failed to send inquiry.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        } finally {
            setIsSending(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
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
                                onClick={() => setShowConfirm(true)}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </div>
                                ) : (
                                    "Contact Sales to Upgrade"
                                )}
                            </Button>
                            <p className="mt-2 text-[10px] text-muted-foreground font-medium italic">
                                * This will send an inquiry to our sales team.
                            </p>
                            
                            {subscription?.plan === "basic" && subscription?.status === "active" && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        Or try it first:
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 font-black border-2 border-indigo-600/20 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                        onClick={() => {
                                            onOpenChange(false);
                                            setTrialOpen(true);
                                        }}
                                    >
                                        <Zap className="w-4 h-4 fill-current" />
                                        Start 14-day Free Trial
                                    </Button>
                                </div>
                            )}
                            <p className="mt-3 text-[10px] text-muted-foreground font-medium">
                                Join organizations already using SafetyVitals.
                            </p>
                        </div>
                    </div>
                </DialogContent>
                <TrialActivationModal 
                    open={trialOpen} 
                    onOpenChange={setTrialOpen} 
                />
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send Upgrade Inquiry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to send an upgrade inquiry to our sales team? They will contact you at <strong>{user?.email}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleContactSales}
                            className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold"
                        >
                            Yes, Send Inquiry
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
