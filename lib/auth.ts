import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { supabase } from "./supabaseClient";

export interface AuthUser {
    id: string;
    email: string;
    fullName?: string;
    isAdmin: boolean;
}

/**
 * Checks authentication for both admin users (cookie-based) and demo users (Supabase auth)
 * Redirects to /admin-login if not authenticated
 * Returns user info if authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_id")?.value;

    // Check for admin cookie first (existing admin flow)
    if (adminToken) {
        const { data, error } = await supabase
            .from("admin_users")
            .select("id, email, full_name")
            .eq("id", adminToken)
            .single();

        if (data && !error) {
            return {
                id: data.id,
                email: data.email,
                fullName: data.full_name || undefined,
                isAdmin: true,
            };
        }
    }

    // Check for Supabase auth session (demo user flow)
    const supabaseClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabaseClient.auth.getUser();

    if (user && !error) {
        return {
            id: user.id,
            email: user.email!,
            isAdmin: false,
        };
    }

    // No valid auth found
    redirect("/admin-login");
}
