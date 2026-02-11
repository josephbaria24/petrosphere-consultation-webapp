"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface LoadingOverlayProps {
    message?: string;
    subMessage?: string;
    className?: string;
    variant?: "fullscreen" | "absolute";
}

export function LoadingOverlay({
    message = "Analyzing Data...",
    subMessage = "Please wait a moment",
    className,
    variant = "absolute",
}: LoadingOverlayProps) {
    const containerClasses = cn(
        "z-50 flex flex-col items-center justify-center bg-background/5 backdrop-blur-[2px] transition-all duration-300",
        variant === "fullscreen" ? "fixed inset-0" : "absolute inset-0 rounded-xl",
        className
    );

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-background/80 shadow-xl border border-border/50 animate-in fade-in zoom-in duration-300">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-foreground/80">{message}</span>
                    <span className="text-[10px] text-muted-foreground animate-pulse">{subMessage}</span>
                </div>
            </div>
        </div>
    );
}
