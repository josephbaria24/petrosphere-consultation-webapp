"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Lock } from "lucide-react";
import { UpgradeRequiredModal } from "./upgrade-required-modal";

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
    const [open, setOpen] = useState(false);

    if (!isRestricted) return <>{children}</>;

    return (
        <div className="relative w-full min-h-[50vh] flex flex-col items-center justify-center">
            <UpgradeRequiredModal
                open={open}
                onOpenChange={setOpen}
                title={`${featureName} Restricted`}
            />
            {/* Overlay */}
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-background/20 backdrop-blur-[4px]">
                <div className="max-w-xs w-full bg-background p-6 rounded-2xl shadow-2xl border border-zinc-800 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold">Premium Feature</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Upgrade to unlock {featureName} and professional tools.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Button
                            className="w-full h-10 font-bold text-sm bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            size="sm"
                            onClick={() => setOpen(true)}
                        >
                            Upgrade to Access
                        </Button>
                    </div>
                </div>
            </div>

            {/* Gated Content (Blurred) */}
            <div className="opacity-20 pointer-events-none select-none filter blur-md transition-all duration-500 w-full">
                {children}
            </div>
        </div>
    );
}
