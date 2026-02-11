
import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../@/components/ui/table";
import { Badge } from "../../@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DimensionTableProps {
    data: any[];
}

export function DimensionTable({ data }: DimensionTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'score', direction: 'asc' });

    const sortedData = React.useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle specific keys if needed (like nested properties)
                if (sortConfig.key === 'score') {
                    aValue = a.scorePercent;
                    bValue = b.scorePercent;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name: string) => {
        if (!sortConfig || sortConfig.key !== name) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const getStatus = (score: number) => {
        if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0">Strong</Badge>;
        if (score >= 60) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Good</Badge>;
        if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0">At Risk</Badge>;
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0">Critical</Badge>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px] cursor-pointer" onClick={() => requestSort('name')}>
                            <div className="flex items-center">
                                Dimension {getSortIcon('name')}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('score')}>
                            <div className="flex items-center">
                                Score {getSortIcon('score')}
                            </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.map((row) => (
                        <TableRow key={row.name}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell>{row.scorePercent.toFixed(1)}%</TableCell>
                            <TableCell>{getStatus(row.scorePercent)}</TableCell>
                            <TableCell className="text-right">
                                {/* Placeholder for future action button */}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
