"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Clock,
    MessageSquare,
    Paperclip,
    Trash2,
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    FileText,
    Send,
    ExternalLink
} from "lucide-react";
import { Action, ActionComment } from "./types";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ActionDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    action: Action | null;
    onUpdate: (id: string, updates: Partial<Action>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function ActionDetailDialog({
    isOpen,
    onOpenChange,
    action,
    onUpdate,
    onDelete,
}: ActionDetailDialogProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Action>>({});

    if (!action) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate(action.id, editForm);
            setIsEditing(false);
            toast.success("Action updated successfully");
        } catch (error) {
            toast.error("Failed to update action");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const comment: ActionComment = {
            id: crypto.randomUUID(),
            user_id: "current-user",
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

    const statusColors = {
        todo: "bg-slate-100 text-slate-700",
        in_progress: "bg-blue-100 text-blue-700",
        review: "bg-purple-100 text-purple-700",
        done: "bg-emerald-100 text-emerald-700"
    };

    const priorityColors = {
        high: "bg-red-100 text-red-800",
        medium: "bg-yellow-100 text-yellow-800",
        low: "bg-blue-100 text-blue-800"
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl font-bold">Action Details</DialogTitle>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${priorityColors[action.priority]}`}>
                                {action.priority}
                            </span>
                        </div>
                    </div>
                    <DialogDescription>
                        Managed action for {action.dimension} status
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Main Info */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                                <Select
                                    value={action.workflow_stage || (action.is_completed ? 'done' : 'todo')}
                                    onValueChange={(val) => onUpdate(action.id, { workflow_stage: val as any, is_completed: val === 'done' })}
                                >
                                    <SelectTrigger className={`h-8 w-[140px] text-xs font-medium ${statusColors[action.workflow_stage || (action.is_completed ? 'done' : 'todo')]}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">To Do</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="review">In Review</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 pt-5">
                                <Button variant="ghost" size="sm" onClick={() => onDelete(action.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8">
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Delete
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{action.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {action.description || "No description provided."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                    <User className="w-3 h-3" />
                                    Assigned To
                                </div>
                                <div className="text-sm font-medium">{action.assigned_to || "Unassigned"}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                    <Calendar className="w-3 h-3" />
                                    Target Date
                                </div>
                                <div className="text-sm font-medium">
                                    {action.target_date ? new Date(action.target_date).toLocaleDateString() : "No date"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr />

                    {/* Comments & Evidence Tabs */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h4 className="font-semibold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Comments ({action.comments?.length || 0})
                            </h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <Button onClick={handleAddComment} disabled={isLoading || !newComment.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {action.comments && action.comments.length > 0 ? (
                                    action.comments.map((comment, idx) => (
                                        <div key={idx} className="flex gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">
                                                {comment.user_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold">{comment.user_name}</span>
                                                    <span className="text-[10px] text-muted-foreground italic">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground bg-muted/30 p-2 rounded-md border text-[13px]">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 bg-muted/20 rounded-lg border-2 border-dashed">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">No comments yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr />

                    <div className="space-y-4 pb-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                Evidence & Attachments ({action.evidence_urls?.length || 0})
                            </h4>
                            <Button variant="outline" size="sm" onClick={() => toast.info("Upload not implemented")}>
                                <Plus className="w-4 h-4 mr-2" />
                                Upload
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {action.evidence_urls && action.evidence_urls.length > 0 ? (
                                action.evidence_urls.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg hover:bg-muted transition-colors group">
                                        <div className="w-8 h-8 rounded bg-background border flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">Evidence_{idx + 1}.pdf</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">External Link</p>
                                        </div>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))
                            ) : (
                                <div className="sm:col-span-2 text-center py-6 bg-muted/20 rounded-lg border-2 border-dashed">
                                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                                    <p className="text-sm text-muted-foreground">No evidence attached</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { Plus } from "lucide-react";
