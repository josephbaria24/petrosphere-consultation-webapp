"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Card, CardHeader, CardTitle, CardContent, CardDescription
} from "../ui/card";
import { supabase } from "../../lib/supabaseClient";
import { Users, AlertTriangle } from "lucide-react";
import { EmptyState } from "./empty-state";

interface OwnerPerformanceProps {
    orgId?: string;
    onOwnerFilter?: (owner: string | null) => void;
    activeOwnerFilter?: string | null;
}

interface OwnerRow {
    owner: string;
    total: number;
    open: number;
    overdue: number;
    closed: number;
}

export function OwnerPerformance({ orgId, onOwnerFilter, activeOwnerFilter }: OwnerPerformanceProps) {
    const [data, setData] = useState<OwnerRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!orgId) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const { data: rows, error } = await supabase
                .from("v_org_actions_by_owner")
                .select("*")
                .eq("org_id", orgId)
                .order("total", { ascending: false });

            if (error) throw error;
            setData((rows || []).map((r: any) => ({
                owner: r.owner,
                total: parseInt(r.total),
                open: parseInt(r.open),
                overdue: parseInt(r.overdue),
                closed: parseInt(r.closed),
            })));
        } catch (err) {
            console.error("OwnerPerformance error:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [orgId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleClick = (owner: string) => {
        if (!onOwnerFilter) return;
        onOwnerFilter(activeOwnerFilter === owner ? null : owner);
    };

    if (isLoading) {
        return (
            <Card className="border-0 bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" /> Owner Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border-0 bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" /> Owner Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-0">
                    <EmptyState 
                        title="No performance data" 
                        message="Action plans and assignees are required to show performance tracking."
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 bg-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" /> Owner Performance
                </CardTitle>
                <CardDescription className="text-xs">
                    Action accountability by assignee • Click to filter
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Owner</th>
                                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Total</th>
                                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Open</th>
                                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Overdue</th>
                                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Closed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row) => (
                                <tr
                                    key={row.owner}
                                    className={`border-b border-border/50 transition-colors cursor-pointer hover:bg-muted/50 ${activeOwnerFilter === row.owner ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}
                                    onClick={() => handleClick(row.owner)}
                                >
                                    <td className="py-2.5 px-2 font-medium truncate max-w-[160px]">
                                        {row.owner}
                                    </td>
                                    <td className="py-2.5 px-2 text-center tabular-nums">
                                        {row.total}
                                    </td>
                                    <td className="py-2.5 px-2 text-center tabular-nums text-blue-600">
                                        {row.open}
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                        {row.overdue > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                                                <AlertTriangle className="w-3 h-3" />
                                                {row.overdue}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">0</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-2 text-center tabular-nums text-emerald-600">
                                        {row.closed}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {activeOwnerFilter && (
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Filtering: <strong className="text-foreground">{activeOwnerFilter}</strong>
                        </span>
                        <button
                            onClick={() => onOwnerFilter?.(null)}
                            className="text-xs text-primary hover:underline"
                        >
                            Clear filter
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
