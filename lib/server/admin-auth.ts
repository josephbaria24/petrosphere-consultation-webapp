import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type VerifiedAdmin = {
  id: string;
  email: string;
  full_name: string | null;
};

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function readAdminIdFromCookieHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  const match = header.match(/(?:^|;\s*)admin_id=([^;]+)/);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

/**
 * Resolve platform admin from admin_id cookie (and request fallbacks).
 * Accepts an optional NextRequest so Route Handlers can read cookies from the
 * incoming request when next/headers cookies() is empty.
 */
export async function getVerifiedAdminFromCookie(
  request?: NextRequest | Request | null
): Promise<VerifiedAdmin | null> {
  let adminId: string | undefined;

  try {
    const cookieStore = await cookies();
    adminId = cookieStore.get("admin_id")?.value;
  } catch {
    // cookies() can throw outside a request context
  }

  if (!adminId && request) {
    if ("cookies" in request && typeof (request as NextRequest).cookies?.get === "function") {
      adminId = (request as NextRequest).cookies.get("admin_id")?.value;
    }
    if (!adminId) {
      adminId = readAdminIdFromCookieHeader(request.headers.get("cookie"));
    }
    // Non-httpOnly admin_id is already used client-side; allow header fallback.
    const headerId = request.headers.get("x-admin-id")?.trim();
    if (!adminId && headerId) adminId = headerId;
  }

  if (!adminId) return null;

  const supabaseAdmin = createServiceRoleClient();
  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, full_name")
    .eq("id", adminId)
    .single();

  if (error || !admin) return null;
  return admin;
}
