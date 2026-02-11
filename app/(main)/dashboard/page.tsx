//app\(main)\dashboard\page.tsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import Dashboard from "../../../components/dashboard";
import { supabase } from "../../../lib/supabaseClient";

import { createClient } from "../../../lib/supabase/server";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_id")?.value;

  // Check for admin cookie first (existing admin flow)
  if (adminToken) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", adminToken)
      .single();

    if (data && !error) {
      // Valid admin user
      return <Dashboard />;
    }
  }

  // Check for Supabase auth session (new demo user flow)
  const supabaseClient = await createClient();

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    // Valid Supabase session (demo user)
    return <Dashboard />;
  }

  // No valid auth found
  redirect("/admin-login");
}