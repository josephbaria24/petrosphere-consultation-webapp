// app/(main)/admin/view-survey/page.tsx (server component)
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { supabase } from "../../../../lib/supabaseClient"
import ViewSurveysClient from "./ViewSurveysClient"

export default async function ViewSurveysPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_id")?.value

  if (!token) {
    redirect("/admin-login")
  }

  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", token)
    .single()

  if (!data) {
    redirect("/admin-login")
  }

  // ✅ Authenticated → render the client component
  return <ViewSurveysClient />
}
