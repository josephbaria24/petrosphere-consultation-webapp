import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import React from "react";

interface Survey {
    id: string;
    title: string;
    target_company?: string;
    // eslint-disable-next-line
    [key: string]: any;
}

interface SurveySelectorProps {
    surveys: Survey[];
    selectedSurvey: Survey | null;
    setSelectedSurvey: (survey: Survey | null) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

export function SurveySelector({
    surveys,
    selectedSurvey,
    setSelectedSurvey,
    containerRef,
}: SurveySelectorProps) {

    return (
        <div
            ref={containerRef}
            className="inline-flex gap-1.5 md:gap-2 dark:bg-card bg-zinc-800 p-0.5 md:p-1 pl-2 rounded-2xl shadow-xl transition-all"
        >
            <div className="flex items-center text-[9px] md:text-[11px] text-white font-bold uppercase tracking-wider">
                <h1 className="whitespace-nowrap">Select survey</h1>
            </div>
            <Select
                value={selectedSurvey?.id || ""}
                onValueChange={(val) => {
                    const surveyObj = surveys.find((s) => s.id === val);
                    setSelectedSurvey(surveyObj || null);
                }}
            >
                <SelectTrigger className="bg-card rounded-xl border-0 h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs font-bold">
                    <SelectValue placeholder="Select a Survey" />
                </SelectTrigger>
                <SelectContent>
                    {surveys.map((survey) => (
                        <SelectItem key={survey.id} value={survey.id} className="text-xs">
                            {survey.title} {survey.organizations?.name ? `(${survey.organizations.name})` : ""}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
