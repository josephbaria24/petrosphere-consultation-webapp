"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "./app/AppProvider";
import { Button } from "./ui/button";
import { X, ChevronRight, ChevronLeft, Info, Sparkles, Copy, BarChart3, ArrowRight, Folder } from "lucide-react";
import { cn } from "../lib/utils";
import { usePathname, useRouter } from "next/navigation";

interface Step {
    id: string;
    targetId: string;
    title: string;
    content: string;
    icon: React.ReactNode;
    position: "top" | "bottom" | "left" | "right";
    path?: string; // Optional path to redirect if target is not on current page
}

export function OnboardingTour() {
    const { hasCompletedTour, markTourAsCompleted, currentStep, setCurrentStep } = useApp();
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    const steps: Step[] = useMemo(() => [
        {
            id: "dashboard-nav",
            targetId: "tour-sidebar-dashboard",
            title: "Navigation Hub",
            content: "Welcome to your command center! Here you can easily move between your dashboard and survey tools.",
            icon: <Info className="w-5 h-5 text-primary" />,
            position: "right",
            path: "/dashboard"
        },
        {
            id: "summary-stats",
            targetId: "tour-summary-card",
            title: "Pulse Check",
            content: "This card gives you an instant overview of your organization's average score and respondent count.",
            icon: <Sparkles className="w-5 h-5 text-amber-500" />,
            position: "bottom",
            path: "/dashboard"
        },
        {
            id: "charts-overview",
            targetId: "tour-overview-charts",
            title: "Visual Insights",
            content: "Interact with these charts to deep dive into your safety culture data across different dimensions.",
            icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
            position: "top",
            path: "/dashboard"
        },
        {
            id: "view-survey-nav",
            targetId: "tour-sidebar-view-survey",
            title: "Manage Surveys",
            content: "Click here to view your active surveys and find your participation links.",
            icon: <Folder className="w-5 h-5 text-primary" />,
            position: "right",
            path: "/dashboard"
        },
        {
            id: "safety-vitals-card",
            targetId: "tour-survey-card-safety-vitals",
            title: "Global Standards",
            content: "The Safety Vitals survey is our gold standard. It lets you benchmark your culture against global industry data.",
            icon: <Info className="w-5 h-5 text-primary" />,
            position: "bottom",
            path: "/user/view-survey"
        },
        {
            id: "copy-link",
            targetId: "tour-copy-link-button",
            title: "Spread the Word",
            content: "Click this button to copy your unique survey link. Share it with your team to start collecting data!",
            icon: <Copy className="w-5 h-5 text-emerald-500" />,
            position: "top",
            path: "/user/view-survey"
        },
        {
            id: "results-reflected",
            targetId: "tour-sidebar-dashboard",
            title: "Real-time Magic",
            content: "Once responses are submitted, they move here instantly! All your dashboard metrics will update in real-time.",
            icon: <ArrowRight className="w-5 h-5 text-primary" />,
            position: "right",
            path: "/dashboard"
        }
    ], []);

    const updateTargetRect = useCallback(() => {
        const step = steps[currentStep];
        if (!step) return false;

        const el = document.getElementById(step.targetId);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect((prev) => {
                    if (!prev ||
                        prev.top !== rect.top ||
                        prev.left !== rect.left ||
                        prev.width !== rect.width ||
                        prev.height !== rect.height) {
                        return rect;
                    }
                    return prev;
                });
                return true;
            }
        }
        setTargetRect(null);
        return false;
    }, [currentStep, steps]);

    useEffect(() => {
        if (!hasCompletedTour) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [hasCompletedTour]);

    useEffect(() => {
        if (!isVisible) return;

        let intervalId: NodeJS.Timeout;

        const checkAndSet = () => {
            updateTargetRect();
        };

        checkAndSet();
        intervalId = setInterval(checkAndSet, 500);

        const handleResizeOrScroll = () => updateTargetRect();

        window.addEventListener("scroll", handleResizeOrScroll);
        window.addEventListener("resize", handleResizeOrScroll);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("scroll", handleResizeOrScroll);
            window.removeEventListener("resize", handleResizeOrScroll);
        };
    }, [isVisible, updateTargetRect]);

    // Handle path-based redirects
    useEffect(() => {
        if (isVisible) {
            const step = steps[currentStep];
            if (step.path && !pathname.includes(step.path)) {
                router.push(step.path);
            }
        }
    }, [isVisible, currentStep, pathname, router, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        markTourAsCompleted();
    };

    if (!isVisible || !targetRect) return null;

    const currentStepData = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Dimmed Background Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 pointer-events-auto"
                style={{
                    clipPath: `path('M 0 0 h ${window.innerWidth} v ${window.innerHeight} h -${window.innerWidth} Z M ${targetRect.left - 4} ${targetRect.top - 4} h ${targetRect.width + 8} v ${targetRect.height + 8} h -${targetRect.width - 8} Z')`,
                    WebkitClipPath: `polygon(0% 0%, 0% 100%, ${targetRect.left - 8}px 100%, ${targetRect.left - 8}px ${targetRect.top - 8}px, ${targetRect.right + 8}px ${targetRect.top - 8}px, ${targetRect.right + 8}px ${targetRect.bottom + 8}px, ${targetRect.left - 8}px ${targetRect.bottom + 8}px, ${targetRect.left - 8}px 100%, 100% 100%, 100% 0%)`
                }}
                onClick={handleComplete}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        x: currentStepData.position === "right" ? targetRect.right + 20 :
                            currentStepData.position === "left" ? targetRect.left - 340 :
                                targetRect.left + (targetRect.width / 2) - 160,
                        top: currentStepData.position === "bottom" ? targetRect.bottom + 20 :
                            currentStepData.position === "top" ? targetRect.top - 200 :
                                targetRect.top + (targetRect.height / 2) - 100,
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute w-[320px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 pointer-events-auto border border-zinc-200 dark:border-zinc-800"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                {currentStepData.icon}
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white">{currentStepData.title}</h3>
                        </div>
                        <button onClick={handleComplete} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                        {currentStepData.content}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                        i === currentStep ? "bg-primary w-4" : "bg-zinc-200 dark:bg-zinc-800"
                                    )}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {currentStep > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleBack}
                                    className="text-xs h-8"
                                >
                                    <ChevronLeft className="w-3 h-3 mr-1" />
                                    Back
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleNext}
                                className="text-xs h-8 bg-primary hover:bg-primary/80 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                                {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3 ml-1" />}
                            </Button>
                        </div>
                    </div>

                    {/* Arrow pointer */}
                    <div
                        className={cn(
                            "absolute w-4 h-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rotate-45 transform",
                            currentStepData.position === "bottom" && "-top-2 left-1/2 -translate-x-1/2 border-t border-l",
                            currentStepData.position === "top" && "-bottom-2 left-1/2 -translate-x-1/2 border-b border-r",
                            currentStepData.position === "right" && "-left-2 top-1/2 -translate-y-1/2 border-b border-l",
                            currentStepData.position === "left" && "-right-2 top-1/2 -translate-y-1/2 border-t border-r",
                        )}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
