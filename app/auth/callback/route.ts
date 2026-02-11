import { createClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabase = await createClient();

        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                console.error("Error exchanging code for session:", error);
                return NextResponse.redirect(`${requestUrl.origin}/demo?error=auth_error`);
            }
        } catch (error) {
            console.error("Error in auth callback:", error);
            return NextResponse.redirect(`${requestUrl.origin}/demo?error=auth_error`);
        }
    }

    // Redirect to dashboard after successful auth
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
