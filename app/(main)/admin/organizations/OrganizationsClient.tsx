"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Building2,
    Search,
    Users,
    ClipboardList,
    UserCheck,
    Zap,
    TrendingUp,
    Filter,
    ArrowUpDown,
    ExternalLink
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../@/components/ui/badge";
import { LoadingOverlay } from "../../../../components/ui/loading-overlay";

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(new Date(dateString));
};

interface OrgStats {
    id: string;
    name: string;
    created_at: string;
    plan: string;
    sub_status: string;
    memberships_count: number;
    surveys_count: number;
    respondents_count: number;
}

export default function OrganizationsClient() {
    const [organizations, setOrganizations] = useState<OrgStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof OrgStats; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch("/api/admin/organizations-stats");
                if (!response.ok) throw new Error("Failed to fetch stats");
                const data = await response.json();
                setOrganizations(data);
            } catch (error) {
                console.error("Error fetching org stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const filteredAndSortedOrgs = useMemo(() => {
        let result = [...organizations];

        // Search
        if (searchQuery) {
            result = result.filter(org =>
                org.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [organizations, searchQuery, sortConfig]);

    const handleSort = (key: keyof OrgStats) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section with Create Survey-like styling */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-primary" />
                        Manage Organizations
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Global oversight of all tenants, subscriptions, and activity levels.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations..."
                            className="pl-10 h-11 bg-card border-zinc-200 dark:border-zinc-800 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10 shadow-sm rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary font-bold">
                                {organizations.length}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Entities</p>
                                <p className="text-xl font-black">Organizations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Members</p>
                                <p className="text-xl font-black">
                                    {organizations.reduce((sum, org) => sum + org.memberships_count, 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Surveys</p>
                                <p className="text-xl font-black">
                                    {organizations.reduce((sum, org) => sum + org.surveys_count, 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responses</p>
                                <p className="text-xl font-black">
                                    {organizations.reduce((sum, org) => sum + org.respondents_count, 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Organizations Table */}
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 rounded-3xl overflow-hidden relative">
                {isLoading && <LoadingOverlay message="Fetching Organizations..." />}

                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">Organization Directory</CardTitle>
                        <Button variant="ghost" size="sm" className="font-bold gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                    <th
                                        className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Organization {sortConfig?.key === 'name' && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status & Plan</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Stats</th>
                                    <th
                                        className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleSort('created_at')}
                                    >
                                        <div className="flex items-center gap-2 justify-end">
                                            Joined {sortConfig?.key === 'created_at' && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                {filteredAndSortedOrgs.length > 0 ? (
                                    filteredAndSortedOrgs.map((org) => (
                                        <tr key={org.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform">
                                                        {org.name[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground">{org.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">{org.id.slice(0, 8)}...</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={org.plan === 'paid' ? 'default' : 'outline'}
                                                        className={org.plan === 'paid' ? 'bg-indigo-500 hover:bg-indigo-600 h-6 font-bold uppercase text-[10px]' : 'h-6 font-bold uppercase text-[10px] border-zinc-400 opacity-70'}
                                                    >
                                                        {org.plan}
                                                    </Badge>
                                                    {org.sub_status === 'active' && (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            {org.sub_status}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-6">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black">{org.memberships_count}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Admins</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black">{org.surveys_count}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Surveys</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black">{org.respondents_count}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Responses</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-foreground">
                                                        {formatDate(org.created_at)}
                                                    </span>
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
                                                        View Details
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Building2 className="w-12 h-12" />
                                                <p className="text-lg font-bold">No organizations found</p>
                                                <p className="text-sm">Try adjusting your search or filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
