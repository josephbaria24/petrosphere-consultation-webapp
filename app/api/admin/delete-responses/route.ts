/**
 * Delete every response row for one respondent on one survey.
 * Platform admins only. Requires typing the confirmation phrase.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";

const CONFIRMATION = "Delete this user responses";
const QUESTION_CHUNK = 150;

export async function POST(req: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const surveyId = typeof body.surveyId === "string" ? body.surveyId.trim() : "";
    const orgId =
      typeof body.orgId === "string" && body.orgId && body.orgId !== "all"
        ? body.orgId
        : null;
    const confirmation =
      typeof body.confirmation === "string" ? body.confirmation.trim() : "";

    if (confirmation !== CONFIRMATION) {
      return NextResponse.json(
        { error: `Type "${CONFIRMATION}" to confirm.` },
        { status: 400 }
      );
    }
    if (!userId || userId === "anonymous") {
      return NextResponse.json({ error: "A respondent is required." }, { status: 400 });
    }
    if (!surveyId) {
      return NextResponse.json({ error: "A survey is required." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("survey_questions")
      .select("id")
      .eq("survey_id", surveyId);

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    const questionIds = (questions || []).map((q) => q.id).filter(Boolean);
    if (questionIds.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    let deleted = 0;
    for (let i = 0; i < questionIds.length; i += QUESTION_CHUNK) {
      const chunk = questionIds.slice(i, i + QUESTION_CHUNK);
      let query = supabaseAdmin
        .from("responses")
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .in("question_id", chunk);

      if (orgId) {
        query = query.eq("org_id", orgId);
      }

      const { error, count } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted += count ?? 0;
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Error deleting respondent answers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
