export interface ActionComment {
    id: string;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
}

export interface Action {
    id: string;
    survey_id: string;
    dimension: string;
    status: 'critical' | 'at_risk';
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    assigned_to?: string;
    target_date?: string;
    created_at: string;
    updated_at: string;
    is_completed: boolean;
    created_by?: string;
    // New Workflow Fields
    workflow_stage?: 'todo' | 'in_progress' | 'review' | 'done';
    evidence_urls?: string[];
    comments?: ActionComment[];
    org_id?: string;
}
