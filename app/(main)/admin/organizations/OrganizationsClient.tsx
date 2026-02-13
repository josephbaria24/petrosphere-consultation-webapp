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
    ExternalLink,
    Trash2,
    MoreVertical,
    Edit2,
    Settings,
    Shield,
    BarChart
} from "lucide-react";
import { toast } from "sonner";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "../../../../components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "../../../../components/ui/dialog";
import { Label } from "../../../../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../../components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";

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
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState<any>({
        name: "",
        plan: "demo",
        overrides: {
            max_surveys: 3,
            max_questions_per_survey: 10,
            max_responses_per_survey: 100,
            allow_create_survey: true,
            allow_collect_responses: true,
            allow_exports: false,
            allow_action_plans: false
        }
    });

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/organizations-stats");
            if (!response.ok) throw new Error("Failed to fetch stats");
            const data = await response.json();
            setOrganizations(data);
        } catch (error) {
            console.error("Error fetching org stats:", error);
            toast.error("Failed to refresh organization list");
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleDelete = async (orgId: string, orgName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${orgName}"? \n\nThis will permanently remove all associated surveys, responses, and actions. This action CANNOT be undone.`)) {
            return;
        }

        setIsDeleting(orgId);
        try {
            const response = await fetch(`/api/admin/organizations/${orgId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete organization");
            }

            toast.success(`Organization "${orgName}" deleted successfully`);
            fetchStats();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "An error occurred during deletion");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleEditInitiate = async (orgId: string) => {
        setSelectedOrgId(orgId);
        setIsEditDialogOpen(true);
        setEditLoading(true);
        try {
            const res = await fetch(`/api/admin/organizations/${orgId}`);
            if (!res.ok) throw new Error("Failed to fetch details");
            const data = await res.json();
            setEditForm({
                name: data.organization.name || "",
                plan: data.subscription?.plan || "demo",
                overrides: {
                    max_surveys: data.overrides?.max_surveys ?? 3,
                    max_questions_per_survey: data.overrides?.max_questions_per_survey ?? 10,
                    max_responses_per_survey: data.overrides?.max_responses_per_survey ?? 100,
                    allow_create_survey: data.overrides?.allow_create_survey ?? true,
                    allow_collect_responses: data.overrides?.allow_collect_responses ?? true,
                    allow_exports: data.overrides?.allow_exports ?? false,
                    allow_action_plans: data.overrides?.allow_action_plans ?? false
                }
            });
        } catch (err) {
            console.error("Fetch error:", err);
            toast.error("Failed to load organization details");
            setIsEditDialogOpen(false);
        } finally {
            setEditLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedOrgId) return;
        setEditLoading(true);
        try {
            const res = await fetch(`/api/admin/organizations/${selectedOrgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save changes");
            }
            toast.success("Organization updated successfully");
            setIsEditDialogOpen(false);
            fetchStats();
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || "An error occurred while saving");
        } finally {
            setEditLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

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
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
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
                                                        Details
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl">
                                                        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            className="gap-2 font-bold text-xs cursor-pointer"
                                                            onClick={() => handleEditInitiate(org.id)}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="gap-2 font-bold text-xs text-red-500 hover:text-red-600 cursor-pointer"
                                                            onClick={() => handleDelete(org.id, org.name)}
                                                            disabled={isDeleting === org.id}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            {isDeleting === org.id ? 'Deleting...' : 'Delete Organization'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
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

            {/* Edit Organization Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            <Settings className="w-6 h-6 text-primary" />
                            Edit Organization Details
                        </DialogTitle>
                        <DialogDescription className="font-medium text-sm">
                            Modify core identity, subscription tier, and granular feature limits.
                        </DialogDescription>
                    </DialogHeader>

                    {editLoading && !editForm.name ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">Loading details...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 py-4">
                            {/* General Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" />
                                    General Information
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Organization Name</Label>
                                        <Input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="h-12 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Section */}
                            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    Plan & Subscription
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Plan Tier</Label>
                                        <Select
                                            value={editForm.plan}
                                            onValueChange={(val) => setEditForm(prev => ({ ...prev, plan: val }))}
                                        >
                                            <SelectTrigger className="h-12 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold">
                                                <SelectValue placeholder="Select Plan" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl">
                                                <SelectItem value="demo" className="font-bold">Demo (Free)</SelectItem>
                                                <SelectItem value="basic" className="font-bold">Basic</SelectItem>
                                                <SelectItem value="paid" className="font-bold">Premium (Paid)</SelectItem>
                                                <SelectItem value="enterprise" className="font-bold">Enterprise</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Limits & Overrides */}
                            <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    Granular Limit Overrides
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Numeric Inputs */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Max Surveys</Label>
                                            <Input
                                                type="number"
                                                value={editForm.overrides.max_surveys}
                                                onChange={(e) => setEditForm(prev => ({
                                                    ...prev,
                                                    overrides: { ...prev.overrides, max_surveys: parseInt(e.target.value) }
                                                }))}
                                                className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Max Questions/Survey</Label>
                                            <Input
                                                type="number"
                                                value={editForm.overrides.max_questions_per_survey}
                                                onChange={(e) => setEditForm(prev => ({
                                                    ...prev,
                                                    overrides: { ...prev.overrides, max_questions_per_survey: parseInt(e.target.value) }
                                                }))}
                                                className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Max Responses/Survey</Label>
                                            <Input
                                                type="number"
                                                value={editForm.overrides.max_responses_per_survey}
                                                onChange={(e) => setEditForm(prev => ({
                                                    ...prev,
                                                    overrides: { ...prev.overrides, max_responses_per_survey: parseInt(e.target.value) }
                                                }))}
                                                className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Feature Toggles (Using custom toggle since switch isn't available) */}
                                    <div className="space-y-4">
                                        {[
                                            { id: 'allow_create_survey', label: 'Create Surveys', icon: Building2 },
                                            { id: 'allow_exports', label: 'Data Exports', icon: BarChart },
                                            { id: 'allow_action_plans', label: 'Action Plans', icon: Settings },
                                        ].map((feature) => (
                                            <div
                                                key={feature.id}
                                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${editForm.overrides[feature.id]
                                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                                                    }`}
                                                onClick={() => setEditForm(prev => ({
                                                    ...prev,
                                                    overrides: { ...prev.overrides, [feature.id]: !prev.overrides[feature.id] }
                                                }))}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${editForm.overrides[feature.id] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                        <feature.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">{feature.label}</span>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full transition-colors relative ${editForm.overrides[feature.id] ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${editForm.overrides[feature.id] ? 'right-1' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                        <Button
                            variant="ghost"
                            className="font-bold uppercase tracking-widest text-[10px] rounded-xl"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="font-black uppercase tracking-widest text-[10px] rounded-xl h-11 px-8 shadow-lg shadow-primary/20"
                            onClick={handleSaveEdit}
                            disabled={editLoading}
                        >
                            {editLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </div>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
