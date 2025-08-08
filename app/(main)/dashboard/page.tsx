import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import Dashboard from "../../../components/dashboard"
import { supabase } from "../../../lib/supabaseClient"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_id")?.value

  if (!token) {
    redirect("/admin-login")
  }

  // Verify the token is a valid admin ID in the database
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", token)
    .single()

  if (!data) {
    redirect("/admin-login")
  }

  return <Dashboard />
}
