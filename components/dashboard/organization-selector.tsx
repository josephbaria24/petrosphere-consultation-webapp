import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import React from "react";
import { Building2 } from "lucide-react";

interface Organization {
    id: string;
    name: string;
}

interface OrganizationSelectorProps {
    organizations: Organization[];
    selectedOrgId: string;
    onOrgChange: (orgId: string) => void;
    containerRef?: React.RefObject<HTMLDivElement>;
}

export function OrganizationSelector({
    organizations,
    selectedOrgId,
    onOrgChange,
    containerRef,
}: OrganizationSelectorProps) {
    return (
        <div
            ref={containerRef}
            className="inline-flex items-center gap-1.5 md:gap-2 dark:bg-card bg-zinc-800 p-1 pl-2 md:pl-3 rounded-3xl shadow-xl border border-white/5 transition-all"
        >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-white/70 font-medium">
                <Building2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                <span className="whitespace-nowrap">Client Context</span>
            </div>
            <Select
                value={selectedOrgId}
                onValueChange={onOrgChange}
            >
                <SelectTrigger className="bg-card rounded-2xl border-0 h-8 md:h-9 min-w-[120px] md:min-w-[140px] px-3 md:px-4 text-xs md:text-sm focus:ring-1 focus:ring-primary/50 transition-all">
                    <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 shadow-2xl">
                    <SelectItem value="all" className="font-semibold text-primary">
                        All Organizations (Global)
                    </SelectItem>
                    {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                            {org.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
