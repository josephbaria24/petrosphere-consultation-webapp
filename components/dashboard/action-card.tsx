//components\dashboard\action-card.tsx
import React, { useState } from "react";
import { Action, ActionComment } from "./types";
import {
    Clock,
    MessageSquare,
    Paperclip,
    MoreVertical,
    Trash2,
    CheckCircle2,
    AlertCircle,
    FileText,
    Send,
    ExternalLink
} from "lucide-react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ActionCardProps {
    action: Action;
    onUpdate: (id: string, updates: Partial<Action>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onViewDetails: (action: Action) => void;
}

export function ActionCard({ action, onUpdate, onDelete, onViewDetails }: ActionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<"comments" | "evidence" | null>(null);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const priorityColors = {
        high: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900",
        low: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900"
    };

    const statusColors = {
        todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    };

    const handleStatusChange = async (value: string) => {
        const newStatus = value as Action['workflow_stage'];
        setIsLoading(true);
        try {
            await onUpdate(action.id, {
                workflow_stage: newStatus,
                is_completed: newStatus === 'done'
            });
            toast.success("Status updated");
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const comment: ActionComment = {
            id: crypto.randomUUID(),
            user_id: "current-user", // Mock for now, would come from auth context
            user_name: "You",
            content: newComment,
            created_at: new Date().toISOString()
        };

        const updatedComments = [comment, ...(action.comments || [])];

        setIsLoading(true);
        try {
            await onUpdate(action.id, { comments: updatedComments });
            setNewComment("");
            toast.success("Comment added");
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEvidence = () => {
        toast("File upload not implemented in this demo", {
            description: "This would open a file picker in production.",
        });
    };

    return (
        <div
            onClick={() => onViewDetails(action)}
            className={`group rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer ${action.is_completed ? "opacity-75" : ""
                }`}>
            <div className="p-4 space-y-2">
                {/* Header: Status, Priority, Menu */}
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        {/* Left: status */}
                        <div onClick={(e) => e.stopPropagation()}>
                            <Select
                                value={action.workflow_stage || (action.is_completed ? "done" : "todo")}
                                onValueChange={handleStatusChange}
                                disabled={isLoading}
                            >
                                <SelectTrigger
                                    className={[
                                        "h-8 w-[120px] sm:w-[140px] text-xs font-medium border-0 shadow-sm",
                                        statusColors[action.workflow_stage || (action.is_completed ? "done" : "todo")],
                                    ].join(" ")}
                                >
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="review">In Review</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Right: menu */}
                        <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600 cursor-pointer"
                                        onClick={() => onDelete(action.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Priority row */}
                    <div className="flex items-center gap-2">
                        <span
                            className={[
                                "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border shadow-sm",
                                priorityColors[action.priority],
                            ].join(" ")}
                        >
                            {action.priority}
                        </span>
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    <h4 className={`font-semibold text-base mb-1 ${action.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {action.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {action.description || "No description provided."}
                    </p>
                </div>

                {/* Metadata Footer */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                    {/* Left */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{action.dimension}</span>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={[
                                "h-7 px-2 text-xs gap-1.5 rounded-full",
                                "border-muted-foreground/20 bg-blue-400/20",
                                activeTab === "evidence" ? "bg-muted" : "hover:bg-muted/60",
                            ].join(" ")}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(true);
                                setActiveTab(activeTab === "evidence" ? null : "evidence");
                            }}
                        >
                            <Paperclip className="w-3 h-3" />
                            <span className="tabular-nums">{action.evidence_urls?.length || 0}</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={[
                                "h-7 px-2 text-xs gap-1.5 rounded-full",
                                "border-muted-foreground/20 bg-green-400/20",
                                activeTab === "comments" ? "bg-muted" : "hover:bg-muted/60",
                            ].join(" ")}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(true);
                                setActiveTab(activeTab === "comments" ? null : "comments");
                            }}
                        >
                            <MessageSquare className="w-3 h-3" />
                            <span className="tabular-nums">{action.comments?.length || 0}</span>
                        </Button>
                    </div>
                </div>
            </div>
            {/* Expanded Section */}
            {isExpanded && activeTab && (
                <div className="border-t bg-muted/30 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {activeTab === 'comments' && (
                        <div className="space-y-3">
                            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {action.comments && action.comments.length > 0 ? (
                                    action.comments.map((comment, idx) => (
                                        <div key={idx} className="flex gap-2 text-sm group">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                                {comment.user_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-xs">{comment.user_name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <Button size="sm" className="h-8 w-8 p-0" onClick={handleAddComment} disabled={isLoading || !newComment.trim()}>
                                    <Send className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'evidence' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                {action.evidence_urls && action.evidence_urls.length > 0 ? (
                                    action.evidence_urls.map((url, idx) => (
                                        <a href={url} key={idx} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-background border rounded-md hover:bg-muted transition-colors group">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm flex-1 truncate">Evidence_File_{idx + 1}.pdf</span>
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                        </a>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg bg-background/50">
                                        <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                        <p className="text-xs text-muted-foreground">No evidence attached</p>
                                    </div>
                                )}
                            </div>
                            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleAddEvidence}>
                                <Paperclip className="w-3 h-3 mr-2" />
                                Upload File
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
