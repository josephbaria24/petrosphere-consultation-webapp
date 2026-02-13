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
            className="inline-flex items-center gap-1.5 md:gap-2 dark:bg-card bg-zinc-800 p-0.5 md:p-1 pl-2 md:pl-3 rounded-2xl shadow-xl border border-white/5 transition-all"
        >
            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] text-white/70 font-bold uppercase tracking-wider">
                <Building2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                <span className="whitespace-nowrap">Client Context</span>
            </div>
            <Select
                value={selectedOrgId}
                onValueChange={onOrgChange}
            >
                <SelectTrigger className="bg-card rounded-xl border-0 h-7 md:h-8 min-w-[110px] md:min-w-[130px] px-2 md:px-3 text-[10px] md:text-xs font-bold focus:ring-1 focus:ring-primary/50 transition-all">
                    <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 shadow-2xl">
                    <SelectItem value="all" className="font-bold text-[11px] uppercase tracking-wider text-primary">
                        All Organizations
                    </SelectItem>
                    {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id} className="text-xs">
                            {org.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
