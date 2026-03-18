export type AppRole = 'admin' | 'member' | 'demo';
export type PlanTier = 'demo' | 'paid';
export type SubStatus = 'active' | 'trialing' | 'canceled' | 'past_due';

export interface PlanLimits {
    max_surveys: number;
    max_questions_per_survey: number;
    max_responses_per_survey: number;
    allow_create_survey: boolean;
    allow_collect_responses: boolean;
    allow_exports: boolean;
    allow_action_plans: boolean;
    allow_chat_ai: boolean;
    allow_ai_insights: boolean;
    allow_individual_responses: boolean;
    allow_dimensions: boolean;
    allow_respondents: boolean;
    allow_tasks: boolean;
}

export interface BootstrapData {
    user: {
        id: string;
        email: string;
    };
    org: {
        id: string;
        name: string;
    };
    membership: {
        role: AppRole;
    };
    subscription: {
        plan: PlanTier;
        status: SubStatus;
        trial_ends_at?: string;
    };
    limits: PlanLimits;
}
