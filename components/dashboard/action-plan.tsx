//components\dashboard\action-plan.tsx
import React from "react";
import {
    Card
    ,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "../ui/card";
import {
    Target,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { Action } from "./types";
import { ActionCard } from "./action-card";

interface ActionPlanProps {
    actions: Action[];
    onToggleAction?: (id: string, isCompleted: boolean) => void;
    onDeleteAction: (id: string) => void;
    onUpdateAction: (id: string, updates: Partial<Action>) => Promise<void>;
    onViewDetails: (action: Action) => void;
    containerRef: React.RefObject<HTMLDivElement> | null;
}

export function ActionPlan({
    actions,
    onDeleteAction,
    onUpdateAction,
    onViewDetails,
    containerRef,
}: ActionPlanProps) {
    const activeActions = actions.filter((a) => !a.is_completed);
    const completedActions = actions.filter((a) => a.is_completed);

    return (
        <Card ref={containerRef} className="border-0 shadow-lg bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="w-5 h-5 text-primary" />
                    Action Plan
                </CardTitle>
                <CardDescription>
                    {actions.length > 0
                        ? `${activeActions.length} active actions, ${completedActions.length} completed`
                        : "Create actions for critical and at-risk dimensions"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {actions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                        <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="font-medium">No actions created yet</p>
                        <p className="text-sm mt-1">
                            Click on dimensions in the summary above to create actions
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Active Actions */}
                        {activeActions.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2 text-foreground/80">
                                    <Clock className="w-4 h-4" />
                                    Active Actions ({activeActions.length})
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeActions
                                        .sort((a, b) => {
                                            const priorityOrder = { high: 3, medium: 2, low: 1 };
                                            return (
                                                priorityOrder[b.priority] - priorityOrder[a.priority]
                                            );
                                        })
                                        .map((action) => (
                                            <ActionCard
                                                key={action.id}
                                                action={action}
                                                onUpdate={async (id, updates) => await onUpdateAction(id, updates)}
                                                onDelete={async (id) => onDeleteAction(id)}
                                                onViewDetails={onViewDetails}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Actions */}
                        {completedActions.length > 0 && (
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-semibold text-lg flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Completed Actions ({completedActions.length})
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-80">
                                    {completedActions
                                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                                        .map((action) => (
                                            <ActionCard
                                                key={action.id}
                                                action={action}
                                                onUpdate={async (id, updates) => await onUpdateAction(id, updates)}
                                                onDelete={async (id) => onDeleteAction(id)}
                                                onViewDetails={onViewDetails}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
