"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { FileDown, Download, CircleAlert, Lock, Target } from "lucide-react";
import { useApp } from "./app/AppProvider";
import { cn } from "../lib/utils";
import { UpgradeRequiredModal } from "./upgrade-required-modal";

interface ExportDialogProps {
    type: "dashboard" | "results";
    title: string;
    onExport: () => Promise<void>;
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ExportDialog({ type, title, onExport, trigger, isOpen, onOpenChange }: ExportDialogProps) {
    const { limits } = useApp();
    const [isExporting, setIsExporting] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);

    // Determine if we are in controlled mode
    const isControlled = isOpen !== undefined;
    const open = isControlled ? isOpen : internalOpen;
    const setOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen;

    const isRestricted = !limits?.allow_exports;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport();
            setOpen(false);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    if (isRestricted) {
        return (
            <>
                {trigger ? (
                    <div onClick={() => setOpen(true)}>
                        {trigger}
                    </div>
                ) : (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </Button>
                )}
                <UpgradeRequiredModal
                    open={open}
                    onOpenChange={setOpen}
                    title="Export Feature Restricted"
                />
            </>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Export to PDF
                    </DialogTitle>
                    <DialogDescription>
                        Generate a professional PDF report for "{title}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="p-4 rounded-xl bg-muted/30 border border-zinc-800/50 space-y-2">
                        <p className="text-sm font-medium">Report Configuration</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="px-2 py-1 rounded-md bg-zinc-800">PDF Format</div>
                            <div className="px-2 py-1 rounded-md bg-zinc-800">High Quality</div>
                            <div className="px-2 py-1 rounded-md bg-zinc-800">Include Charts</div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic px-1">
                        * Exporting may take a few seconds as we prepare the visualizations.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full h-11 font-bold rounded-xl"
                    >
                        {isExporting ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Generating PDF...
                            </>
                        ) : (
                            "Download Report"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
