"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../app/AppProvider";

interface ComplianceReportButtonProps {
    orgId?: string;
    orgName?: string;
}

export function ComplianceReportButton({ orgId, orgName }: ComplianceReportButtonProps) {
    const { user } = useApp();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!orgId) {
            toast.error("Organization not found");
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch("/api/reports/compliance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    org_id: orgId,
                    created_by: user?.id 
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to generate report");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `compliance-report-${(orgName || "org").replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Compliance report downloaded!");
        } catch (err: any) {
            console.error("Report generation error:", err);
            toast.error(err.message || "Failed to generate report");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !orgId}
            className="gap-2 text-xs"
        >
            {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <FileDown className="w-3.5 h-3.5" />
            )}
            {isGenerating ? "Generating..." : "Compliance Report"}
        </Button>
    );
}
