import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

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

export async function getVerifiedAdminFromCookie(): Promise<VerifiedAdmin | null> {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_id")?.value;
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
