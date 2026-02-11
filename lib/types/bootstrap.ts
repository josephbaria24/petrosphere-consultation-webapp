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
    };
    limits: PlanLimits;
}
