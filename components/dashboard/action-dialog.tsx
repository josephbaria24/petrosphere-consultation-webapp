//components\dashboard\action-dialog.tsx
import React from "react";
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
import { Plus } from "lucide-react";

export interface ActionFormState {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    assigned_to: string;
    target_date: string;
}

interface ActionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
    formState: ActionFormState;
    setFormState: React.Dispatch<React.SetStateAction<ActionFormState>>;
    createAction: () => void;
    selectedDimension: string;
    selectedStatus: "critical" | "at_risk";
}

export function ActionDialog({
    isOpen,
    onOpenChange,
    onClose,
    formState,
    setFormState,
    createAction,
    selectedDimension,
    selectedStatus,
}: ActionDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Action</DialogTitle>
                    <DialogDescription>
                        Create an action plan for {selectedDimension} ({selectedStatus}{" "}
                        status)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Action Title *</Label>
                        <Input
                            id="title"
                            value={formState.title}
                            onChange={(e) =>
                                setFormState((prev) => ({ ...prev, title: e.target.value }))
                            }
                            placeholder="Enter action title..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formState.description}
                            onChange={(e) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                            placeholder="Describe the action plan..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formState.priority}
                                onValueChange={(value: "low" | "medium" | "high") =>
                                    setFormState((prev) => ({ ...prev, priority: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target_date">Target Date</Label>
                            <Input
                                id="target_date"
                                type="date"
                                value={formState.target_date}
                                onChange={(e) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        target_date: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assigned_to">Assigned To</Label>
                        <Input
                            id="assigned_to"
                            value={formState.assigned_to}
                            onChange={(e) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    assigned_to: e.target.value,
                                }))
                            }
                            placeholder="Enter assignee name..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={createAction} disabled={!formState.title.trim()}>
                        <Plus className="w-4 h-4 mr-1" />
                        Create Action
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
