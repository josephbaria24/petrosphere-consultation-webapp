import { createClient } from "../../../lib/supabase/server";
/**
 * File: app/api/bootstrap/route.ts
 * Description: Main initialization API route.
 * Aggregates user profile, membership, organization, and subscription data into a single payload.
 * Functions:
 * - GET(): Handler for retrieving session context, user roles, and feature flags.
 * Connections:
 * - Called by useBootstrap hook during application startup to populate AppProvider.
 * - Interfaces with Supabase Auth for session validation.
 * - Queries organizations and subscriptions tables for multi-tenant context.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { BootstrapData, PlanLimits } from "../../../lib/types/bootstrap";

export async function GET() {
    try {
        const cookieStore = await cookies();

        // Create regular server client for auth
        const supabase = await createClient();

        // Create service role client for admin operations
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get authenticated user
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        let userId: string;
        let userEmail: string;
        let isAdmin = false;
        let adminDetails: any = null;

        if (session) {
            userId = session.user.id;
            userEmail = session.user.email!;
        } else {
            // Check for admin cookie
            const adminId = cookieStore.get("admin_id")?.value;
            if (!adminId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { data: admin, error: adminError } = await supabaseAdmin
                .from("admin_users")
                .select("*")
                .eq("id", adminId)
                .single();

            if (adminError || !admin) {
                return NextResponse.json({ error: "Admin session invalid" }, { status: 401 });
            }

            userId = admin.id;
            userEmail = admin.email;
            isAdmin = true;
            adminDetails = admin;
        }

        // 1. Ensure profile exists (Only for regular auth users)
        // Platform Admins from admin_users table do not have an auth.users record,
        // so we skip updating the profiles table for them to avoid FK violations.
        if (!isAdmin) {
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .upsert(
                    {
                        user_id: userId,
                        email: userEmail,
                        full_name: adminDetails?.full_name || null
                    },
                    { onConflict: "user_id" }
                );

            if (profileError) {
                console.error("Failed to create/update profile:", profileError);
            }
        }

        // 3. Handle Organization and Membership
        let membershipData: any = null;
        let orgId: string;

        if (isAdmin) {
            // Platform Admins see a default org or their own if they have one
            // For Safety Vitals, let's use a standard org name for platform admins
            orgId = "939f6864-0f36-4740-9509-a654b453c9d9"; // Safety Vitals Global Org
            membershipData = { role: "admin" };
        } else {
            let { data: membership, error: membershipError } = await supabaseAdmin
                .from("memberships")
                .select("org_id, role")
                .eq("user_id", userId)
                .single();

            // Auto-provision demo user if needed
            if (membershipError || !membership) {
                // ... (auto-provisioning logic) ...
                const { data: newOrg, error: orgErr } = await supabaseAdmin
                    .from("organizations")
                    .insert({ name: `${userEmail.split('@')[0]}'s Organization` })
                    .select()
                    .single();

                if (orgErr || !newOrg) return NextResponse.json({ error: "Provision failed" }, { status: 500 });

                orgId = newOrg.id;
                await supabaseAdmin.from("memberships").insert({ org_id: orgId, user_id: userId, role: "demo" });
                await supabaseAdmin.from("subscriptions").insert({ org_id: orgId, plan: "demo", status: "active" });
                membershipData = { role: "demo" };
            } else {
                orgId = membership.org_id;
                membershipData = { role: membership.role };
            }
        }

        // 4. Get organization details
        const { data: org, error: orgError } = await supabaseAdmin
            .from("organizations")
            .select("id, name")
            .eq("id", orgId)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // 5. Get organization's subscription and limits
        const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("plan, status")
            .eq("org_id", org.id)
            .single();

        const activePlan = isAdmin ? 'paid' : (subscription?.plan || 'demo');

        const { data: planLimits } = await supabaseAdmin
            .from("plan_limits")
            .select("*")
            .eq("plan", activePlan)
            .single();

        const { data: overrides } = await supabaseAdmin
            .from("org_limit_overrides")
            .select("*")
            .eq("org_id", org.id)
            .maybeSingle();

        const effectiveLimits: PlanLimits = {
            max_surveys: overrides?.max_surveys ?? planLimits?.max_surveys ?? 10,
            max_questions_per_survey: overrides?.max_questions_per_survey ?? planLimits?.max_questions_per_survey ?? 50,
            max_responses_per_survey: overrides?.max_responses_per_survey ?? planLimits?.max_responses_per_survey ?? 100,
            allow_create_survey: overrides?.allow_create_survey ?? planLimits?.allow_create_survey ?? true,
            allow_collect_responses: overrides?.allow_collect_responses ?? planLimits?.allow_collect_responses ?? true,
            allow_exports: overrides?.allow_exports ?? planLimits?.allow_exports ?? false,
            allow_action_plans: overrides?.allow_action_plans ?? planLimits?.allow_action_plans ?? false,
        };

        const bootstrapData: BootstrapData = {
            user: {
                id: userId,
                email: userEmail,
            },
            org: {
                id: org.id,
                name: org.name,
            },
            membership: {
                role: membershipData.role,
            },
            subscription: {
                plan: activePlan,
                status: subscription?.status || 'active',
            },
            limits: effectiveLimits,
        };

        return NextResponse.json(bootstrapData);
    } catch (error) {
        console.error("Bootstrap error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
