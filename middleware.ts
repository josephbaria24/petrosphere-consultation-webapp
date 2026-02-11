import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            maxAge: 60 * 60 * 24, // 1 day expiration
                        })
                    );
                },
            },
        }
    );

    // This will refresh the session if it's expired
    const { data: { user } } = await supabase.auth.getUser();

    // Existing Admin Logic
    const adminId = request.cookies.get("admin_id")?.value;
    const url = request.nextUrl.clone();

    // Protect dashboard and other admin pages if no auth found (neither Supabase user nor Admin cookie)
    if (url.pathname.startsWith("/dashboard") && !user && !adminId) {
        url.pathname = "/admin-login";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
