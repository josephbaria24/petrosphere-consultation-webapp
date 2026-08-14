/**
 * File: app/api/admin/all-surveys/route.ts
 * Description: Administrative API route for global survey access.
 * Bypasses RLS to fetch surveys for authenticated Platform Admins.
 * Functions:
 * - GET(): Verifies admin_id cookie and returns survey records (optionally filtered by orgId).
 * Connections:
 * - Called by Dashboard / View Surveys when isPlatformAdmin is true.
 * - Uses supabaseAdmin (Service Role) to bypass multi-tenant restrictions.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";
import {
    countRespondentsBySurvey,
    questionMapFromSurveys,
} from "../../../../lib/count-survey-respondents";

/** Shared Safety Vitals instrument — always available alongside an org's own surveys. */
const DEFAULT_SURVEY_IDS = [
  "67813802-0821-4013-8b96-ddc5ba288c60",
  "00000000-0000-0000-0000-000000000000",
];

export async function GET(req: Request) {
    try {
        const admin = await getVerifiedAdminFromCookie();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get("orgId");
        const detailed = searchParams.get("detailed") === "1";
        const includeDefault = searchParams.get("includeDefault") !== "0";

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const select = detailed
            ? `
                id,
                slug,
                title,
                description,
                created_at,
                is_published,
                created_by,
                org_id,
                survey_questions (
                  id,
                  question_text,
                  question_type,
                  options,
                  order_index,
                  is_required,
                  created_at,
                  dimension,
                  dimension_code,
                  translated_question,
                  scoring_type,
                  max_score,
                  min_score,
                  reverse_score,
                  translated_options
                ),
                organizations (
                  name
                )
              `
            : `
                id,
                title,
                target_company,
                org_id,
                organizations (
                    name
                )
              `;

        let query = supabaseAdmin
            .from("surveys")
            .select(select)
            .order("created_at", { ascending: false });

        if (orgId && orgId !== "all") {
            if (includeDefault) {
                const defaultOr = DEFAULT_SURVEY_IDS.map((id) => `id.eq.${id}`).join(",");
                query = query.or(`org_id.eq.${orgId},${defaultOr}`);
            } else {
                query = query.eq("org_id", orgId);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase error fetching all surveys:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Prefer default Safety Vitals survey at the top when present
        const sorted = [...(data || [])].sort((a: any, b: any) => {
            const aDefault = DEFAULT_SURVEY_IDS.includes(a.id) ? 0 : 1;
            const bDefault = DEFAULT_SURVEY_IDS.includes(b.id) ? 0 : 1;
            if (aDefault !== bDefault) return aDefault - bDefault;
            return 0;
        });

        if (!detailed || sorted.length === 0) {
            return NextResponse.json(sorted);
        }

        // Responses are stored per question_id, not survey_id
        let counts: Record<string, number> = {};
        try {
            counts = await countRespondentsBySurvey({
                supabase: supabaseAdmin,
                questionToSurvey: questionMapFromSurveys(sorted),
                orgId,
            });
        } catch (countError) {
            console.error("Supabase error fetching respondent counts:", countError);
        }

        return NextResponse.json(
            sorted.map((s: { id: string }) => ({
                ...s,
                respondent_count: counts[s.id] ?? 0,
            }))
        );
    } catch (error) {
        console.error("Error fetching all surveys:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
