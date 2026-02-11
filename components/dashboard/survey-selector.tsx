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
            className="inline-flex gap-1.5 md:gap-2 dark:bg-card bg-zinc-800 p-1 pl-2 rounded-3xl shadow-xl transition-all"
        >
            <div className="flex items-center text-[10px] md:text-sm text-white">
                <h1 className="whitespace-nowrap">Select survey</h1>
            </div>
            <Select
                value={selectedSurvey?.id || ""}
                onValueChange={(val) => {
                    const surveyObj = surveys.find((s) => s.id === val);
                    setSelectedSurvey(surveyObj || null);
                }}
            >
                <SelectTrigger className="bg-card rounded-2xl border-0 h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm">
                    <SelectValue placeholder="Select a Survey" />
                </SelectTrigger>
                <SelectContent>
                    {surveys.map((survey) => (
                        <SelectItem key={survey.id} value={survey.id}>
                            {survey.title} {survey.organizations?.name ? `(${survey.organizations.name})` : ""}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
