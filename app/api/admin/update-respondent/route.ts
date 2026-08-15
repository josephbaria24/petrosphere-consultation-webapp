/**
 * Update respondent profile fields (and matching response metadata for a survey).
 * Platform admins only.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";

const QUESTION_CHUNK = 150;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = clean(body.userId);
    const surveyId = clean(body.surveyId);
    const orgId =
      typeof body.orgId === "string" && body.orgId && body.orgId !== "all"
        ? body.orgId.trim()
        : null;

    const first_name = clean(body.first_name);
    const last_name = clean(body.last_name);
    const email = clean(body.email);
    const role = clean(body.role);
    const department = clean(body.department);
    const site = clean(body.site);

    if (!userId || userId === "anonymous") {
      return NextResponse.json(
        { error: "A respondent is required." },
        { status: 400 }
      );
    }
    if (!first_name || !last_name || !role || !department || !site) {
      return NextResponse.json(
        {
          error:
            "First name, last name, role, department, and site are required.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userUpdate: Record<string, string | null> = {
      first_name,
      last_name,
      role,
      department,
      site,
    };
    if (email) userUpdate.email = email;

    const { error: userError } = await supabaseAdmin
      .from("users")
      .update(userUpdate)
      .eq("id", userId);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    let responsesUpdated = 0;

    if (surveyId) {
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from("survey_questions")
        .select("id")
        .eq("survey_id", surveyId);

      if (questionsError) {
        return NextResponse.json(
          { error: questionsError.message },
          { status: 500 }
        );
      }

      const questionIds = (questions || []).map((q) => q.id).filter(Boolean);

      for (let i = 0; i < questionIds.length; i += QUESTION_CHUNK) {
        const chunk = questionIds.slice(i, i + QUESTION_CHUNK);
        let query = supabaseAdmin
          .from("responses")
          .update({ role, department, site }, { count: "exact" })
          .eq("user_id", userId)
          .in("question_id", chunk);

        if (orgId) query = query.eq("org_id", orgId);

        const { error, count } = await query;

        if (error) {
          // Older schemas may lack department/site on responses — update role only
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("department") || msg.includes("site")) {
            let fallback = supabaseAdmin
              .from("responses")
              .update({ role }, { count: "exact" })
              .eq("user_id", userId)
              .in("question_id", chunk);
            if (orgId) fallback = fallback.eq("org_id", orgId);
            const retry = await fallback;
            if (retry.error) {
              return NextResponse.json(
                { error: retry.error.message },
                { status: 500 }
              );
            }
            responsesUpdated += retry.count ?? 0;
            continue;
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        responsesUpdated += count ?? 0;
      }
    }

    return NextResponse.json({
      ok: true,
      responsesUpdated,
      user: {
        id: userId,
        first_name,
        last_name,
        email: email || null,
        role,
        department,
        site,
      },
    });
  } catch (error) {
    console.error("Error updating respondent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
