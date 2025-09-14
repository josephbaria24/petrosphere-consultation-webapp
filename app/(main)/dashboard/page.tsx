import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import Dashboard from "../../../components/dashboard"
import { supabase } from "../../../lib/supabaseClient"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_id")?.value

  console.log("Dashboard - Token from cookies:", token) // Debug log

  if (!token) {
    console.log("Dashboard - No token found, redirecting to login") // Debug log
    redirect("/admin-login")
  }

  // Verify the token is a valid admin ID in the database
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", token)
    .single()

  console.log("Dashboard - Database verification:", { data, error }) // Debug log

  if (!data || error) {
    console.log("Dashboard - Invalid token, redirecting to login") // Debug log
    redirect("/admin-login")
  }

  return <Dashboard />
}